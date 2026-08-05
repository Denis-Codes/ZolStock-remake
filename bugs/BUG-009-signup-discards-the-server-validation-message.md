# BUG-009 — Signup discards the server's validation message and advises a retry that cannot work

**Status:** Open, not fixed
**Severity:** Medium — every failed signup, on the app's first conversion step
**Found by:** Using the app. A real signup attempt with a short password, spotted in the browser console
**Pinned by:** `frontend-react/tests/unit/signup-form.test.jsx` → `🐛 BUG-009: the server explains the problem and the form discards it`

---

## What happens

Signing up with a password under 8 characters:

```
POST http://localhost:3030/api/auth/signup  →  400
{"err":"Validation failed",
 "details":[{"field":"password","message":"Password must be at least 8 characters"}]}
```

On screen:

> ההרשמה נכשלה. נסו שוב בעוד רגע.
> *(Registration failed. Try again in a moment.)*

The server named the field and stated the rule. The form showed neither, and
told the user to wait and retry — which will fail identically, forever.

The same sentence appears for a username under 3 characters, a full name under
2, and a malformed image URL. Four different causes, one message.

## Cause

`frontend-react/src/pages/Signup.jsx`:

```jsx
try {
    await signup(credentials)
    clearState()
    navigate(redirectTo)
} catch {
    setError('ההרשמה נכשלה. נסו שוב בעוד רגע.')
}
```

A bare `catch` with no binding. There is no `err` in scope, so this cannot read
`details` even in principle — the information is not lost in transit, it
arrives intact and is stepped over.

Nothing upstream is at fault. `user.actions.js` rethrows the axios error
unchanged, `http.service.js` rethrows it unchanged, and the backend's
`validate` middleware builds `details` correctly (pinned by
`backend/tests/unit/validate.middleware.test.js`). Every layer does its job
until the last one.

There is a second half. The form validates that fields are **present**:

```jsx
if (!credentials.fullname?.trim()) return setError('יש להזין שם מלא')
if (!credentials.username?.trim()) return setError('יש להזין שם משתמש')
if (!credentials.password) return setError('יש להזין סיסמה')
```

…but no **rule** — no length check, no `minLength` on the input, and
`noValidate` on the `<form>` so the browser will not step in either. A password
the page could have rejected as it was typed instead costs a round trip.

## Why it matters

**The advice is the damage.** "נסו שוב בעוד רגע" — try again in a moment —
describes a *transient* fault. This one is deterministic. The form is telling
the shopper to do the one thing guaranteed not to work, and giving them nothing
to work out what would. The likely outcome is not a retry; it is leaving.

Same shape as BUG-007, from the other direction: there, a successful write
reports failure and the retry duplicates it. Here, a permanent failure is
described as temporary. Both mislead about *what to do next*, which is the part
of an error message that actually matters.

**The cause is unknowable from the UI.** Four rules collapse into one sentence.
The shopper cannot tell which field to change, and neither can anyone reading a
screenshot in a support ticket.

**It is the first step in the funnel.** Signup is where an anonymous visitor
becomes a customer. An unexplained failure here is the most expensive place in
the app to have one.

**The project's own guardrail names this exact case.** `CLAUDE.md`:
*"non-apologetic in errors ('Password must be 8+ characters,' not 'Oops,
something went wrong!')"* — the rule was written down and this form predates it.

## Fix

Read what arrived, and keep the fallback for when nothing did:

```jsx
} catch (err) {
    const details = err?.response?.data?.details
    setError(details?.length
        ? details[0].message
        : 'ההרשמה נכשלה. נסו שוב בעוד רגע.')
}
```

Three things worth deciding alongside, each a separate call:

- **The server's messages are in English**, and the whole UI is Hebrew. Showing
  `details[0].message` verbatim fixes the information problem and creates a
  language one. The real fix maps `field` → a Hebrew message on the client, and
  uses the server's text only as a last resort. That makes the client the owner
  of wording and the server the owner of rules, which is the right split.
- **Show it against the field, not above the form.** `details` carries `field`
  precisely so the message can sit next to the input it is about. Rendering
  only `[0]` also drops the second and third failures when a user gets several
  wrong at once.
- **Mirror the length rules client-side**, so the feedback arrives before the
  request. If this is done, pin the numbers to the same 8/3/2 the server uses —
  a duplicated rule that drifts is worse than no duplicate. The cart's free
  delivery threshold is already handled this way, with both halves tested
  against identical figures.

`Login.jsx` has the same bare `catch`, but the login schema only requires both
fields to be non-empty, so it has no per-field rules to lose. Its failure path
is a different problem — see below.

## Related, and NOT yet verified

While tracing this, one thing in `http.service.js` looked wrong and is recorded
here as a **hypothesis, not a finding**:

```js
if (err.response && err.response.status === 401) {
    sessionStorage.clear()
    window.location.assign('/')
}
```

A failed login returns 401 (`auth.controller.js` throws
`UnauthorizedError('Invalid username or password')`). If that interceptor fires
on the login form, a wrong password navigates the user to the homepage instead
of showing "wrong username or password" — `Login.jsx`'s `setError` would run on
a page that is already unloading.

This has **not** been reproduced. It is written down because an unverified
hypothesis is worth more in a file than in nobody's head, and because the last
two times a defect was claimed from reading a single layer, the tests proved
the claim wrong. Reproducing it needs a real browser — jsdom does not implement
navigation — so it belongs in the Playwright full-stack suite, not the unit
suite.

## How this was found

Not by a test, and not by reading the code. By signing up with a short password
and looking at the console.

Worth recording, because it is the counterweight to everything else in this
repo: 655 automated tests did not catch this, and could not have. Every one of
them asserts something someone thought to assert. Nobody had written down "the
message the server sent must reach the user", because until you watch the form
fail it does not occur to you that it wouldn't.

The tests earn their place immediately afterwards — the bug is now pinned, and
the fix has a red/green signal. But exploratory use found it first. A suite is
a ratchet that stops known behaviour regressing; it is not a substitute for
someone using the thing.

## Not fixed

Per the project's bug policy: reproduce it, pin it with a test, write it down,
do not fix.

The pinned tests assert today's behaviour and are named for the bug. Applying
the fix above turns exactly three of them red — verified by applying it,
running the suite, and reverting:

```
✓ no full name / no username / no password — still green (presence guards untouched)
× shows generic retry text instead of the rule the server stated
× is the same message for a short username, so the cause is unknowable
× advises a retry that reproduces the failure exactly
✓ sends a password it could have rejected without asking   ← still red-flagging the second half
✓ a 500 has no details to show, so the retry advice is accurate   ← fallback survived
```

That split is the useful part. The message tests flip, the *client-side rule*
test stays green because that half is genuinely still unfixed, and the 500 test
confirms the fallback was not thrown out with the bathwater. When the fix
lands, those three should be rewritten to assert the field message rather than
deleted.
