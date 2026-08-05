# BUG-002 — The map could hang indefinitely with no fallback

| | |
|---|---|
| **Status** | **FIXED** — root cause removed in Stage 0.5, follow-up now closed |
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

## Follow-up — now done

`branches.spec.js` bounded the map assertion at 60 seconds:

```js
await expect(branchesPage.map).toBeVisible({ timeout: 60_000 });
```

That generous timeout was a guard against this bug, deliberately left in place
at the time so the dependency swap's diff stayed limited to the map itself.

It has now come down to the default:

```js
await expect(branchesPage.map).toBeVisible();
```

**Why this is a real improvement and not just tidying.** The old ceiling was
harmless to a passing run — a timeout is a limit, not a delay, so a green test
always finished immediately. What it cost was *diagnosis on failure*. With
Leaflet bundled, a map that has not rendered after five seconds is a
regression, not a slow network; waiting another 55 seconds to say so tells
nobody anything and turns one broken test into a minute of CI.

A timeout is an assertion about how long something should legitimately take.
When the reason for a generous one is removed, leaving it behind quietly
weakens the suite.

Verified: all four `branches.spec.js` tests pass in chromium, the map assertion
completing well inside the default.
