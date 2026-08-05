# BUG-009 — Signup discards the server's validation message and advises a retry that cannot work

**Status:** FIXED
**Severity:** Medium — every failed signup, on the app's first conversion step
**Found by:** Using the app. A real signup attempt with a short password, spotted in the browser console
**Fixed in:** `frontend-react/src/pages/Signup.jsx` — rules mirrored client-side, and the server's response actually read
**Regression tests:** `frontend-react/tests/unit/signup-form.test.jsx` → `the client-side guards` (8 tests) and `BUG-009: what the server says reaches the shopper` (5 tests)

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

## Resolution

All three of the decisions above were taken, and one was reversed on evidence.

**The rules are mirrored client-side.** `FIELD_RULES` in `Signup.jsx` lists
every rule `auth.schema.js` has — 2 / 3 / 8 and the matching upper bounds —
with presence first in each list, so an empty field is told it is empty rather
than told it is too short. Password length is checked untrimmed, matching the
schema: a space is a character in a password, and trimming would reject one the
server would have accepted.

The numbers are duplicated on purpose and both sides are pinned to the same
figures, the way the free-delivery threshold already is. The boundary is tested
from the passing side too (`accepts exactly 2 / 3 / 8 characters`) — a `>`
where `>=` was meant would satisfy every failure test and reject a password the
server accepts, which is the most annoying possible outcome because the shopper
is told a rule they are obeying.

**The response is read.** `catch (err)` now has a binding, and `_serverProblems`
handles the three shapes that arrive:

| response | shown |
|---|---|
| `{ err, details: [...] }` | one line per detail |
| `{ err: 'Username already taken' }` | Hebrew — the one failure with no `details` and a clear action |
| anything else (500, dropped connection) | the generic retry text, which is accurate here |

**All of them, not `details[0]`.** `problems` is an array and the alert renders
one `<p>` per entry, so a response naming two fields does not send the shopper
round the loop twice.

### The decision that changed

The plan was to map `field` → a Hebrew message on the client and use the
server's text only as a fallback. That mapping was written and then removed,
because it turned out to be unreachable code: it can only fire when a client
rule fails for the value the server rejected — and if a client rule fails, the
request was never sent. Mirroring the rules is what makes the wording Hebrew;
a translation layer on top of it had nothing left to translate.

So `detail.message` is shown verbatim. That is English, and it is rare by
construction — the client mirrors every rule the schema currently has, so a
detail reaching the screen means the schema gained a rule this form has not
caught up with. English and precise beats Hebrew and wrong, and it is a visible
signal that the two have drifted.

### Against the field, sort of

`aria-invalid` is set on each field named in a problem, which is what the
existing `input[aria-invalid='true']` border style and a screen reader both
read. The messages themselves stay in the single `.auth-error` block above the
button, matching `Login.jsx` — splitting them into per-field slots would have
meant a new layout for one of the two auth forms and not the other.

Editing a field clears **that field's** complaint only. `Login.jsx` clears
everything on the first keystroke, which is right when there is only ever one
message and wrong here: it would hide problems the shopper has not dealt with.

The one styling change is three lines in `LoginSignup.scss` — `.auth-error p
{ margin: 0 }` and a `+ p` gap, because signup renders a `<div>` of paragraphs
where login renders one `<p>`. Login's rendering is untouched and unaffected.

## Confirmed and closed elsewhere

The `http.service.js` hypothesis at the top of the "Related" section above was
**confirmed** and is already fixed — `auth/login` and `auth/me` are exempt from
the 401 redirect. See the comment block in `http.service.js`.

## Still open, deliberately

`Login.jsx` has the same bare `catch`. Its schema has no per-field rules to
lose, but a wrong password (401 `Invalid username or password`) still renders
"ההתחברות נכשלה. נסו שוב בעוד רגע" — transient advice for a deterministic
failure, which is this same bug in miniature. Not fixed here because it is a
different form with a different failure set, and it deserves its own report
rather than being folded into this one.
