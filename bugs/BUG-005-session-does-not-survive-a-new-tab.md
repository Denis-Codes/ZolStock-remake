# BUG-005 — Opening a link in a new tab signs the shopper out (and empties their cart)

**Status:** FIXED
**Severity:** High (was) — user-facing, silent, and hits a completely ordinary action
**Found by:** Full-stack Playwright E2E, stage 6
**Fixed in:** `GET /api/auth/me` + `restoreSession()`, awaited at app start — the server, not `sessionStorage`, now answers "who is this?"
**Regression test:** `frontend-react/tests/fullstack/session-and-cart.spec.js` → `keeps the shopper signed in when a link opens in a new tab`

> The report below is kept as written. The fix is recorded at the end.

---

## What happens

1. Sign in.
2. Add something to the cart.
3. Middle-click or ctrl+click any link — or open the site from WhatsApp, email, a bookmark, anything that lands in a new tab.
4. In the new tab you appear signed out, and **the cart is empty.**
5. Go back to the original tab. You are signed in again and the cart is back.

Nothing errors. Nothing is logged. The shopper simply watches their cart
disappear and reappear.

## Cause

Two different systems answer "who is this?", and they disagree.

**The server** uses an httpOnly cookie. Cookies belong to the browser profile,
so every tab sends it. The server session is completely fine in the new tab —
`GET /api/cart` there returns the full cart with a 200.

**The client** keeps its own copy, in `src/services/user/user.service.remote.js`:

```js
function getLoggedinUser() {
  return JSON.parse(sessionStorage.getItem(STORAGE_KEY_LOGGEDIN_USER))
}
```

`sessionStorage` is scoped **per tab**. A new tab starts with an empty one, so
the app decides it is dealing with a guest.

The cart is where that becomes visible, because `cart.actions.js` branches on
exactly that value:

```js
function isLoggedIn() {
  return !!userService.getLoggedinUser()
}
// ...
if (!isLoggedIn()) {
  return dispatch({ type: SET_CART, cart: readGuestCart() })  // localStorage
}
```

So the new tab reads the empty guest cart from localStorage while the real
cart sits on the server, one request away.

## Why it matters

- The trigger is not an edge case. Ctrl+click is how a lot of people browse a
  shop — open three products in tabs, compare, pick one.
- The failure is silent. There is no error state to report, so it will arrive
  as "the site keeps logging me out" or "my cart disappeared", which is
  extremely hard to reproduce from a description.
- It looks like data loss to the shopper even though nothing was actually
  lost, which is arguably worse: they re-add items and may end up ordering
  twice.
- It undermines the feature the server-side cart exists for. The whole point
  of storing a cart per user is that it follows them; here it does not even
  follow them across two tabs of one browser.

## Fix

Stop treating client-side storage as the source of truth for identity. The
cookie already is one — the client should ask.

The smallest correct change: on app start, resolve the current user from the
server rather than from `sessionStorage`. There is already a place to do it —
`loadCart()` runs at startup and its response can only be produced by an
authenticated session.

A cleaner version adds a `GET /api/auth/me` that returns the logged-in user or
401, and the client uses `sessionStorage` purely as a cache to avoid a flash of
signed-out UI on first paint — never as the answer.

Worth noting alongside: `sessionStorage` also means a **normal** new window,
or restoring a session after a browser restart, has the same problem.
`localStorage` would fix the tab case and not the underlying design; deriving
state from the server fixes both.

## How this was found

Not by clicking around. The full-stack E2E test asserted that a server-backed
cart survives having `localStorage` wiped — and the first version of it also
cleared `sessionStorage`, which made it fail for a reason that had nothing to
do with where the cart is stored.

Chasing *why* clearing sessionStorage emptied a server-side cart is what
surfaced the design mismatch, and the per-tab consequence followed from it.

That is worth recording as a method: **a test failing for the wrong reason is
often pointing at something real.** The instinct is to adjust the test until it
goes green. The useful move is to first understand exactly why it went red.

Neither the unit suite nor the API suite can see this bug. The unit tests mock
storage; the API tests have no browser and therefore no concept of a tab. It
needs a real browser, a real session, and two real tabs.

## Resolution

The "cleaner version" above is what landed. The client no longer keeps its own
answer to "who is signed in?" — it asks the thing that actually knows.

**Server** — `GET /api/auth/me`, behind `requireAuth`, returns `req.loggedinUser`.
A guest gets a 401, because "not signed in" is a status rather than a payload.
It is deliberately *not* behind `authLimiter`: the client calls it on every app
start, it reads a cookie rather than guessing a credential, and there is nothing
there to brute-force.

**Client** — `fetchLoggedinUser()` calls it and caches the result;
`getLoggedinUser()` still reads that cache synchronously so the first paint does
not flash signed-out UI. The cache is no longer the answer, only a head start.
`user.service.local.js` gets the same method — with no server there is no cookie
to consult, so the stored value genuinely *is* the source of truth on the GitHub
Pages build, and callers do not have to know which service they hold.

**Ordering** — `restoreSession()` is `await`ed in `RootCmp` *before*
`loadCart()` and `loadWishlist()`. Both branch on `isLoggedIn()`, so firing
them in parallel reintroduced the exact bug in a new costume: the loads won the
race, read "guest", and pulled the empty localStorage cart.

One thing this turned up that the report did not predict: the `http.service`
interceptor force-signs-out and redirects on *any* 401, which made a guest hitting
the new endpoint bounce off whatever page they had opened. `auth/me` and
`auth/login` are now exempt — for both, a 401 is an answer, not an expired
session. (`auth/login` was a real pre-existing bug of its own: a wrong password
rendered "incorrect username or password" onto a page that was already
unloading, dropping the shopper on the homepage with no explanation.)

As predicted in the report, this also fixes a new window and a browser restart,
which a `localStorage` swap would have papered over without addressing the
design.

The pinned test carried `test.fail()` while this was open. After the fix
Playwright reported:

```
Expected to fail, but passed.
```

The marker is removed and the test now guards the fix. It still deliberately
does not clear `sessionStorage`: a new tab starting with an empty one is
precisely the condition under test.
