# Engineering Log

A running record of every change made to ZolStock while turning it from a working
project into a deployable one — written to be *read*, not just referenced.

Each stage has the same four parts:

- **What changed** — the literal edits.
- **Why** — the reasoning, including what breaks if you skip it.
- **The transferable lesson** — the part that applies to every project you ever touch.
- **Know this cold** — the thing worth being able to explain out loud.

Written for someone aiming at deployment / platform engineering. The bias
throughout is toward *why*, because the commands change every few years and the
reasoning doesn't.

---

## The one idea underneath all of it

If you take a single thing from this document, take this:

> **Git holds inputs. CI produces outputs. They must never be the same thing.**

Almost every rule below is a consequence of that sentence. Source code, config,
migrations, `package.json` — inputs, committed. Compiled bundles, minified CSS,
Docker images, coverage reports — outputs, generated. The moment an output gets
committed, you've created two sources of truth that will silently disagree, and
you will lose a day to it eventually.

A useful test: **can you delete it and get it back with one command?** If yes,
it's an output, and it doesn't belong in git.

---

# Stage 0 — Repo hygiene

**Goal:** remove things that are actively misleading, and make the repo
reproducible from a fresh clone. No behaviour changes.

**Why first:** every later stage gets harder to review if the diff is buried in
noise. Also, one item here is a live financial risk.

---

## 0.1 — Removed 103 build artifacts from git

### What changed

`backend/public/` was tracked in git — 103 files: minified JS bundles with
content-hashed names (`index-4c98b8d1.js`), a compiled CSS file, `index.html`,
and 74 images. All of it is what Vite spits out when you run `npm run build`.

I untracked it and added it to `.gitignore`:

```bash
git rm -r --cached backend/public
```

### Why

Four separate problems, and each one is enough on its own:

**1. It's a second source of truth that drifts.**
`backend/public/index-4c98b8d1.js` was built from *some* commit. Which one? Nobody
knows. There's no link back. So the repo simultaneously claims "the source is in
`frontend-react/src`" and "the app is this bundle" — and after a few commits those
two disagree. You then debug a bug that exists in the deployed bundle but not in
the source, which is one of the more maddening ways to lose an afternoon.

**2. Git handles minified files badly.**
Git stores changes efficiently for text it can diff line-by-line. Minified JS is
one enormous line. Change one character in your source and the entire bundle
re-minifies with a new content hash — so git stores a **whole new copy** of the
file, forever, because git history is immutable. The repo grows monotonically and
you can never shrink it without rewriting history.

**3. Every merge is a conflict.**
Two branches that both ran a build produce two different bundles. Git cannot merge
minified JavaScript. Every single merge becomes a manual conflict resolution on a
file nobody should be reading.

**4. It hides whether the build actually works.**
If the build output is committed, a broken build still deploys — it just deploys
the *stale* output. The failure is invisible until someone notices the site is
weeks out of date.

### What I checked before doing it

This is the part worth copying as a habit. Untracking a directory is destructive
if anything in it is *not* reproducible. `backend/public/assets/img/` held 74
images — if even one existed only there, untracking it would eventually delete an
asset nobody could regenerate.

So I compared both directories in **both directions**:

```bash
comm -23 <(cd backend/public/assets/img && find . -type f | sort) \
         <(cd frontend-react/public/assets/img && find . -type f | sort)
# → empty: nothing exists only in backend/public

comm -13 <(...) <(...)
# → empty: nothing exists only in frontend
```

Both empty means the sets are identical, which confirms Vite copies `public/`
verbatim into the build. Only then was it safe.

> **The habit:** before removing anything, prove it's reproducible. Don't reason
> that it *should* be — check. "It's just build output" is exactly the sentence
> people say right before deleting something that wasn't.

### The drift was real — here's the proof

After untracking, I ran `npm run build` to confirm the output regenerates. It
did, all 103 files. But look at the filenames:

```
committed in git:   assets/HomePage-b6fac2db.js
freshly built:      assets/HomePage-cf9dfbe1.js
```

Those hashes are derived from the file's **contents**. Different hash means
different content — so the bundle sitting in git was built from a *different
version of the source* than what's on `main` today. The exact drift described
above, already happened, sitting in the repo unnoticed.

This is also the clearest possible demonstration of why content-hashed filenames
exist. They're a **cache-busting** mechanism: browsers cache
`HomePage-b6fac2db.js` aggressively (it's safe — that name can only ever mean
those exact bytes), and when you deploy new code the filename changes, so the
browser fetches the new one instead of serving stale cached JavaScript. You get
long cache lifetimes and instant updates at the same time. Worth understanding
properly — you'll configure cache headers around this exact behaviour later:

| Path | Cache header | Why |
|---|---|---|
| `/assets/*-[hash].js` | `max-age=31536000, immutable` | name changes when content does |
| `/index.html` | `no-cache` | must be re-checked; it points at the hashed files |

### The transferable lesson

**`.gitignore` does not untrack files that git is already tracking.**

This catches nearly everyone once. `.gitignore` only governs files git doesn't
know about yet. Once a file is tracked, git keeps tracking it and ignores the
ignore rule entirely. You need:

```bash
git rm --cached <path>     # stop tracking, keep the file on disk
git rm         <path>      # stop tracking, DELETE the file on disk  ← not this
```

The `--cached` flag is the whole difference between "untrack" and "destroy."

### Know this cold

**A fresh clone must be able to produce a working app.** That's the actual
standard. After this change, cloning ZolStock and running the backend serves
nothing — until you run `npm run build`, which regenerates `backend/public/`
exactly. That's not a regression, that's the point: the build step is now *real*
rather than something that already happened at an unknown time on someone's laptop.

Stage 8 makes CI run that build, and Docker makes it identical everywhere.

⚠️ **Practical consequence for you:** after pulling this change on another
machine, run `npm run build` in `frontend-react/` before starting the backend, or
it will serve a 404 for the app shell.

---

## 0.2 — Deleted a workflow that never ran

### What changed

Deleted `frontend-react/.github/workflows/main.yml`.

### Why

**GitHub Actions only reads workflows from `.github/workflows/` at the repository
root.** Nowhere else. A workflow file in a subdirectory is an ordinary text file —
GitHub never parses it, never runs it, never warns you.

So this file, which looked like a complete second deploy pipeline (build the SPA,
push to GitHub Pages), had never executed once. Meanwhile the real pipeline at
`.github/workflows/ci-cd.yml` did that job.

### The transferable lesson

**Dead config is more dangerous than missing config.**

Missing config fails loudly — you notice immediately. Dead config sits there
looking authoritative. The realistic failure: six months from now you need to
change how deploys work, you find this file, you edit it carefully, you push,
and nothing happens. Now you're debugging a deploy pipeline while reading a file
that has no connection to it. That's an hour gone minimum, and a genuinely
confusing hour.

It also had a real bug that proves it never ran: it used `path: dist` and a
bare `npm ci`, which only work if the working directory is `frontend-react`.
It never set one. Had it ever executed, it would have failed instantly.

> **The habit:** when you find config that looks redundant, don't assume it's a
> harmless copy. Work out whether it *can* run. If it can't, delete it — a file
> that looks live but isn't will cost someone real time.

### Know this cold

Conventions that are enforced by *location* rather than by content are everywhere
in this field, and they fail silently by nature:

| File | Must live at | Otherwise |
|---|---|---|
| GitHub Actions workflows | `.github/workflows/` **at repo root** | never runs |
| `Dockerfile` | inside the build context | `COPY` can't see it |
| `.dockerignore` | next to the Dockerfile | ignored |
| `.nvmrc` | repo root (or the dir you `cd` into) | not picked up |

When something "isn't running," check *where it lives* before you debug *what it says*.

---

## 0.3 — Pinned the Node version

### What changed

Added `.nvmrc` at the repo root and an `engines` field to both `package.json`s:

```
20.15.0
```
```json
"engines": { "node": ">=20.15.0 <21", "npm": ">=10" }
```

### Why

Right now three different Node versions are in play and nothing reconciles them:

- Your machine: whatever `node -v` says today (v20.15.0)
- CI: `node-version: 20` — meaning "latest 20.x", which **changes over time**
- A future deploy host: whatever its default happens to be

"Works on my machine" is almost always a version drift problem wearing a costume.
Node minor versions have shipped real behavioural changes — in how ESM resolves,
in fetch, in crypto defaults. A test passing locally and failing in CI with an
incomprehensible error is very often this.

Note `node-version: 20` is *not* pinned. It floats. Today it's 20.19, in six
months it's 20.22, and the day it breaks you'll have changed nothing.

### The transferable lesson

**Reproducible builds mean: same inputs → same output, on any machine, at any
time.** Version pinning is the first rung of that ladder. The full ladder:

| Rung | What it pins | Covers |
|---|---|---|
| `.nvmrc` / `engines` | Node version | the runtime |
| `package-lock.json` + `npm ci` | exact dependency tree | your libraries |
| Docker image tag | the whole OS | system libs, OpenSSL, timezone, locale |
| Digest pin (`@sha256:...`) | the exact image bytes | everything |

Each rung eliminates a class of "works here, not there." You're on rung 2 already
(`npm ci` is in CI — good, and specifically better than `npm install`, which is
allowed to *update* the lockfile). Stage 8 takes you to rung 3.

### Know this cold

**`npm ci` vs `npm install` — the difference matters and it comes up constantly.**

- `npm install` reads `package.json`, resolves versions, and may **write** a new
  `package-lock.json`. Non-deterministic across time.
- `npm ci` reads `package-lock.json` **only**, installs exactly that tree, deletes
  `node_modules` first, and **fails** if the lockfile disagrees with
  `package.json`.

Rule: `npm install` when you're deliberately changing dependencies.
`npm ci` **everywhere else** — CI, Docker, production. Always.

---

## 0.4 — Documented the frontend's environment contract

### What changed

Added `frontend-react/.env.example`. The backend already had one; the frontend
didn't.

### Why

`.env` is gitignored, correctly — it holds machine-specific and sometimes secret
values. But that creates a gap: **a new clone has no way to know which variables
the app needs.** You start it, something is quietly undefined, and a feature fails
in a way that doesn't mention environment variables at all.

`.env.example` is the fix: committed, contains the *keys* and safe defaults with
no real secrets, and serves as the checklist.

### The trap I walked into while doing it

I wrote `.env.example`, then noticed it wasn't showing up in `git status`. The
existing `.gitignore` had:

```gitignore
.env
.env.*      # ← this matches .env.example
```

So the file documenting the configuration was itself ignored. It could never have
been committed, and I'd have "documented" the config in a file only visible on my
own machine. Silent, and easy to miss.

The fix is a **negation pattern**:

```gitignore
.env
.env.*
!.env.example    # exempt this one
```

Two rules about negations that matter:

1. **Order is significant.** `!` only un-ignores something a *previous* line
   ignored. Put the negation first and git never applies it.
2. **You cannot un-ignore a file inside an ignored directory.** If you ignore
   `dist/`, then `!dist/keep.txt` does nothing — git never descends into an
   excluded directory, so it never evaluates the rule. You'd need
   `dist/*` + `!dist/keep.txt` instead.

> **How I caught it:** `git check-ignore -v <file>` prints the exact rule and
> line number doing the ignoring. When a file mysteriously isn't being committed,
> this is the tool — don't squint at `.gitignore`, ask git.

### The transferable lesson

**Configuration is an interface, and interfaces need documentation.**

An app's env vars are a contract with whoever deploys it — which will be you, in
six months, having forgotten everything. `.env.example` is that contract written
down. It should list *every* variable the app reads, including optional ones,
with a comment on what breaks without it.

There's a second, sharper rule visible in this codebase:

> **In a frontend build, "environment variable" does not mean "secret."**

Anything prefixed `VITE_` is **compiled into the JavaScript bundle** and served to
every visitor. It is published, not hidden. Same for `NEXT_PUBLIC_` in Next.js and
`REACT_APP_` in CRA. Frontend env vars exist to vary *config* per environment
(which API URL), never to hide *secrets*.

If a value must stay secret, it belongs on a server. No exceptions, no clever
workarounds.

### Know this cold

The three-way distinction people conflate, and the security consequence of each:

| Type | Example | Where it lives | Visible to users? |
|---|---|---|---|
| **Build-time public config** | `VITE_API_URL` | baked into the bundle | **Yes — always** |
| **Runtime server config** | `PORT`, `DB_NAME` | server env | No |
| **Runtime server secret** | `SECRET`, `MONGO_URL` | secret manager | No |

A "secret" in column 1 is not a secret. That distinction is the entire reason the
next item exists.

---

## 0.5 — Wrote down a known bug

### What changed

Created `bugs/BUG-001-pdp-quantity-not-applied.md`.

### Why

`tests/e2e/cart-flow.spec.js` referenced this file — and it didn't exist. The
test is well built: it uses `test.fail()`, meaning Playwright *expects* it to
fail, so the suite stays green while the bug is open, and turns **red when the
bug gets fixed** — prompting you to remove the marker. That's a genuinely good
pattern. It just pointed at documentation nobody had written.

### The transferable lesson

**A known bug and an unknown bug are completely different objects.**

An unknown bug is a risk. A known, documented, test-covered bug is a *scheduling
decision* — someone weighed it and chose not to fix it yet. That's legitimate
engineering. What's not legitimate is a bug living only in someone's head.

The `test.fail()` pattern is the strongest version of this because the knowledge
is **executable**:

- The bug can't be forgotten — it's in the test suite
- It can't silently get worse — the test still runs
- When fixed, CI tells you immediately (the test now passes unexpectedly → red)
- It documents *exact* expected behaviour, not prose approximating it

### Know this cold

Three ways to handle a bug you're not fixing right now, worst to best:

1. **Delete or skip the test** — the knowledge is gone. Never do this.
2. **Comment it out with a TODO** — knowledge survives but nothing enforces it;
   TODOs rot.
3. **`test.fail()` / `xfail` + a bug doc** — the knowledge is executable and
   self-correcting. ✅

Most test frameworks have this: Playwright `test.fail()`, pytest `xfail`,
JUnit `@Disabled` (weaker), Vitest `test.fails()`.

---

## 0.6 — Removed `nul` files

### What changed

Deleted `nul` (repo root) and `frontend-react/nul` (108 KB).

### Why

A Windows-specific accident. On Unix, `command > /dev/null` discards output. On
Windows the equivalent device is `NUL` — but when a Unix-style command runs under
Git Bash on Windows, `> nul` doesn't hit a device, it **creates a file called
`nul`** and writes the output into it.

Harmless but confusing, and the 108 KB one contains captured build logs.

### The transferable lesson

**Cross-platform shell differences are a real category of bug, not a curiosity.**
This project already has scars from it — look at `package.json`:

```json
"dev:local":     "set VITE_LOCAL=true&&vite",           // Windows cmd
"dev:local:mac": "export VITE_LOCAL=true && vite",      // Unix
```

Two scripts doing one job because the syntax for setting an environment variable
differs by platform. That's a maintenance tax: someone will change one and forget
the other. The standard fix is `cross-env` — which is **already in the backend's
devDependencies** and not used in the frontend. Worth unifying later.

This matters more than it sounds for deployment work, because **you develop on
Windows and deploy to Linux.** Things that differ and will bite you:

| | Windows | Linux (your servers) |
|---|---|---|
| Path separator | `\` | `/` |
| Filename case | insensitive | **sensitive** |
| Line endings | CRLF | LF |
| Env var syntax | `set X=1` | `X=1` |
| Null device | `NUL` | `/dev/null` |

**Case sensitivity is the one that gets people.** `import './Button'` when the
file is `button.jsx` works perfectly on Windows and fails the CI build on Linux.
Classic "passes locally, fails in CI."

### Know this cold

Docker (stage 8) mostly dissolves this class of problem, because you then build
and run inside the *same Linux image* locally and in production. That's a large
part of why containers won — not isolation, but **environment parity**.

---

# Stage 0 — summary

| Change | Category | Risk |
|---|---|---|
| Untracked `backend/public/` (103 files) | reproducibility | none — verified duplicates |
| Deleted dead `main.yml` workflow | clarity | none — never ran |
| Pinned Node (`.nvmrc` + `engines`) | reproducibility | none |
| Added `frontend-react/.env.example` + gitignore negation | documentation | none |
| Wrote `bugs/BUG-001-*.md` | documentation | none |
| Deleted `nul` files | cleanup | none |

**No application code was touched. No behaviour changed.**

Verified by: production build succeeded and regenerated all 103 files; image
count matches the frontend source exactly (63 products + 8 categories + 3 icons
= 74); `git status` shows zero untracked build output leaking back in; and the
existing smoke suite passes 14/14.

### Baseline measurements

Taken now so later stages have something to compare against. **Measure before you
change** — otherwise "it's faster now" is just a feeling.

| Metric | Value | Notes |
|---|---|---|
| Production build | **4.7s** | 103 files out |
| Largest bundle | `index-442671b2.js` — **478 kB** (157 kB gzipped) | above the 500 kB warning line |
| Second largest | `BranchesPage-d0fab3de.js` — **200 kB** (50 kB gzipped) | this is the Google Maps loader → stage 0.5 should shrink it a lot |
| Smoke suite (chromium only) | **13.4s**, 14/14 pass | ×3 browsers in CI |
| **Lint** | **186 problems (175 errors, 11 warnings)** | ⚠️ see below |
| Backend tests | **0** | — |

⚠️ **The lint number is a problem for stage 7.** The plan was to add
`npm run lint` as a CI gate — but the script is configured with
`--max-warnings 0`, and there are already 175 errors. Turning it on today would
block every single push.

This is a very common situation in real codebases, and there are three standard
responses:

1. **Fix all 175 first.** Honest, but it's a large unrelated diff and it delays
   everything behind it.
2. **Weaken the rules until it passes.** Tempting, and it makes the gate
   meaningless. Avoid.
3. **Ratchet.** Record the current count as the allowed maximum, gate on *"no
   worse than today"*, and lower the number as you clean up opportunistically.
   New code is held to the standard; old code is fixed gradually.

**Ratcheting is almost always the right answer** for adding a gate to an existing
codebase, and I'll take that approach in stage 7. The principle generalises well
beyond linting — it's how you introduce type checking, coverage thresholds, or
bundle-size limits to a project that would fail them on day one.

One of those errors is worth calling out now, because it's a config gap rather
than sloppy code:

```
tests/utils/pick-product.js:1:57  Parsing error: Unexpected token with
```

That's the modern `import ... with { type: 'json' }` syntax, which the project's
ESLint 8 setup can't parse. So ESLint currently isn't checking that file *at
all* — it's failing to read it. A linter that can't parse a file reports one
error and silently skips everything else in it, which is a quiet way to lose
coverage. Fixing the parser config is part of stage 7.

### What to verify on your end

1. `git status` — expect ~103 staged deletions under `backend/public/`, plus the
   new/removed files above. **The images should still be on disk.**
2. `cd frontend-react && npm run build` — should recreate `backend/public/`.
3. Start the backend, load the app — should work exactly as before.

### The five sentences worth keeping from Stage 0

1. Git holds inputs; CI produces outputs; never both.
2. `.gitignore` doesn't untrack what git already tracks — that's `git rm --cached`.
3. Config that can't run is worse than config that doesn't exist.
4. `npm ci` in every automated context; `npm install` only when changing deps.
5. A `VITE_`/`NEXT_PUBLIC_` variable is published to the world, not hidden.

---

---

# Stage 0.5 — Google Maps → Leaflet

**Goal:** remove a live billing risk and a build-time secret, by replacing a
paid third-party map with a free one.

**Why it's worth a whole stage:** it's the first change that touches application
code, so it's the first chance to practise the discipline that matters most in
this job — *changing something without breaking the things attached to it.*

---

## 0.5.1 — Why the map had to go

`MapsCmp.jsx` used Google Maps, which means:

**Google Maps Platform requires a billing account with a card on file.** Even to
stay inside the free credit, the card must be there. And the key was read from
`VITE_GOOGLE_MAPS_API_KEY` — which, per stage 0.4, is **compiled into the public
JavaScript bundle**. Any visitor could read it out of your source and spend
against your card.

Three problems, one root cause:

| Problem | Consequence |
|---|---|
| Key is public by construction | Anyone can use your quota |
| Billing account required | A leak has a monetary floor of "your card" |
| Key absent in CI | The deployed build shipped `undefined` — map broken in production, working locally |

That third one is worth pausing on. It's a **configuration bug that only exists in
the deployed environment** — the exact category that local testing cannot catch
and that stage 8's post-deploy smoke tests exist to find.

Leaflet + OpenStreetMap needs no key, no account, and no card. All three problems
disappear at once — the strongest kind of fix, because it removes the category
rather than mitigating an instance of it.

---

## 0.5.2 — The part that matters: mapping the contract first

Before writing a line of Leaflet, I worked out **everything attached to this
component**. This is the habit worth stealing from this stage.

| Attachment | Found in | Verdict |
|---|---|---|
| Props (`regions`, `selectedRegionId`, `selectedBranchId`, `onSelectFromMap`) | `BranchesPage.jsx:177` | must keep identical |
| Export name `MyComponent` | `BranchesPage.jsx:4` | must keep — one import site |
| `.map-fallback` + `__title` `__body` `__link` | `BranchesPage.scss:210-241` | markup must keep emitting these |
| `.map-loading` + `__spinner` | `BranchesPage.scss:243-263` | ← see below |
| `data-testid="branch-map"` | `BranchesPage.jsx:175` | **outside** the component — safe |
| `pin.png` custom marker | `MapsCmp.jsx:3` | keep |
| Behaviours: pan-to-region, pan-to-branch, click-pin-selects, click-background-clears | reading the old code | all must survive |

**The `data-testid` finding is the whole reason for doing this audit.** Had that
attribute lived *inside* `MapsCmp`, rewriting the component would have silently
broken a smoke test — and I'd have discovered it at the end of a long change
instead of before starting. It happened to be on the wrapper in
`BranchesPage.jsx`, so it was safe. **I knew that before I typed anything**,
which is the difference between a controlled change and a hopeful one.

> **The habit:** before changing a shared component, list its dependents and what
> each one relies on — props, class names, test hooks, DOM structure. Ten minutes
> of reading turns "let's see if it still works" into "I know what could break."

### The transferable lesson

**A component's real interface is bigger than its props.**

Its props are the obvious part. But everything below is equally load-bearing, and
none of it is enforced by the language:

- **Class names** the stylesheet targets
- **DOM structure** CSS selectors assume (`.a > .b` breaks if you add a wrapper)
- **Test IDs** and roles the test suite queries
- **Side effects** — what it writes to the store, fires on the event bus, or
  persists to `localStorage`

Change any of those and something breaks with **no compile error and no type
error**. This is why "it builds, ship it" isn't a standard, and why the test
suite in stages 3–6 matters — it's the only mechanism that makes this class of
interface *enforced* rather than *remembered*.

---

## 0.5.3 — The z-index collision I found by reading

Leaflet ships its own stylesheet. Its control layer (zoom buttons, attribution)
is set to `z-index: 1000`.

`AppHeader.scss:108` puts the sticky header at **exactly `z-index: 1000` too**.

When two elements have the same z-index, **the one later in the DOM paints on
top**. The map comes after the header, so Leaflet's zoom buttons would have
floated over your sticky header while scrolling. A subtle, ugly bug — the kind
you'd notice weeks later and struggle to attribute.

The naive fix is to out-bid it: give the header `z-index: 1001`. That's a losing
game — you're now in an arms race with a third-party stylesheet you don't
control, and the next Leaflet upgrade can restart it.

The durable fix is a **stacking context**:

```scss
.map {
  position: relative;
  z-index: 0;   // ← creates a stacking context
}
```

### Know this cold — stacking contexts

This is one of the most useful CSS concepts for debugging "why is this thing on
top of that thing," and most people never learn it properly.

**A stacking context is a self-contained z-index universe.** Once an element
creates one, every z-index of its descendants is resolved *only against its
siblings inside that box*. A child with `z-index: 99999` cannot escape a parent
whose context sits below something else.

So `.map { position: relative; z-index: 0 }` means: *everything Leaflet does
internally is now sealed inside an element at z-index 0.* It cannot reach the
header at 1000, no matter what values it uses internally, forever.

What creates a stacking context (the ones you'll actually meet):

- `position: relative|absolute` **with a `z-index` other than `auto`**
- `position: fixed` or `sticky` (always)
- `opacity` less than 1
- `transform`, `filter`, `perspective`, `will-change`
- `isolation: isolate` ← exists purely to create one, with no side effects

> Your own codebase already documents a run-in with this. `AppHeader.scss:268`
> has a comment about a transform trapping a dropdown's `z-index: 9999` inside
> its element. That's the same rule biting from the other direction — an
> *accidental* context. Worth reading now that you know the mechanism.

---

## 0.5.4 — I predicted the bundle would shrink. It grew.

Before starting I said the Leaflet swap "should meaningfully shrink that 200 kB
BranchesPage bundle." Here's what actually happened:

| | Before (Google) | After (Leaflet) | Δ |
|---|---|---|---|
| `BranchesPage` raw | 199.66 kB | 200.71 kB | +1 kB |
| `BranchesPage` gzipped | 49.78 kB | **60.87 kB** | **+11 kB** |

**I was wrong, and the reason is worth more than the prediction.**

`@react-google-maps/api` is only a **loader**. It's a thin React wrapper whose job
is to inject a `<script>` tag pointing at Google's CDN and wait. The actual Google
Maps engine — hundreds of kilobytes of it — was **never in your bundle**. It was
fetched at runtime, from Google, on every visit to `/branches`.

Leaflet is the opposite: the entire mapping engine is bundled with your app.

So the bundle grew by 11 kB gzipped, while the **total bytes a visitor downloads
dropped substantially** — because a large third-party script fetch disappeared
entirely.

### Know this cold — measure the right number

**Bundle size is a proxy metric, not the goal.** What actually determines how fast
a page feels:

| Metric | What it captures | Missed by bundle size |
|---|---|---|
| **Total transferred bytes** | everything fetched, incl. third parties | ✅ runtime-loaded scripts |
| **Number of requests** | connection + DNS + TLS overhead per origin | ✅ extra origins are expensive |
| **Critical path length** | script → fetches script → fetches data | ✅ waterfalls |
| **Third-party origins** | DNS + TLS handshake each, and a privacy surface | ✅ entirely |

Google Maps was a **second origin** on the critical path: DNS lookup, TLS
handshake, script download, then the script fetching its own tiles and assets.
Leaflet has none of that — the code is already there, and only tile images are
fetched.

The general trap: **a metric that's easy to measure quietly becomes the goal.**
Bundle size is easy to measure, so people optimise it — and "improve" a page by
moving code out of the bundle into a runtime fetch, which makes the real
experience worse while the dashboard turns green.

> **The habit:** when you state an expected outcome, measure it afterward and say
> so when you were wrong. The measurement is where the understanding is. A
> prediction that goes unchecked teaches nothing.

---

## 0.5.5 — The verification that mattered, and a weak test exposed

The existing smoke test for the map is:

```js
this.map = page.getByTestId('branch-map');
// ...
await expect(branchesPage.map).toBeVisible({ timeout: 60_000 });
```

That `data-testid` is on a **plain wrapper `<div>`** in `BranchesPage.jsx` — a div
that renders whether or not the map inside it works at all. So:

> **This test passes if the map is completely broken.** It would pass with an
> empty div. It has been passing all along without ever verifying a map.

That's a *false confidence* test, and they're worse than missing tests — a gap you
know about gets filled, a gap you think is covered does not.

So I wrote a throwaway spec asserting what actually matters, ran it, then deleted
it:

```
TILES_LOADED=9        ← tiles genuinely fetched and painted
MARKERS=74            ← every branch pin rendered (74 = the real count)
GOOGLE_REQUESTS=0     ← no remnant calls to Google
CONSOLE_ERRORS=0      ← nothing throwing
```

Then the real suite: **18/18 passing** (14 `@smoke` + 4 `@regression`).

### Know this cold — assert on the thing, not near the thing

The rule this violates: **a test must assert on the artefact whose behaviour it
claims to verify.** `branch-map` is a container. `.leaflet-container`,
`.leaflet-tile-loaded` and `.leaflet-marker-icon` are the map.

How to spot false-confidence tests in your own suite — ask of each one:

1. **"What would have to break for this to fail?"** If the honest answer is
   narrower than the test's name suggests, the test is lying about its scope.
2. **Break it deliberately and confirm it goes red.** A test never seen failing
   is not yet a test. This is the single most useful habit in testing, and
   almost nobody does it.

That second point has a name — **mutation testing** — where a tool automatically
introduces small bugs and checks your suite notices. You don't need the tool to
get the benefit; just deliberately break the thing and watch for red.

Rewriting this properly is stage 6. Logged here as a real finding: **the existing
map coverage is decorative.**

---

## 0.5.6 — What I deliberately did *not* do

Discipline about scope is a reviewable skill. Things I found and left alone:

| Found | Why left |
|---|---|
| `MyComponent` is a meaningless component name | Renaming is unrelated to swapping the map. Its own commit. |
| `.map-loading` / `__spinner` CSS is now unused | Leaflet renders instantly — no external script, so no loading gap. Dead CSS is harmless; deleting styles belongs in a styling pass. **Flagged, not removed.** |
| `darken($clr1, 8%)` is a deprecated Sass function (build warning) | `$clr1` is a **brand colour**. Migrating to `color.adjust()` must produce a byte-identical result and needs verification. Not mixed into a map change. |
| `src/scripts/geocode-branches.mjs` still references a Google key | It's a one-off script that already ran and produced `branches.withLatLng.json`. Harmless, and deleting scripts isn't this stage's job. |
| `branches.spec.js` still uses a 60s timeout for BUG-002 | Test changes belong in stages 3–6. A timeout is a ceiling, not a delay. |
| 21 npm vulnerabilities reported during install | Real, and stage 7's `npm audit` gate handles it properly. Not a drive-by fix. |

### The transferable lesson

**A change that does one thing is reviewable. A change that does six is not.**

Every item above is a legitimate improvement, and folding them in would have
produced a diff where the map swap is impossible to review — and where a bug in
any one of them makes the whole thing hard to revert. Small, single-purpose
commits are not bureaucratic tidiness; they're what makes `git revert`, `git
bisect` and code review work at all.

The corollary — **write the distractions down rather than fixing them.** That
table *is* the deliverable for those findings. Nothing was lost by not acting.

---

# Stage 0.5 — summary

| Change | Risk |
|---|---|
| `MapsCmp.jsx` rewritten on Leaflet — same props, same class names, same behaviours | verified: 74 markers, 9 tiles, 0 errors |
| `BranchesPage.scss` — stacking context + Leaflet reconciliation | contained; no existing rule modified |
| Removed `@react-google-maps/api` | no remaining references in `src/` |
| Added `leaflet` + `react-leaflet@4` (v5 needs React 19; you're on 18.2) | pinned deliberately |
| `bugs/BUG-002-*.md` written and marked **resolved** | root cause removed |

**Removed:** a billing liability, a public API key, a third-party origin on the
critical path, and a runtime hang risk.

### What to verify on your end

1. `/branches` — map renders, pins visible, clicking a pin selects the branch in
   the list, clicking bare map clears it, picking a region flies the camera.
2. **Scroll the branches page** — confirm the zoom buttons stay *behind* the
   sticky header. That's the stacking-context fix.
3. Mobile width — one column, map still sized correctly.

### ⚠️ Action for you, outside the code

Your Google Maps key is still in `frontend-react/.env` and is no longer used by
anything. It never reached GitHub (`.env` is gitignored, and CI never had it).
Even so, **delete or restrict it in the Google Cloud Console** — an unused key
with billing attached is pure downside. Removing the app that needed it is the
cheapest moment to retire it.

### The five sentences worth keeping from Stage 0.5

1. A component's real interface includes class names, DOM shape and test hooks —
   none of which the compiler checks.
2. Map the dependents *before* you rewrite, not after something breaks.
3. Stacking contexts seal a subtree's z-indexes; that beats out-bidding a
   third-party stylesheet.
4. Bundle size misses runtime-fetched third parties — measure transferred bytes
   and origins.
5. A test that asserts on a wrapper instead of the thing will pass while the
   feature is broken.

---

*Next: Stage 2 — test infrastructure. Vitest on both sides, an in-memory Mongo
replica set, and fixture factories.*
