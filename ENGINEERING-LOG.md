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

---

# Stage 2 — Test infrastructure

**Goal:** make writing a test cheap. No product coverage yet — this stage builds
the machine that stages 3–6 feed.

**Why this order:** if writing a test is annoying, tests don't get written. Every
decision here is about removing friction from the *next* thousand tests.

---

## 2.1 — The blocker: a server that could not be tested

`server.js` did two jobs in one file:

```js
const app = express()          // build a request handler
// ... 80 lines of configuration ...
server.listen(port, ...)       // AND bind a TCP port
```

Those are joined by `import`. Any test that wants the app **also starts a real
server on :3030** — as a side effect of importing. Consequences:

- Two test files running in parallel fight over the port and one dies
- The port is left open after the run
- Socket.io starts, and shutdown handlers register, for a test about pricing

So the first thing this stage did was split them:

| File | Responsibility |
|---|---|
| `app.js` — `createApp()` | builds and returns the Express app. **No side effects.** |
| `server.js` | the *process*: listens, wires sockets, handles SIGTERM |

Now supertest drives `createApp()` directly, in-process, no port at all.

### The transferable lesson

**Separate constructing a thing from starting it.**

This is one of the highest-value patterns in backend work, and its payoff goes
well beyond tests:

- **Testability** — build the app without running it
- **Multiple instances** — each test file gets its own, configured differently
- **Graceful shutdown** — the process layer owns signals; the app doesn't care
- **Serverless / different hosts** — the same app can be wrapped by a Lambda
  handler or a different server without touching it

The general shape: **a module's import should not do anything.** Importing should
define capability, never take action. When `import './server.js'` opens a socket,
you've made an action out of a declaration, and everything downstream inherits it.

> Watch for this smell: `if (require.main === module)` in Python, or top-level
> `app.listen()` in Node. Both are the same problem — the fix is to export a
> factory and let a thin entry point call it.

I also added a parameter for it:

```js
createApp({ enableRateLimit: false })
```

The rate limiter keeps its counters in module scope. Left on, test file #1's
requests count against test file #2's budget, and tests start failing at
whatever point the suite crosses 300 requests — **failures that depend on how
many other tests ran**, which is the worst kind to debug. Off by default;
the limiter's own tests turn it back on deliberately.

---

## 2.2 — Why a real database, not a mock

The single most consequential choice in this stage.

```js
// order.service.js — the oversell guard
updateOne(
  { _id, stockQty: { $gte: qty } },   // the check…
  { $inc: { stockQty: -qty } }        // …and the write, one atomic operation
)
```

The correctness of this code is **not in the JavaScript**. It's in MongoDB's
guarantee that a single `updateOne` applies atomically. A mocked collection
returns whatever you programmed it to return — so a test against a mock proves
your mock works.

> **Mock what you don't own AND don't depend on the behaviour of.** Mock a
> payment gateway (you don't want real charges). Do not mock your database when
> the thing under test *is* a database guarantee.

### Why a replica set specifically

`MongoMemoryReplSet`, not `MongoMemoryServer`. **MongoDB only supports
multi-document transactions on a replica set** — a standalone `mongod` rejects
`session.withTransaction()` outright.

Stage 10 replaces checkout's compensating rollback with a real transaction, and
Atlas (the deploy target) is a replica set. Starting on one now means:

1. Tests written between here and stage 10 keep working
2. The test environment matches production
3. If it were ever going to fail, it fails now, not in stage 10

Costs about a second more to boot. I asserted the capability directly rather than
trusting it:

```
✓ supports transactions, which requires a replica set
✓ rolls a transaction back on throw
```

That second one matters — a transaction that commits but doesn't *roll back* is
worse than none, and it would silently invalidate every conclusion stage 10 draws.

### Know this cold — environment parity

**Your test environment should differ from production in as few dimensions as
possible.** Every difference is somewhere a bug can hide:

| Dimension | Test | Production | Same? |
|---|---|---|---|
| Database engine | real mongod | real mongod | ✅ |
| Replica set | yes (1 node) | yes (Atlas) | ✅ |
| Transactions | supported | supported | ✅ |
| Data | ephemeral | persistent | ❌ *deliberate* |
| Network latency | ~0 | real | ❌ *accepted* |

The last two are conscious trade-offs, not oversights. That's the difference
between a considered environment and a convenient one.

---

## 2.3 — Isolation: the decision that keeps a suite honest

Vitest runs test files in **parallel workers**. So "clear the database between
tests" is not as simple as it sounds — two files clearing the same database
delete each other's data mid-test.

Three options, and the reasoning:

| Strategy | Isolation | Cost | Verdict |
|---|---|---|---|
| One mongod per file | perfect | ~2s **per file** | too slow at scale |
| One mongod, **one database per file** | perfect | one boot, ~0 per file | ✅ **chosen** |
| One mongod, one shared database | broken under parallelism | fastest | unsafe |

Mongo creates databases lazily, so a database name costs nothing until written
to. Each test file generates one:

```js
const dbName = `test_${randomUUID().replace(/-/g, '')}`
```

Then within a file, `afterEach` clears documents.

### The subtle bit — why delete documents instead of dropping the database

```js
// setup.js
const collections = await db.collections()
await Promise.all(collections.map(c => c.deleteMany({})))
```

Dropping the database would also drop **indexes** — including the unique index on
`user.username` that `user.service.js` creates on first insert. A later test
could then insert a duplicate username and pass, while production (where the
index exists) rejects it.

**That's a test suite that lies.** Deleting documents keeps the schema and clears
the state, so the constraints tests run against are the constraints production
has.

> **The principle:** reset *data*, preserve *structure*. Whenever you write
> cleanup code, ask what else it destroys.

### The ordering trap this depends on

`config/dev.js` reads `process.env.MONGO_URL` **when the module is first
imported**, not when it's used. So the environment has to be right before
anything imports config. That's why:

- `setup.js` sets the env vars (setup files run **before** the test module loads)
- `vitest.config.js` sets `isolate: true` (fresh module registry per file — else
  only the *first* file's database name would ever apply)

I didn't trust this reasoning; I asserted it:

```js
expect(db.databaseName).toMatch(/^test_[0-9a-f]{32}$/)
expect(process.env.MONGO_URL).not.toContain('27017')
```

Worth knowing *why* that second line matters: `config/env.js` calls
`dotenv.config()`, which loads the real `backend/.env` — containing your actual
`MONGO_URL`. dotenv does **not** override variables already in `process.env`, so
the test values win. But that's a property of dotenv's defaults, not something
obvious, and one `override: true` would silently point the whole suite at your
real database. The assertion makes that catastrophe a failing test.

---

## 2.4 — Factories, not fixture files

```js
makeProduct({ stockQty: 1 })   // this test is about the last unit
```

Everything else — sku, price, category, images — is filled with a valid default.

**Why not a shared `products.json` every test reads?** Two failure modes:

1. **Coupling.** Tests start depending on incidental details — "the third product
   is out of stock." Changing the file to suit one test breaks three others, and
   nobody can safely edit it.
2. **Unreadability.** To know what a test is testing you must open a different
   file and count rows. The premise of the test is invisible at the test.

A factory inverts both: the test states *only* what matters to it, and nothing
another test does can affect it.

### The rules that make factories work

- **Defaults must always be valid.** A test wanting an invalid object asks
  explicitly — which makes the invalidity visible at the call site.
- **Overrides merge last**, so any field can be replaced without a new factory.
- **Unique values by default** (sequence counter), so 50 products don't collide
  on a unique index.
- **Mirror real shapes.** `makeCartItem` has no price field, because
  `cart.service.js` never stores one. A factory that invented a convenient shape
  would let tests pass against data the app never produces.

### The bug this stage caught in its own fixtures

I hardcoded a bcrypt hash for the test password — hashing in a factory costs
~100ms per user, which across a suite is minutes. Then I verified it:

```
claimed hash verifies: false
```

**The hash I'd written did not match the password.** Every login test would have
failed, with nothing pointing at the fixture — you'd be debugging auth code that
was fine.

So it's now pinned by a test:

```js
it('TEST_PASSWORD_HASH really is the hash of TEST_PASSWORD', async () => {
  expect(await bcrypt.compare(TEST_PASSWORD, TEST_PASSWORD_HASH)).toBe(true)
})
```

> **The lesson:** test infrastructure is production code for your tests. If other
> tests depend on it, it gets tested. A broken harness produces false results
> across the entire suite — passing while the app is broken, or failing while
> it's fine. Both are worse than no tests.

---

## 2.5 — Auth without logging in

```js
await request(app).get('/api/order').set('Cookie', cookieFor(user))
```

`cookieFor` mints a session cookie directly. Two reasons.

**Blast radius.** If every authenticated test logged in first, breaking login
turns 400 tests red. You want **one** red test — the login test — pointing
straight at the fault. A test's *arrange* step should not exercise features it
isn't testing, or one bug produces a wall of failures that hides its own cause.

**Cost.** Login runs `bcrypt.compare`, deliberately slow (~100ms). Paying that in
the arrange step of every test is minutes of wall clock.

### The important detail

`cookieFor` calls the app's **own** `authService.getLoginToken()` rather than
hand-rolling the token format. If tests built the token themselves:

- Changing how sessions are encoded breaks every test instead of one module
- Worse — the tests could keep passing against a format the app no longer issues

Going through the real function means tests follow the implementation
automatically. Stage 1 adds an expiry to that payload, and **nothing in the test
helpers changes.**

I also built the adversarial variants, because they're what stages 3–4 need:

```js
invalidCookie()             // garbage token → must 401, not crash
cookieWithWrongSecret(user) // valid shape, wrong key, isAdmin: true
```

That last one is the real test of whether the secret is doing any work — an
attacker who knows the payload shape but not the key. It's the exact attack
stage 1's fail-fast `SECRET` check exists to prevent.

---

## 2.6 — Frontend: why MSW instead of mocking axios

```js
// ❌ mocking the client — tests the implementation
vi.mock('axios')
expect(axios.get).toHaveBeenCalledWith('/api/product', ...)

// ✅ mocking the network — tests the behaviour
http.get('*/api/product', () => HttpResponse.json(products))
```

Mocking axios asserts *how* the code fetches. Swap axios for `fetch` — a change
that alters nothing a user experiences — and every test breaks. That's the
implementation-vs-contract lesson from stage 0.5, in a new costume.

MSW intercepts at the **network layer**. The app makes a real request through its
real client; MSW answers it. The test says *"when the server returns this, the UI
shows that"* — the actual contract, and it survives changing HTTP libraries.

It also makes the interesting cases one-liners:

```js
server.use(http.get('*/api/product', () => HttpResponse.error()))          // network down
server.use(http.get('*/api/product', () => HttpResponse.json([], { status: 500 })))
```

Error and empty states are where bugs live and coverage is thinnest — anything
that makes them *easy* to test is worth a lot.

### Two settings worth understanding

**`onUnhandledRequest: 'error'`** — a request with no handler fails the test.
Without this, an unmocked call silently hits the real network: slow, flaky, and
dependent on a server being up. Better to fail loudly and add a handler.

**Handlers mirror real API shapes.** Every field in `handlers.js` is one the
Express API actually returns. A handler returning a convenient made-up shape is
the most common way component tests give false confidence — the component works
perfectly against data the server never sends.

### The jsdom stubs, and being honest about them

jsdom has no layout engine, so `ResizeObserver`, `IntersectionObserver` and
`matchMedia` don't exist. Without stubs, any component using them throws "not a
function" — a failure that names the missing global instead of the actual bug.

But be clear about what this costs: **stubbed `IntersectionObserver` means jsdom
cannot tell you whether something is actually visible.** Anything genuinely about
layout, visibility or paint belongs in Playwright, where a real browser engine
answers it. Knowing which questions your fast tests *cannot* answer is as
important as knowing which they can.

---

## 2.7 — Three real problems hit while building this

Worth recording because they're the texture of the job, not exceptions to it.

### Vitest 4 wouldn't install

```
Error: Cannot find native binding
Cannot find module '@rolldown/binding-wasm32-wasi'
```

Vitest 4 ships **Rolldown**, a Rust-based bundler with platform-specific native
binaries, and hit a known npm optional-dependency bug on Windows.

**Fixed by pinning to Vitest 3** — mature, esbuild-based, no native binding.

> **The lesson:** newest is not a feature. A test runner's job is to be boring
> and reliable. Bleeding-edge tooling costs you debugging time on *your tools*
> instead of your product — and native binaries are the most fragile thing you
> can put in a dependency tree, because they're the one part that can't be
> "just JavaScript" everywhere.

### The coverage provider fought the runner

```
peer vitest@"4.1.10" from @vitest/coverage-v8@4.1.10
Found: vitest@3.2.7
```

`@vitest/coverage-v8` floated to v4 while the runner was pinned to v3.

> **The lesson:** **companion packages must be version-locked together.** Plugins
> that reach into a tool's internals (`@vitest/*`, `@babel/*`, ESLint plugins,
> Playwright's browsers) are not independent — a matching major is usually a hard
> requirement. When you pin one, pin the family.

### jsdom broke on your Node version

```
Error: require() of ES Module @exodus/bytes/encoding-lite.js
```

jsdom 30 depends on a package that `require()`s ESM — supported only from **Node
20.19**. You're on **20.15**, which Vitest had already warned about:
`Using NodeJS below 20.19.0`.

Fixed by pinning `jsdom@^26`.

> ⚠️ **Worth acting on:** Node 20.15 is aging within the 20.x line, and the
> ecosystem is increasingly assuming `require(esm)`. This will keep happening.
> Recommendation: move `.nvmrc` to the latest Node 20 LTS, or to 22 LTS, when
> stage 8 containerizes — Docker makes the version an explicit, tested choice
> rather than whatever is installed. I left the pin at 20.15.0 for now so your
> local environment keeps working.

**This is version pinning showing both faces in one stage:** it protects you from
drift, and it locks you to a floor that the ecosystem eventually climbs past.
Pinning is not "set and forget" — it's a commitment to periodic, deliberate
upgrades.

---

## 2.8 — Two test runners, one repo

Adding Vitest immediately broke Playwright:

```
at getWorkerState (vitest/dist/chunks/utils.js:9:9)
```

Playwright's default `testMatch` includes `**/*.test.js(x)` — **Vitest's
convention**. So Playwright collected `tests/unit/harness.test.jsx`, imported it,
and died on Vitest internals.

Fixed with an explicit convention:

```js
testMatch: '**/*.spec.js'
```

| Pattern | Runner | Environment | Location |
|---|---|---|---|
| `*.spec.js` | Playwright | real browser | `tests/e2e/` |
| `*.test.js(x)` | Vitest | node / jsdom | `tests/unit/`, `backend/tests/` |

### The transferable lesson

**When two tools share a workspace, make their boundaries explicit rather than
relying on defaults.** Defaults are chosen assuming the tool is alone. The moment
two overlap, silent collection of the wrong files produces errors that point at
one tool's internals while the actual cause is the other tool's config — which is
why this took longer to diagnose than to fix.

Same shape of problem as the dead workflow in stage 0.2: **a file being picked up
from the wrong place**, failing in a way that doesn't mention location at all.

---

# Stage 2 — summary

| Added | Purpose |
|---|---|
| `backend/app.js` — `createApp()` | app buildable without binding a port |
| `backend/tests/global-setup.js` | one in-memory replica set for the run |
| `backend/tests/setup.js` | per-file database, env ordering, data reset |
| `backend/tests/helpers/factories.js` | valid-by-default fixtures with overrides |
| `backend/tests/helpers/db.js` | seed/read helpers that bypass the API |
| `backend/tests/helpers/auth.js` | session cookies, incl. adversarial ones |
| `frontend-react/tests/unit/setup.js` | RTL cleanup, MSW lifecycle, jsdom stubs |
| `frontend-react/tests/unit/msw/*` | network mocking at the right layer |
| `vitest.config.js` ×2, `test` scripts ×2 | the runners |

**Modified:** `server.js` (now just the process), `db.service.js` (+`getDb`,
`getClient`), `logger.service.js` (inert under test), `playwright.config.js`
(`testMatch`).

### Results

| Suite | Tests | Time |
|---|---|---|
| Backend harness | **15 passed** | 645ms (+~5s mongod boot) |
| Frontend harness | **10 passed** | 239ms |
| Playwright e2e (chromium) | **18 passed** | 18.6s |

Server verified booting independently after the refactor.

### What to verify on your end

1. `cd backend && npm test` → 15 passing
2. `cd frontend-react && npm test` → 10 passing
3. `cd backend && npm run dev` → still starts and serves normally
4. `npm run test:watch` in either — this is the loop stages 3–6 live in

### The five sentences worth keeping from Stage 2

1. Importing a module should define capability, never take action — separate
   building from starting.
2. Never mock the thing whose guarantee you're testing; a mocked database tests
   your mock.
3. Reset data, preserve structure — cleanup that drops indexes makes the suite
   lie about constraints.
4. Test infrastructure is production code: if tests depend on it, test it.
5. Companion packages version-lock together, and pinning is a commitment to
   upgrade deliberately, not to never upgrade.

---

*Next: Stage 3 — the first real tests. Pricing boundaries, validation schemas,
and regex safety, using the factories built here.*

---

# Stage 3 — Backend unit tests

**263 tests. Under 300ms. No database, no network, no clock.**

Stage 2 built the machine. This stage puts the first real product code under
test, and it is deliberately the *cheapest* layer: pure functions, called
directly, with no I/O of any kind.

## 3.1 — Why the cheap layer goes first

There's a temptation to start at the top: write an end-to-end test that adds
something to a cart and checks out, because that's what a user does. It feels
like the most honest test. It's also the worst place to start, for a reason that
has nothing to do with purity.

**A test is only as useful as the size of the haystack it leaves you.**

An e2e checkout test that goes red tells you "checkout is broken." Between the
click and the failure sit a browser, a bundle, a router, Redux, axios, Express,
five middlewares, three services and MongoDB. You've learned that something in
there is wrong.

A unit test that goes red tells you `calcShipping(300)` returned 29. You've
learned which line.

Both are worth having, and stage 6 writes the e2e one. But when the same bug can
be caught at two levels, catching it lower is strictly better: faster, more
precise, and it can't be flaky, because there's nothing in it to be flaky.

The practical version of this is the **testing pyramid** — many cheap tests, few
expensive ones. The reason it's shaped that way isn't ideology. It's that the
expensive tests are the ones you eventually stop running.

> **Know this cold.** Push every assertion to the lowest level that can hold it.
> The value of a failing test is the precision of what it tells you, and
> precision is highest where the code under test is smallest.

## 3.2 — What got tested, and why those things

Five files. Choosing *what* to test is most of the skill, so here's the reasoning.

| File | Tests | Why this code |
|---|---|---|
| `schemas.test.js` | 113 | The allowlist deciding what reaches the app at all |
| `query.util.test.js` | 66 | Turns untrusted text into a database query |
| `product-query.test.js` | 49 | Search/filter/sort translation, three stages |
| `cart-pricing.test.js` | 19 | Decides what a shopper is charged |
| `validate.middleware.test.js` | 16 | The thing that *applies* the schemas |

The common thread: **every one sits on a boundary where something untrusted
becomes trusted, or where a number becomes money.** That's where to spend your
test budget. A util that formats a date does not need 66 tests. A util that
builds a Mongo query out of a URL does.

Notice what's absent: nothing tests `getByUserId`, `addItem` or `checkout`. Those
need a database, so they're stage 4. Drawing that line firmly is what keeps this
stage under 300ms.

## 3.3 — Boundary value analysis

The single most transferable technique here.

The free-delivery rule is `subtotal >= 300`. The obvious test is a ₪500 cart
getting free delivery. That test passes against `>= 300`, `> 299`, `>= 250` and a
dozen other wrong implementations. It proves almost nothing.

Bugs don't live in the middle of a range. They live at its edge, because the edge
is where a human made a decision — `>` or `>=`, inclusive or exclusive — and
where an off-by-one is invisible on reading.

So the test is three values: the boundary, and the smallest step either side.

```js
it.each([
  ['just below the threshold',  299.99, SHIPPING_FLAT_FEE],
  ['exactly at the threshold',  300,    0],
  ['just above the threshold',  300.01, 0],
])('%s: ₪%s subtotal → ₪%s delivery', ...)
```

The middle case is the one that matters. `>` instead of `>=` charges ₪29 on a
cart of exactly ₪300 — and that's the *most likely cart in the shop*, because
shoppers add items until the "free over ₪300" nudge disappears. The bug would
land squarely on the customers paying closest attention.

Same technique everywhere a limit exists: username 2/3 and 40/41, password 7/8
and 200/201, quantity 0/1 and 99/100, merge list 100/101, notes 500/501, phone
8/9 and 20/21.

> **Know this cold.** For any rule with a limit, test the limit and one step each
> side. Values in the middle of a valid range carry almost no information.

## 3.4 — Equivalence partitioning

The companion technique. You can't test every input, so you split the input space
into classes whose members should all behave the same, test one member of each,
and add the boundaries between them.

Phone numbers, for instance. Infinitely many strings, but only a handful of
*classes*:

```
accepted: 050-1234567, +972 50 123 4567, (050) 1234567, 0501234567
rejected: 050-CALL-ME, <script>alert(1)</script>, too short, too long, empty
```

Four accepted shapes because Israeli shoppers genuinely type all four, and a
regex rejecting any of them is a lost order. The script tag is in the rejected
list not because anyone expects XSS through a phone field, but because
"characters a courier can't dial" is the actual rule and it's worth stating.

The one place I deliberately *didn't* partition is `escapeRegex`. There are only
fourteen regex metacharacters, and each is a separate way to be wrong — so all
fourteen are tested individually. **When a class is small enough to enumerate,
enumerate it.**

## 3.5 — Two real bugs this codebase already had, both the same shape

The highest-value paragraph in the stage, because you will write this bug.

```js
if (filterBy.minPrice) { ... }   // wrong
if (filterBy.inStock)  { ... }   // wrong
```

In JavaScript `0` is falsy and `false` is falsy. So:

- A price slider dragged to its left end sends `minPrice=0` → read as "no filter"
  → the price filter silently vanishes.
- The in-stock toggle switched off sends `inStock=false` → read as "no filter" →
  the toggle does nothing.

Both had actually happened here. The current code guards properly:

```js
if (filterBy.minPrice !== null && filterBy.minPrice !== undefined) { ... }
```

...and it's verbose enough that someone will eventually "clean it up." So there
are now tests whose whole job is to make that cleanup go red:

```js
expect(_buildCriteria({ minPrice: 0 })).toEqual({ price: { $gte: 0 } })
expect(_buildCriteria({ inStock: false })).toEqual({ inStock: false })
```

This is also why `toNumber('')` returns `null` rather than `0`, and why
`toBoolean` has **three** return states rather than two:

| Return | Means |
|---|---|
| `true` | show only in-stock |
| `false` | include out-of-stock |
| `null` | don't filter on stock at all |

`false` and `null` are different instructions. Collapse them and the feature
breaks in a way that reads as "the toggle is broken" rather than "someone used a
falsy check."

> **Know this cold.** `0`, `''` and `false` are values, not absences. Any check
> that can't tell them from "missing" is a bug waiting for the right input.

## 3.6 — Testing behaviour, not implementation

`escapeRegex('(')` returns `'\\('`. The lazy assertion:

```js
expect(escapeRegex('(')).toBe('\\(')   // brittle
```

That breaks if someone switches to `[(]` — equally correct, now "failing." It
tests *how* rather than *what*.

What's actually asserted:

```js
expect(new RegExp(escapeRegex('(')).test('(')).toBe(true)
```

The contract is "the output matches the input literally." That's what every
caller depends on, and it survives any reimplementation keeping the promise.

Rule of thumb: **write the assertion a caller would care about.** Nobody
downstream cares that a backslash appeared. They care that the search doesn't
crash and finds the right products.

## 3.7 — Testing that something is *absent*

Most tests assert a thing happened. The security-relevant ones assert a thing
*didn't*.

Signup used to spread `req.body` into the new user document. So
`POST /api/auth/signup` with `{"isAdmin": true}` created an administrator. No
exploit, no tooling — one extra JSON field.

The fix was the schema, and the tests assert the strip rather than a rejection —
the request still succeeds, it just can't carry the field:

```js
const { success, data } = signupSchema.safeParse({ ...VALID, isAdmin: true })
expect(success).toBe(true)
expect(data).not.toHaveProperty('isAdmin')
```

Then a stronger version, which is the one worth copying:

```js
expect(Object.keys(data).sort()).toEqual(['fullname', 'password', 'username'])
```

The first form tests the fields *you thought of*. The second tests the whole
allowlist — it catches fields nobody thought to name, including ones added to the
schema next year. **When you can assert the complete set instead of a few
members, assert the set.**

The same idea one layer down is why `_buildSort` has an allowlist:

```js
const SORTABLE_FIELDS = new Set(['price', 'salePrice', /* ... */, 'name'])
```

A denylist blocks what you anticipated. An allowlist blocks everything else, by
default, forever. And why it matters is subtler than it looks: **sort order leaks
information about values you can't read.** Sorting a public product list by an
internal field tells you which documents have it and roughly how they compare —
without that field ever appearing in a response.

## 3.8 — Knowing which half of a rule your test covers

`updateUserSchema` accepts `score`. It has to — an admin adjusting a balance
posts it through this endpoint. But an ordinary shopper must not set their own.

A schema cannot make that call. **It sees the body, not who sent it.** The
authorisation check lives in the controller.

So the unit test asserts exactly its half, and says so in the name:

```js
it('declares score, which the controller gates on admin', () => {
  const { data } = updateUserSchema.safeParse({ score: 5000 })
  expect(data.score).toBe(5000)
})
```

This matters more than it sounds. A test named "score is validated" would leave
you believing the rule is covered when only half of it is — and half-covered is
worse than uncovered, because uncovered gets revisited.

The other half gets an API test in stage 4, where there's a logged-in user to
have a role.

> **Know this cold.** Name what a test covers precisely enough that the gap next
> to it stays visible. False confidence is the most expensive thing a suite can
> produce.

## 3.9 — Tests as a record of known gaps

Three tests here assert behaviour that is arguably wrong:

```js
expect(toNumber(' ')).toBe(0)                      // whitespace reads as zero
expect(calcShipping(0)).toBe(SHIPPING_FLAT_FEE)    // ₪29 on an empty cart
expect(accepts(updateStatusSchema)({ status: 'pending' })).toBe(true)
                                                   // delivered → pending allowed
```

None are fixed. Each is pinned with a comment explaining why it's tolerable today
and what would make it not.

The third is clearest: status transitions aren't validated at all, so a delivered
order can be moved back to pending. That's stage 11's state machine. Writing the
test *now* puts the gap in the suite, where it runs every day, instead of only in
a plan document nobody opens.

`calcShipping(0)` is the interesting one. It's currently unreachable —
`resolveLines` short-circuits an empty cart before calling it. So why test it?
Because **"unreachable" is a property of the caller, not of this function.** If
someone removes that short-circuit, this test is the only thing between them and
a ₪29 delivery charge on an empty basket.

## 3.10 — Making the cheap tests stay cheap

`cart.service.js` imports `dbService`. So importing it for a pricing test loads
the database module — and stage 2's cleanup hook then opened a connection for
every test file, needed or not.

Two changes:

```js
// db.service.js — loading is not connecting
function isConnected() { return dbConnPromise !== null }

// tests/setup.js — skip cleanup for files that never touched Mongo
afterEach(async () => {
  if (!dbService.isConnected()) return
  ...
})
```

And then — the part worth stealing — **a test that guards the cost**:

```js
it('never opens a database connection', () => {
  expect(dbService.isConnected()).toBe(false)
})
```

The natural next test someone adds to that file is "adding an item merges with
the existing line," which needs a real cart in Mongo. That would silently turn
the cheapest file in the suite into one of the slowest. This test fails at that
moment and says where the new test belongs.

Suites don't get slow in one commit. They get slow one reasonable-looking
addition at a time, and nobody notices until the feedback loop is gone.

## 3.11 — Tests must not read your `.env`

`config/env.js` called `dotenv.config()` unconditionally, so the suite was partly
configured by a file that isn't in git.

```js
if (process.env.NODE_ENV !== 'test') dotenv.config({ quiet: true })
```

`tests/setup.js` already sets every variable the app needs. Layering a local
`.env` on top means a test could depend on a value that exists on one machine and
nowhere else — **pass locally, fail in CI, with nothing in the diff to point at.**
Same principle as stage 0's build-output rule, wearing different clothes:

> Git holds inputs. CI produces outputs. They must never be the same thing.

A test environment that differs between two machines isn't a test environment.
It's two.

## 3.12 — The two tests I got wrong

Both worth recording, because both are the process working rather than failing.

**`escapeRegex(null)`** — I asserted `''`, reasoning that the default parameter
`str = ''` handles missing input. It returned `'null'`.

A default parameter fires **only for `undefined`**. `null` is a value; it sails
past the default into `String(null)` and comes back as the four-letter word
"null". Harmless here — the controller sends `query.txt || ''`, and a search for
"null" matches nothing — but "the default handles missing input" is a belief a
lot of JavaScript is written on, and it's only half true.

The test now pins real behaviour with the reasoning attached. **A wrong
assumption caught by a test you wrote five minutes ago is the cheapest possible
place to be wrong.**

**`it.fail` vs `it.fails`** — Playwright spells it `test.fail()`. Vitest spells it
`it.fails()`. This repo runs both, so both dialects are live at once. Second time
in three stages that two runners in one repo has cost something — the first was
`testMatch` in stage 2.

## 3.13 — BUG-003, and how it was found

Not by running anything. By reading `addItem` and asking a question:

```js
const product = await products.findOne(byIdOrSku(productId))  // resolves BOTH forms
const variantKey = _variantKey(productId, variant)            // keys off the RAW input
```

`byIdOrSku` exists because two names for one product are live simultaneously: new
URLs carry the ObjectId, and carts saved in localStorage before the migration
carry the sku. Both find the same document.

`_variantKey` then treats those two names as two different things. So the same
product, arriving by its two valid names, lands on two separate cart rows. The
resolved product — the thing that would give one correct answer — is already in
hand, one line earlier.

The question that found it: **"this function accepts two forms of the same thing —
does everything downstream know that?"**

Filed as `bugs/BUG-003`, covered by an `it.fails()` test, not fixed — per the
policy, a bug found by a test gets the test plus the report, and the fix is a
separate decision with its own diff.

Severity is honestly stated as Low–Medium: it needs a pre-migration cart to
trigger, and checkout's conditional decrement still refuses to oversell, so the
worst outcome is a confusing duplicate row and a checkout-time conflict rather
than lost stock. **Calling a low-severity bug high-severity costs you credibility
on the one that matters.**

The report also notes something that is *not* a bug: the frontend computes its
own guest-cart key with a different formula (`${id}-${size}-${color}`, yielding
`p1-M-undefined` where the server yields `p1-M`). The two never have to agree
today. It's recorded because two independent implementations of one rule is how
this bug gets written a second time.

---

# Stage 3 — summary

| Added | Tests |
|---|---|
| `backend/tests/unit/schemas.test.js` | 113 |
| `backend/tests/unit/query.util.test.js` | 66 |
| `backend/tests/unit/product-query.test.js` | 49 |
| `backend/tests/unit/cart-pricing.test.js` | 19 |
| `backend/tests/unit/validate.middleware.test.js` | 16 |
| `bugs/BUG-003-cart-line-key-not-normalized.md` | — |

**Modified — production code, all additive:**

| File | Change | Risk |
|---|---|---|
| `cart.service.js` | `export` on `calcShipping`, `_variantKey` | none — no call site changed |
| `product.service.js` | `export` on `_buildCriteria`, `_buildSort`, `_buildSearchText` | none |
| `product.controller.js` | `export` on `buildFilter` | none |
| `db.service.js` | added `isConnected()` | none — new function |
| `config/env.js` | skip `dotenv` under `NODE_ENV=test`, `quiet: true` | dev/prod path unchanged, verified |
| `tests/setup.js` | skip DB cleanup when never connected | test-only |

The exports are the one thing worth a second look. Testing a private function
means either exporting it or reaching through the public API — and the third
option here (extracting pricing into its own module) is a real refactor with real
risk for no behavioural gain. Adding `export` changes nothing at any call site
and leaves the underscore prefix as the "internal" signal. Flagged because it's a
judgement call, not an obvious one.

### Results

```
 ✓ tests/unit/cart-pricing.test.js         (19 tests)  29ms
 ✓ tests/unit/query.util.test.js           (66 tests)  70ms
 ✓ tests/unit/product-query.test.js        (49 tests)  29ms
 ✓ tests/unit/validate.middleware.test.js  (16 tests)  34ms
 ✓ tests/unit/schemas.test.js             (113 tests) 131ms
 ✓ tests/helpers.test.js                   (15 tests) 665ms

 Test Files  6 passed (6)
      Tests  278 passed (278)
```

Server verified booting after the `config/env.js` change, and `config.dbURL`
confirmed still resolving from `.env` outside test mode.

### What to verify on your end

1. `cd backend && npm test` → 278 passing
2. `cd backend && npm run dev` → still starts, still connects to Atlas
3. `cd backend && npm run seed` → still reads `.env` (unchanged outside test mode)
4. `npm run test:watch` → sub-second on save; the loop for stages 4–6

### Flagged, not changed

- `auth.service.js:63` and `socket.service.js:102,106` use `console.log` directly
  instead of the logger, bypassing log levels — they won't be structured in stage
  9's observability work.
- `addItemSchema` rejects `quantity: "2"` (string) rather than coercing. Correct,
  but React inputs return strings, so any component forwarding an input value
  straight to the API gets a 400. Pinned in a test so the failure is recognisable.
- Node 20.15 still pinned; Vite now warns `Using NodeJS below 20.19.0` on every
  run. Stage 8 is the right place to move to a current LTS.

### The five sentences worth keeping from Stage 3

1. Push every assertion to the lowest level that can hold it — the value of a red
   test is the precision of what it tells you.
2. Bugs live at boundaries; test the limit and one step each side, and skip the
   middle of the range.
3. `0`, `''` and `false` are values, not absences — any check that can't tell them
   from "missing" is a bug waiting for the right input.
4. Assert the whole allowlist, not the few fields you thought an attacker would
   try.
5. Name what a test covers precisely enough that the gap beside it stays visible —
   false confidence costs more than no coverage.

---

# Stage 4 — API integration tests

92 new tests across six files, taking the backend suite from 278 to 370. Every
one drives a real HTTP request through the real Express app against a real
MongoDB. Nothing is mocked.

## 4.1 — What an integration test is actually for

A unit test asks "does this function return the right value". An integration
test asks a different question: **"if a stranger sends this request, what
happens to my data?"**

That difference matters because most of the things that hurt a shop are not
wrong return values. They are a request that should have been refused and
wasn't, a price the client got to choose, a row that changed owner. None of
those live inside a single function — they live in the seam between the router,
the middleware, the controller and the database. Only a test that goes in
through the front door can see them.

The tool is `supertest`. It hands a request straight to the Express app object
in memory, so there is no port to open, no server to start, no race between
"is it listening yet" and "send the request". The app cannot tell the
difference:

```js
const app = createApp({ enableRateLimit: false })

const res = await request(app).post('/api/cart/item').send({ productId, quantity: 2 })
```

Every test in this stage follows the same three beats, and it is worth naming
them because interviewers ask:

- **Arrange** — put the world in a known state (seed a product, seed a user)
- **Act** — one request, the thing under test
- **Assert** — check the response *and*, where it matters, check the database

## 4.2 — Seeding the database directly instead of through the API

The cart tests need a product to exist. They create it by inserting it into
Mongo, not by calling `POST /api/product`.

That looks like a shortcut and it is the opposite. If the setup went through
the API, then every cart test would silently also be a test of product
creation — and the day product creation breaks, forty cart tests turn red and
none of them are about the cart. A failing test is only useful if its name
tells you where to look, and setup-by-API destroys that property.

Rule of thumb: **arrange by the shortest path that isn't the thing you're
testing.**

## 4.3 — The authorization matrix

The single most transferable pattern in this stage. Take one endpoint and send
the *same request* as three different callers:

| Caller | Expected |
|---|---|
| Signed out | 401 |
| Signed-in normal user | 403 |
| Admin | 200 |

401 and 403 are not interchangeable, and the distinction is worth memorising:
**401 means "I don't know who you are." 403 means "I know exactly who you are,
and no."** An endpoint returning 401 to a signed-in user is telling them to log
in again, which they cannot fix.

The reason all three rows have to exist: a completely broken endpoint — one
that returns 500 to everybody, or has been commented out — passes both negative
tests. Refusals alone prove nothing. Only the positive row proves the endpoint
still does its job, and only the negatives prove it does it for the right
people.

```js
const NEW_PRODUCT = { name: 'Sneaky Product', price: 1 }
// signed out  → 401, and countDocuments('products') === 0
// normal user → 403, and countDocuments('products') === 0
// admin       → 200, and the saved doc's owner is the admin
```

## 4.4 — Assert on the state, not only on the status code

Notice the `countDocuments` in every row above. That is deliberate, and it is
the habit that separates a test suite from a smoke alarm.

A status code is what the server *said*. The database is what the server
*did*. They can disagree: an endpoint that returns 403 and writes the row
anyway is a real bug, it is exactly the kind that survives for years, and a
test that stops at `expect(res.status).toBe(403)` will never see it.

So every refusal in this stage also asks the database whether anything changed.
It costs one line.

Same idea, other direction: signup asserts `isAdmin` is false **on the stored
document**, not on the response body. A response that hides the field while the
row has it is the worst possible outcome — invisible and permanent.

## 4.5 — Attacks the tests actually perform

These are not hypotheticals; each one is a real request in the suite.

**Mass assignment / privilege escalation.** `POST /api/auth/signup` with an
extra `isAdmin: true` field. This codebase used to spread the request body into
the new user document, so that one extra key created an administrator. No
tooling, no exploit. Two independent defences stop it now — the Zod schema
doesn't declare `isAdmin` so it is stripped, and the service hardcodes `false`
rather than reading the caller's value. The test doesn't care which one caught
it; it asserts the outcome.

**NoSQL injection.** `{"username": {"$ne": null}}` as a login body. If that
reached the query unchanged it would mean "any user whose username is not
null", matching the first account in the collection and signing the attacker in
as them without knowing a single username. Zod requires a string, so it returns
400 — malformed, not merely wrong.

**User enumeration.** Wrong-password and no-such-user must be
indistinguishable, or an attacker can feed in a list of email addresses and
learn which ones have accounts here. The assertion is that the two responses
equal *each other* — which is the actual requirement — rather than that each
matches some fixed string:

```js
expect(wrongPassword.body).toEqual(noSuchUser.body)
```

**IDOR — insecure direct object reference.** Bob sends `PUT` to Alice's cart
line id. A real, existing id; the wrong owner. Expect 404, and then verify
Alice's quantity is unchanged. This is the flaw behind a large share of real
data breaches, and it is trivially cheap to test.

**Client-supplied price.** The cart tests post a product with `price: 0.01`
attached. The server must ignore it and read the catalogue. Asserted on both
the response and the stored document.

## 4.6 — Carts and orders are opposites, and the tests say so

A cart **re-prices from the catalogue on every read**. An order is a **frozen
snapshot** of what was charged.

Both behaviours are tested by changing the catalogue price *after* the fact:

- put an item in a cart, then apply a sale → the cart shows the new price
- check out, then change the price → the order still says ₪120

Get this backwards and you either charge people yesterday's price forever, or
you rewrite financial history every time marketing runs a promotion.

## 4.7 — The headline test: two shoppers, one last unit

One unit in stock. Two shoppers check out at the same instant.

```js
const [first, second] = await Promise.all([checkout(alice), checkout(bob)])

expect([first.status, second.status].sort()).toEqual([201, 409])

const after = await findProduct({ _id: product._id })
expect(after.stockQty).toBe(0)
expect(after.inStock).toBe(false)
expect(await findOrders()).toHaveLength(1)
```

Two details in there are the whole lesson.

**It asserts that exactly one won, not which one.** Who wins a race is timing;
asserting it would make the test flaky. "Exactly one succeeded" is the real
requirement, so that is what it says.

**409 Conflict, not 400.** 400 means "your request was malformed" — it wasn't;
it was perfectly well formed and would have worked a millisecond earlier. 409
means "the state of the world changed under you", which is exactly true, and it
tells the frontend to re-fetch and retry rather than to show a validation error.

## 4.8 — Proving the concurrency test has teeth

**A test that has never failed has not been shown to test anything.** A test
asserting `[201, 409]` against a broken server would just... also pass, if the
server happened to be slow enough. So it has to be seen failing.

The intended method — temporarily replace the atomic stock decrement with a
naive read-then-write and watch the test go red — was blocked by the sandbox.
Rather than work around it, the same thing was proved with a throwaway file
that implemented both algorithms against the same in-memory Mongo:

```
NAIVE  -> results: [ true, true  ]  final stockQty: -1   ← sold one item twice
ATOMIC -> results: [ true, false ]  final stockQty:  0
```

That `-1` is the bug in its natural habitat. Read-then-write: both requests
read `stockQty: 1`, both pass the check, both decrement. Two customers promised
the same item, nothing errors, nobody finds out until the warehouse does.

The fix is to put the check *inside* the update's filter, so check-and-write
become one indivisible operation that MongoDB, not JavaScript, guarantees:

```js
updateOne(
  { _id, stockQty: { $gte: qty }, inStock: true },
  { $inc: { stockQty: -qty } }
)
```

Throwaway deleted. The honest limitation is written into the test file as a
comment: **a concurrency test cannot prove correctness, it can only fail to
disprove it.** It ran, the race was real, the guard held. That is the most any
such test offers.

A heavier variant follows it — 5 shoppers, 3 units, expecting 3×201 and 2×409,
with `stockQty` landing at exactly 0 and never below.

## 4.9 — Compensating rollback

Checkout with a two-line cart where line 1 is available and line 2 is not. The
first decrement has already happened by the time the second fails.

The test asserts line 1's stock is back to 10 and that zero orders exist. This
is what "compensating rollback" means: without a transaction, you undo by hand
what you already did. Stage 10 was to replace this with a real MongoDB
transaction — which is why the test environment boots a single-node **replica
set** rather than a standalone mongod, since transactions require one.

## 4.10 — The mistake worth more than the tests

The rate-limit test file opened with a long comment explaining that the limiter
counts failures in module-scope memory, so tripping it on purpose exhausts the
budget for everything after it. Then a second test went in the same file. It
failed:

```
expected 429 to be 200
```

The warning was written first and violated one function later, which is a fair
illustration of how easily shared mutable state defeats good intentions.

The tempting fix is to reorder the tests so the harmless one runs first. **That
is the worse fix.** It makes the suite pass in exactly one order, which is how
a test becomes flaky the moment anything is parallelised, filtered or retried —
and order-dependent suites fail at 2am in CI, never on your machine.

The real fix is isolation. Vitest gives each test file a fresh module registry,
so a separate file gets a separate counter. Hence two files:
`auth-ratelimit.api.test.js` (trips it) and
`auth-ratelimit-success.api.test.js` (proves successful logins are *not*
counted — `skipSuccessfulRequests`, which matters because everyone behind one
office IP or one carrier NAT shares a budget).

Both halves are needed. **A limiter that blocks attackers is only half a
working limiter; the forgotten half is that it must not block real people.**

# Stage 4 — summary

| Added | Tests |
|---|---|
| `backend/tests/api/product.api.test.js` | 18 |
| `backend/tests/api/cart.api.test.js` | 35 |
| `backend/tests/api/order.api.test.js` | 24 |
| `backend/tests/api/auth.api.test.js` | 13 |
| `backend/tests/api/auth-ratelimit.api.test.js` | 1 |
| `backend/tests/api/auth-ratelimit-success.api.test.js` | 1 |

No production code was modified in this stage.

### Results

```
 Test Files  12 passed (12)
      Tests  370 passed (370)
   Duration  ~30s
```

### Not covered

`user`, `review` and `wishlist` routes have no API tests. They are lower-stakes
than money and permissions, and the patterns above transfer directly — good
candidates to write by hand.

### The five sentences worth keeping from Stage 4

1. An integration test asks what happens to your *data* when a stranger sends a
   request, not what a function returns.
2. Arrange by the shortest path that isn't the thing you're testing, or a
   failure elsewhere turns forty unrelated tests red.
3. Assert on the database, not only the status code — what the server said and
   what the server did can disagree.
4. Send the same request as three callers; refusals alone prove nothing,
   because a completely broken endpoint refuses everybody.
5. Fixing a flaky test by reordering it is not a fix — it trades a visible
   failure for an invisible dependency on run order.

---

# Stage 7 — Continuous integration

One file changed: `.github/workflows/ci-cd.yml`.

## 7.1 — What was already there, and what was wrong with it

The repo already had a working pipeline: three Playwright jobs (`smoke`,
`regression`, `untagged`), then `build`, then `deploy` to GitHub Pages.

It had one hole, and it was a big one. **All 370 backend tests never ran.** The
workflow only ever entered `frontend-react/`. Worse, `build` and `deploy` were
gated on the browser tests alone — so a change that broke checkout, or removed
the oversell guard, would deploy cleanly as long as the storefront still
rendered.

A test suite that isn't wired into CI is a suite that runs when someone
remembers to run it. That is not a safety net; it is a hobby.

## 7.2 — What was added

Two jobs, at the top of the file because they are the cheap tier:

- **`backend-tests`** — `npm ci && npm test` inside `backend/`. 370 tests.
- **`frontend-unit`** — `npm ci && npm test` inside `frontend-react/`. 10
  tests, Vitest in jsdom. Grows in stage 5.

And one line that matters more than either:

```yaml
needs: [backend-tests, frontend-unit, smoke, untagged]
```

`needs` is the gate. Every job listed must go green before `build` starts, and
if any one fails the build is skipped. A broken backend can no longer reach
production because the browser tests happened to pass.

`regression` is deliberately absent from that list. It only runs on pull
requests, and in GitHub Actions a job that never ran does **not** satisfy a
`needs` — listing it would block every deploy permanently. This is a genuinely
easy trap: the dependency looks harmless and the symptom is "deploys just stop
happening" with no error anywhere.

## 7.3 — Why the mongod binary is cached

The backend tests boot a real MongoDB in memory, which means
`mongodb-memory-server` fetches a ~70MB `mongod` binary on first use. Left
alone, that is a minute added to every run and a pipeline that fails whenever
the download host has a bad day — a CI job depending on a third-party download
is a CI job that goes red for reasons that have nothing to do with the code.

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/mongodb-binaries
    key: mongodb-binaries-${{ runner.os }}-${{ hashFiles('backend/package-lock.json') }}
    restore-keys: mongodb-binaries-${{ runner.os }}-
```

The key is derived from the lockfile, so bumping the library changes the key
and a stale binary can never be silently reused. `restore-keys` is the partial
fallback: if the exact key misses, take the most recent older cache rather than
starting from nothing.

## 7.4 — `npm ci`, not `npm install`

`npm ci` installs exactly what the lockfile says and errors if `package.json`
and the lockfile disagree. `npm install` will quietly resolve newer versions to
satisfy the ranges — which is how CI ends up testing a dependency tree that
exists on no developer's machine, and how "works locally, fails in CI" becomes
a permanent condition. Every install step in this workflow uses `ci`.

Each job also declares `cache-dependency-path` pointing at *its own* lockfile.
`backend/` and `frontend-react/` are separate projects with separate trees;
sharing one cache key between them would serve the wrong `node_modules`.

## 7.5 — No secrets, and why that's a design property

`backend-tests` needs no `.env`, no database URL and no `SECRET`. That is not
luck — `tests/setup.js` sets `MONGO_URL`, `DB_NAME`, `SECRET` and
`CORS_ORIGINS` itself, and `config/env.js` skips loading `.env` when
`NODE_ENV=test` (which Vitest sets automatically).

The consequence: **CI runs the exact same code path a developer runs locally.**
There is no CI-only branch that can rot, and no secret to leak into a log. A
suite that needs credentials to run is a suite that will eventually only run in
one place.

# Stage 7 — summary

| Changed | What |
|---|---|
| `.github/workflows/ci-cd.yml` | added `backend-tests` and `frontend-unit`; gated `build` on both |

### What to verify on your end

1. Push to any branch → 5 jobs appear in the Actions tab; `backend-tests` shows
   370 passing.
2. Break a backend test on purpose, push → `backend-tests` red, `build`
   **skipped**, nothing deploys. Then revert.
3. Second push → `backend-tests` runs noticeably faster; the cache step reports
   a hit.

### Flagged, not changed

- The three Playwright jobs each run `npm ci` and
  `npx playwright install --with-deps` separately — roughly two minutes of
  duplicated setup per job. They run in parallel so wall-clock is barely
  affected, and consolidating them means restructuring a pipeline that
  currently works. Left alone deliberately.
- No workflow-level `concurrency` group, so pushing three times in a row runs
  three full pipelines. The obvious fix (`cancel-in-progress`) is risky here
  because `deploy` must never be cancelled mid-flight; a correct version would
  need `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`.
- `node-version: 20` resolves to the latest 20.x, while `.nvmrc` pins 20.15.0 —
  two sources of truth. Switching CI to `node-version-file: .nvmrc` would unify
  them but pins CI to a version Vite already warns about. Worth doing alongside
  a Node upgrade, not before.
- Coverage is collected but no threshold is enforced. Setting one before the
  suite is mature just blocks work.

### The five sentences worth keeping from Stage 7

1. A test suite not wired into CI is a suite that runs when someone remembers
   to run it.
2. `needs` is the gate — without it, tests are decoration and the deploy
   happens regardless.
3. A job that never ran does not satisfy a `needs`; depending on a conditional
   job silently freezes deploys forever.
4. `npm ci` pins CI to the lockfile; `npm install` lets CI test a dependency
   tree nobody has.
5. If a test suite needs secrets to run, it will eventually only run in one
   place — design the setup to supply its own.

---

*Next: Stage 5 — frontend component tests, and Stage 6 — E2E against the real
built bundle with a real server and a real database.*
