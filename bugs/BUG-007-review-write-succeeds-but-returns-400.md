# BUG-007 — Posting or deleting a review returns 400 after the write has already succeeded

**Status:** FIXED
**Severity:** Medium — latent. Masked in production today; when it fires, retrying duplicates the write
**Found by:** Backend API tests, while adding coverage for the review routes
**Fixed in:** `backend/api/review/review.controller.js` (the boundary) and `backend/services/socket.service.js` (the class of failure)
**Regression tests:** `backend/tests/api/review.api.test.js` → `answers 200 when only the broadcast fails, because the write succeeded`, plus `backend/tests/unit/socket-service.test.js`

---

## What happens

```
POST /api/review   { aboutUserId, txt: "Great service" }
→ 400 { "err": "Failed to add review" }
```

And yet:

- the review **is** in the database
- the author's score **has** been incremented by 10
- a refreshed `loginToken` cookie **has** been issued

Everything the endpoint is supposed to do, it did. Then it reported failure.

`DELETE /api/review/:id` behaves the same way: the review is removed, and the
response is 400.

## Cause

`backend/api/review/review.controller.js` finishes the write and then
broadcasts a socket event, inside the same `try`:

```js
review = await reviewService.add(review)      // ← done
loggedinUser.score += 10
await userService.update(loggedinUser)        // ← done
res.cookie('loginToken', loginToken)          // ← done

socketService.broadcast({ ... })              // ← throws
...
} catch (err) {
  logger.error('Failed to add review', err)
  res.status(400).send({ err: 'Failed to add review' })   // ← reports failure
}
```

The broadcast throws when no socket server is attached:

```
TypeError: Cannot read properties of null (reading 'fetchSockets')
```

`gIo` is null because `setupSocketAPI(server)` is called in `server.js`, not in
`createApp()`. So the socket layer is absent in any process that builds the app
without starting the full server — and the catch cannot tell the difference
between "the database write failed" and "the notification failed".

## Why it matters

**The retry is the damage.** The client shows "failed, please try again", the
customer tries again, and now there are two identical reviews and +20 score.
Every retry compounds it. The failure is not just misleading — it actively
encourages the action that makes it worse.

**How often does it fire?** This is worth stating precisely, because the first
draft of this report overstated it.

In normal production it does **not** fire. `server.js` calls
`setupSocketAPI(server)`, so `gIo` is set, the broadcast succeeds, and the
endpoint returns 200. The 400 was discovered in tests because `createApp()`
does not initialise sockets — an environment difference, not a live outage.

So this is a **latent** fault, and the defect is the design rather than the
symptom: a notification failure is indistinguishable from a write failure. It
becomes visible whenever the broadcast throws for any reason — socket.io
throwing internally, a client disconnecting mid-emit, a deployment that serves
the API without the socket layer, or any future caller of `createApp()`.

It also **hides real errors**. Because the same catch produces the same 400 for
everything, a genuine validation or database failure is indistinguishable from
a socket hiccup, in the logs and in the response.

## Fix

A notification is not part of the write. Move it outside the transaction
boundary and do not let it change the response:

```js
review = await reviewService.add(review)
// ... score, cookie, response shape ...

res.send(review)      // respond FIRST — the work is done

// Best-effort. A failed broadcast must never fail the request.
try {
  socketService.broadcast({ ... })
  socketService.emitToUser({ ... })
} catch (err) {
  logger.error('review saved, but broadcast failed', err)
}
```

Two things worth doing alongside, both separate decisions:

- **`socketService` should no-op when `gIo` is null** rather than throwing.
  A guard there fixes this class of failure for every caller at once, not just
  this route.
- **`201 Created`, not `200`.** `checkout` already returns 201 for creating a
  resource, so the API currently contradicts itself.

## How this was found

Not by reading the code. The new API tests asserted the obvious thing — that
posting a review returns 200 — and got 400. The natural next assumption was a
validation failure or bad test data.

Calling `reviewService.add()` directly in a throwaway probe is what separated
the layers:

```
SERVICE.add OK  -> {"byUserId":"...","aboutUserId":"...","txt":"hi","_id":"..."}
ROUTE           -> 400 {"err":"Failed to add review"}
```

The service works. The route does not. That narrowed it to the controller, and
the unhandled `fetchSockets` error named the line.

Worth recording as a method: **when a request fails, call the layer underneath
it directly.** If that works, the bug is between them — and you have halved the
search space with one command.

### A second lesson, from getting the test wrong first

The original tests relied on the crash actually happening — they ran against a
missing socket layer and asserted the resulting 400. That had two problems:

1. It leaked ~20 unhandled promise rejections (the broadcast is called without
   `await`), so Vitest exited **1** while every test passed. A suite that fails
   for reasons unrelated to the code under test is worse than no suite.
2. It documented the symptom in one specific broken environment rather than the
   actual defect.

The tests now mock `socketService` and make the broadcast throw **on purpose**
for the one test that demonstrates this. Deterministic, no leaked rejections,
and a much better description of the real failure mode — which is "the
broadcast failed", not "sockets were never set up".

## A correction filed alongside this

The first draft of the review tests also claimed two other defects — that any
user could delete any review, and that the request body was stored unvalidated.
Both were **wrong**, and the tests caught it.

Both defences exist in `review.service.js` rather than in the controller:
`remove()` adds `byUserId` to the delete criteria for non-admins, and `add()`
builds an explicit `{ byUserId, aboutUserId, txt }` allowlist. Reading only the
controller made the route look far more exposed than it is.

Those two now have positive tests instead. The lesson is the same one this bug
teaches from the other direction: conclusions drawn from one layer are
provisional until something runs.

## Resolution

Fixed in two places, because the defect had two sizes.

**The boundary, in `review.controller.js`.** Both handlers now respond first
and treat everything after the response as delivery:

```js
res.send(review)
} catch (err) { ... return res.status(400)... }

await notify('review-added', async () => {
  await socketService.broadcast({ ... })
  ...
})
```

`notify()` is a two-line helper shared by both handlers — it awaits the work
and logs a failure. Awaiting matters: `broadcast` and `emitToUser` are async,
and an unawaited rejection escapes the surrounding try/catch entirely and
becomes an unhandled rejection, which is the failure mode that made the
original test suite exit 1 while every test passed.

`deleteReview` got the same treatment, and both catch blocks gained a `return`
so the notification cannot run after a failed write.

**The class of failure, in `socket.service.js`.** `emitTo`, `emitToUser` and
`broadcast` now check `gIo` and no-op with a log line naming the skipped event.
A missing socket layer is not an error condition — nobody is connected, so
there is nobody to notify. The guard runs before `userId.toString()`, or a
caller passing a null userId would simply trade one TypeError for another.

This half is the more valuable one: it fixes every current and future caller,
not just the two routes that were noticed. `backend/tests/unit/socket-service.test.js`
covers all five emit paths, because a guard added to two of three functions
looks fixed and fails on the third.

### Tests

The pinned test was rewritten rather than deleted, as planned — the induced
failure is the valuable part, since a broadcast can still fail for reasons
nobody controls and the contract is that the response does not change when it
does. Two rows were added beside it:

- the same boundary on `DELETE`, so fixing one handler is not assumed to fix
  the other;
- **`still answers 400 when the write itself fails`** — the assertion that
  keeps the fix honest. A handler that answered 200 unconditionally would pass
  everything else in the file and be worse than the bug it replaced.

### Not done, and still worth deciding

**`201 Created` instead of `200`.** Left alone deliberately: the existing tests
and the frontend both expect 200, and changing a status code is a separate,
API-visible decision that does not belong in a bug fix. `checkout` still
returns 201 for the same kind of operation, so the API still contradicts
itself — the same note is open on BUG-004.

The ⚠️ items in the test file — score farming, self-review — are untouched.
They are not this defect, and they are recorded there as the specification for
hardening this route group.
