# BUG-008 — Authentication and authorization failures answer plain text, not JSON

**Status:** Open, not fixed
**Severity:** Medium — breaks error handling for the single most common failure in the API
**Found by:** Backend API tests (error contract), while closing out the stage 1 backlog
**Pinned by:** `backend/tests/api/error-contract.api.test.js` → `🐛 BUG-008: authentication failures answer plain text`

---

## What happens

Every error in this API is JSON shaped like `{ err: "..." }`, and validation
failures add `details: [{ field, message }]`. The frontend's `http.service`
and every form in the app are built on that.

`requireAuth` is the exception:

```
GET /api/cart        (no session)
→ 401  Content-Type: text/html
       Not Authenticated
```

```
GET /api/user        (signed in, not an admin)
→ 403  (empty body)
```

So the two most common failures in the whole API — an expired session and a
permission refusal — are the two the client cannot parse.

## Cause

`backend/middlewares/requireAuth.middleware.js`:

```js
if (!loggedinUser) return res.status(401).send('Not Authenticated')   // line 13
if (!loggedinUser) return res.status(401).send('Not Authenticated')   // line 20
    res.status(403).end('Not Authorized')                             // line 23
```

`res.send(aString)` sets `Content-Type: text/html`. `res.end(aString)` sends
the bytes with no content type negotiated at all.

This middleware predates `errorHandler` and `notFoundHandler`, both of which do
send JSON correctly. Nothing was broken here — it was simply never brought
forward when the rest of the error handling was standardised.

## Why it matters

The client does:

```js
const res = await axios(...)   // or fetch + res.json()
```

and on failure gets:

```
SyntaxError: Unexpected token 'N', "Not Authenticated" is not valid JSON
```

Three consequences:

1. **The real cause is hidden.** A developer debugging "why did my request
   fail" sees a JSON parse error naming the letter N, not "your session
   expired". This is a genuinely confusing few minutes the first time.
2. **The UI cannot explain itself.** Error rendering reads `err.response.data.err`.
   That is `undefined` here, so the user gets a blank or generic message for
   the one failure that has a clear, actionable explanation: sign in again.
3. **403 is worse than 401.** `end()` sends an empty body, so a signed-in user
   who lacks permission gets a refusal indistinguishable from a network
   failure. "You don't have access" and "the server is down" should not look
   the same.

Expired sessions are not an edge case — they are the single most frequent
error a working application produces.

## Fix

Two lines, matching the shape every other error already uses:

```js
if (!loggedinUser) return res.status(401).json({ err: 'Not authenticated' })
...
if (!loggedinUser.isAdmin) return res.status(403).json({ err: 'Not authorized' })
```

Note `return` on the 403 as well — the current code calls `res.status(403).end()`
without returning, which is a separate latent problem: execution continues into
`next()` on some paths.

**Check before shipping:** the frontend currently detects a lost session by
status code, not body (`if (err.response && err.response.status === 401)` in
`http.service.js`), so changing the body is safe for that path. Any other place
that reads `err.response.data` as a string would need updating — the pinned
tests will not catch a frontend assumption.

## Related, deliberately out of scope

This was one item on a longer "stage 1" security list that was never started.
The others are backend-development work rather than test work, and are recorded
here so they are not lost:

- **Fail fast on a missing `SECRET`.** The app currently falls back to a
  hardcoded default rather than refusing to boot.
- **Token `iat` / `exp`.** Login tokens do not expire, so a stolen cookie is
  valid forever.
- **`tokenVersion`.** There is no way to invalidate existing sessions — logging
  out everywhere, or revoking access after a password change, is impossible.

The token issues are the more serious of the three. None are covered by tests
yet, because a test for "the token expires" needs the expiry to exist first.

## Not fixed

Per the project's bug policy: reproduce it, pin it, write it down, do not fix.

The pinned tests assert the *current* plain-text behaviour across five
protected routes, so they go red the moment this is fixed — which is the
intended signal. They should then be rewritten to assert `{ err }` JSON rather
than deleted; the route table is the valuable part.
