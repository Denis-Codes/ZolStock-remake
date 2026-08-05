# BUG-002 — The map could hang indefinitely with no fallback

| | |
|---|---|
| **Status** | **Resolved** — root cause removed in Stage 0.5 |
| **Severity** | Medium (was) |
| **Area** | Frontend — branch locator |
| **Referenced by** | `frontend-react/tests/e2e/branches.spec.js` (`@smoke`) |

## Symptom

The branch map could sit unresolved forever. If the Google Maps script was slow,
blocked, rate-limited, or the API key was missing, `useJsApiLoader` never
resolved `isLoaded` and the component stayed on its loading state with no
timeout. In CI, a single hung page could consume the whole job's time budget.

## Original cause

`MapsCmp.jsx` depended on an **external script** fetched at runtime from Google's
CDN. That created a failure mode the app could not recover from on its own:

- The script is a third-party network dependency with no timeout.
- `useJsApiLoader` exposes `loadError`, but only for outright failures — a
  request that hangs rather than fails never resolves either way.
- A missing key produced the same silent stall.

## Why it is now resolved

Stage 0.5 replaced Google Maps with **Leaflet + OpenStreetMap**. Leaflet is
bundled with the app rather than fetched at runtime, so:

- There is no external script to hang on. The map renders on first paint.
- Tiles are images. A slow or failed tile degrades to a grey square; it cannot
  block the component from mounting.
- Genuine tile failure is now detectable — the component listens for `tileerror`
  and `tileload`, and shows the authored `.map-fallback` once several tiles have
  errored with none succeeding.

The failure mode that made an unbounded hang possible no longer exists.

## Follow-up (not done, deliberately)

`branches.spec.js` still bounds the map assertion at 60 seconds:

```js
await expect(branchesPage.map).toBeVisible({ timeout: 60_000 });
```

That generous timeout was a guard against this bug. It can now come down to the
default, which would make a genuine regression fail fast instead of slowly.

Left unchanged for now because test changes belong in the test stages (3–6), not
in a dependency swap — keeping this stage's diff limited to the map itself. The
current timeout is harmless: it is a ceiling, not a delay, so a passing test
still completes immediately.
