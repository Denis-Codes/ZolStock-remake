# Testing ZolStock

**655 automated tests across five suites, gating every deploy.**

This page explains what runs, when, and — more usefully — *why there are five
suites instead of one*. Each layer answers a question the others cannot.

---

## The suites

| Suite | Tests | Runner | What it proves | Command |
|---|---|---|---|---|
| Backend unit | 263 | Vitest | Pricing rules, schemas, query building — no I/O at all | `cd backend && npm test` |
| Backend API | 158 | Vitest + supertest | What happens to the **data** when a stranger sends a request | `cd backend && npm test` |
| Test harness | 15 | Vitest | The fixtures and helpers everything else stands on | `cd backend && npm test` |
| Frontend unit | 145 | Vitest + Testing Library | Components render and behave correctly in jsdom | `cd frontend-react && npm test` |
| API over HTTP | 13 | Playwright `request` | Real server, real port, real cookie jar, real headers | `cd frontend-react && npm run test:api` |
| Browser (local mode) | 54 | Playwright | The storefront as deployed to GitHub Pages | `cd frontend-react && npm run test:e2e` |
| Full stack | 7 | Playwright | The real built bundle + real server + real database | `cd frontend-react && npm run test:fullstack` |

Backend unit and API run together (`436` in 26s). Frontend unit runs in 11s.

---

## Why five suites

The rule the whole thing is built on: **push every assertion to the cheapest
layer that can hold it.**

The 436 backend tests run in 26 seconds. Testing the same rules through a
browser would take 40+ minutes, break whenever a designer moves a button, and
report `expected element not found` — which tells you nothing about *which* of
four layers broke.

But the cheap layers cannot see everything, and the gaps between them are
real. Two bugs in this repo were found precisely there:

- **BUG-004** — `POST /api/product` returned no `_id`. The Vitest API test for
  that endpoint *passed*, because it asserted the product was saved by reading
  the database directly. The Playwright API test had no database access, so it
  was forced to trust the response — and noticed the response was wrong.
- **BUG-005** — opening a link in a new tab empties the cart. Unit tests mock
  storage; API tests have no concept of a tab. It takes a real browser and two
  real tabs.

So each layer earns its place by catching something the layer below structurally
cannot.

### And the layer none of them replace

**BUG-009** was found by signing up with a short password and reading the
console. The server returned a precise per-field message; the form discarded it
and advised a retry that could never succeed. Every suite here was green.

They could not have caught it. A test asserts something someone thought to
assert, and nobody had written down *"the message the server sent must reach
the user"* — until watching the form fail made it obvious. The tests earn their
place the minute afterwards, pinning it with a red/green signal for the fix.
But a suite is a ratchet that stops known behaviour regressing. It is not a
substitute for someone using the thing.

---

## The tests worth reading first

**`backend/tests/api/order.api.test.js` → `two shoppers, one last unit`**

One unit in stock, two shoppers checking out simultaneously via `Promise.all`.
Exactly one 201, one 409, stock lands at 0.

A green test proves nothing until it has been seen failing, so both algorithms
were run against the same in-memory MongoDB:

```
NAIVE  -> results: [ true, true  ]  final stockQty: -1   ← sold one item twice
ATOMIC -> results: [ true, false ]  final stockQty:  0
```

That `-1` is the bug in its natural habitat. Read-then-write: both requests
read `stockQty: 1`, both pass the check, both decrement. The fix puts the check
*inside* the update's filter, so check-and-write become one indivisible
operation MongoDB guarantees:

```js
updateOne({ _id, stockQty: { $gte: qty } }, { $inc: { stockQty: -qty } })
```

The test asserts **exactly one succeeded**, not *which* one. Who wins is a
race; asserting it would make the test flaky.

**`backend/tests/api/auth.api.test.js`** — the attacks, all real requests:
mass assignment (`isAdmin: true` on signup), NoSQL injection (`{$ne: null}` as
a username), user enumeration (wrong-password and unknown-user must return
byte-identical 401s).

**`backend/tests/api/error-contract.api.test.js`** — one rule checked across
the whole API rather than one route group. Some rules belong to no single
endpoint.

---

## Patterns used throughout

**The authorization matrix.** Same request, three callers: signed out → 401,
normal user → 403, admin → 200. All three rows are required — an endpoint that
is completely broken refuses everybody and passes both negatives.

**401 vs 403.** "I don't know who you are" vs "I know exactly who you are, and
no."

**Assert on state, not just the status code.** Every refusal also checks
`countDocuments === 0` or reads the row back. A 403 that performed the write
anyway is real, and the status alone would never show it. `review.api.test.js`
is the extreme case: every response there is a 400 while three things actually
happened.

**Boundary value analysis.** The free-delivery rule is `subtotal >= 300`.
Writing `>` breaks exactly one value in the entire range, so the tests are
299/300/301 and nothing in between. Same three numbers on the server and the
client, deliberately — the rule is duplicated, so both halves are pinned to
identical figures.

**Expected values worked out by hand.** `299 + 29 = 328` was arithmetic, not
copied from test output. A value pasted from what the code printed agrees with
the code by construction and can never disagree with it.

**Mutation testing.** Where a suite passed first time, plausible one-character
mutations were run past it to check the assertions have teeth. `getCartTotals`:
4 mutants, 4 caught, each by a *different* test. `product-filter.service.js`:
5 for 5.

---

## Known bugs

Eight documented in [`bugs/`](bugs/). The policy while building was **reproduce
it, pin it with a test, write it down, do not fix** — so a bug doc is always
backed by a test that will notice when it changes.

| | Severity | Status |
|---|---|---|
| BUG-001 — PDP quantity never applied | Medium | Open |
| BUG-002 — Maps has no load fallback | Low | Open |
| BUG-003 — cart line key not normalised | Low | Open |
| BUG-004 — created product has no `_id` | Medium | **Fixed** |
| BUG-005 — session lost in a new tab | High | Open |
| BUG-006 — variant selector resolves an impossible combination | High | Open |
| BUG-007 — review write succeeds, returns 400 | Medium (latent) | Open |
| BUG-008 — auth errors are not JSON | Medium | Open |
| BUG-009 — signup discards the server's validation message | Medium | Open |

Expected-failure markers (`it.fails()` in Vitest, `test.fail()` in Playwright)
keep open bugs visible instead of hiding them behind a skip. When the fix lands,
the runner reports **"expected to fail but passed"** — which is exactly what
happened with BUG-004, and is the signal to remove the marker.

---

## CI

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) — seven jobs, and
one line that matters more than the rest:

```yaml
needs: [backend-tests, frontend-unit, api-tests, fullstack-tests, smoke, untagged]
```

`needs` is the gate. Every job listed must go green before `build` starts; if
one fails, the build is **skipped**. Without it, tests are decoration and the
deploy happens regardless.

`regression` is deliberately absent — it only runs on pull requests, and in
GitHub Actions **a job that never ran does not satisfy a `needs`**. Adding it
would freeze every deploy permanently with no error message anywhere.

Three details worth knowing:

- **`npm ci`, never `npm install`.** `ci` installs exactly the lockfile and
  errors if it disagrees with `package.json`. `install` quietly resolves newer
  versions, which is how CI ends up testing a dependency tree nobody has.
- **The mongod binary is cached**, keyed on `backend/package-lock.json`. A CI
  job depending on a third-party download is a CI job that goes red for reasons
  unrelated to the code.
- **`api-tests` installs no browsers.** Playwright's `request` fixture speaks
  HTTP from Node, so that job skips ~400MB of binaries.

**No secrets are required.** `tests/setup.js` sets `MONGO_URL`, `SECRET` and
the rest itself, and `config/env.js` skips `.env` under `NODE_ENV=test`. CI runs
the identical code path a developer runs locally. A suite that needs credentials
to run will eventually only run in one place.

---

## Test environments

Nothing ever touches the real database.

| Suite | Backend | Database |
|---|---|---|
| Backend unit | none | none (no I/O) |
| Backend API | in-process (`supertest`) | in-memory MongoDB replica set |
| API over HTTP | real server, **port 3031** | in-memory, ephemeral |
| Full stack | real server, **port 3031** | in-memory, ephemeral |
| Browser (local mode) | none | none — catalogue from `src/data` |

**Port 3031 is not arbitrary.** 3030 is the dev server, which is connected to
Atlas. During development of the API suite the dev server held 3030, the test
server died on `EADDRINUSE`, and requests meant for it were answered by the
production database instead. They were read-only that time. The separate port
makes the collision impossible rather than unlikely.

A replica set rather than a standalone mongod, because MongoDB only supports
multi-document transactions on a replica set — and Atlas is one, so the test
environment matches production.

---

## Running things

```bash
# Backend — 436 tests, ~26s
cd backend && npm test
cd backend && npm run test:watch        # sub-second on save

# Frontend unit — 137 tests, ~11s
cd frontend-react && npm test

# Playwright (each starts what it needs automatically)
cd frontend-react && npm run test:api          # real server on :3031
cd frontend-react && npm run test:fullstack    # builds the bundle first
cd frontend-react && npm run test:e2e          # local mode, 3 browsers
```

Coverage is collected (`npm run test:coverage`) but **no threshold is
enforced**. A threshold set before a suite is mature blocks work without
improving anything.

---

## Adding a test

1. **Pick the cheapest layer that can hold the assertion.** Is this a pure
   rule? A unit test. Does it involve permissions or persistence? An API test.
   Does it need a browser? Only then.
2. **Arrange by the shortest path that isn't the thing you're testing.** Cart
   tests seed products directly into Mongo rather than calling the product API
   — otherwise a bug in product creation turns forty cart tests red and none of
   them are about the cart.
3. **Assert on state as well as the response**, wherever the request changed
   something.
4. **Break it on purpose once.** Change the expected value, confirm it fails
   for the reason you expect, change it back. A test that has never failed has
   not been shown to test anything.

Two runners live in this repo and take different dialects:

```
*.test.js   -> Vitest      (node / jsdom)     it.fails()
*.spec.js   -> Playwright  (browser / HTTP)   test.fail()
```

The file-naming rule is what keeps them from collecting each other's tests.
Getting it wrong produces an opaque import error, not a helpful one.
