// @ts-check
import { defineConfig, devices } from '@playwright/test'

/**
 * Full-stack E2E: the real built bundle, a real server, a real database.
 *
 * ── What makes this different from playwright.config.js ──────────────────
 * The default browser suite runs `npm run dev` — the Vite dev server, with
 * VITE_LOCAL forcing the app to read its catalogue from src/data instead of an
 * API. That suite is not a mistake and it is not being replaced: the GitHub
 * Pages deployment is built with `--mode github`, which hardcodes local mode,
 * so those tests exercise exactly what ships to Pages.
 *
 * This config tests the OTHER deployment shape — the one where a Node server
 * serves the SPA and the API together:
 *
 *   npm run build:e2e   →  frontend built into backend/public
 *   test-server.js      →  Express serves that bundle AND /api, on :3031
 *   in-memory MongoDB   →  a real database, thrown away afterwards
 *
 * So the browser loads the same minified, bundled artifact a deploy would
 * produce, and every request it makes is answered by a real backend. Nothing
 * is stubbed anywhere in the chain.
 *
 * ── Why this is worth having ─────────────────────────────────────────────
 * Everything below this layer tests a piece in isolation. Only this layer can
 * catch the failures that live BETWEEN the pieces:
 *
 *   - the production build breaking something that works in dev (a dependency
 *     that only tree-shakes wrong when minified is the classic)
 *   - a session cookie the browser refuses because of SameSite or Secure
 *   - the SPA catch-all not returning index.html for a deep link, so a shared
 *     product URL 404s on refresh
 *   - the frontend and backend disagreeing about a response shape — exactly
 *     the mismatch that cost two rounds in the API spec
 *
 * ── Same origin, and why that matters ────────────────────────────────────
 * The built bundle calls `/api/` as a RELATIVE path (http.service.js switches
 * to it when NODE_ENV is production, which vite build sets). Serving the SPA
 * from the same Express app means there is no cross-origin request at all —
 * no CORS, no port juggling, and no production code changed to make testing
 * possible. That last part matters: a test setup that requires editing the app
 * is testing a variant of the app.
 *
 * ── Run it ───────────────────────────────────────────────────────────────
 *   npm run test:fullstack        (builds, then runs)
 */
export default defineConfig({
  testDir: './tests/fullstack',
  testMatch: '**/*.spec.js',

  /**
   * Sequential, like the API suite and for the same reason: one server, one
   * database, shared state. Two workers checking out at once would produce
   * genuine conflicts reported as test failures.
   */
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: [['html', { outputFolder: 'playwright-report-fullstack', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3031',

    /* A trace is a step-by-step recording — DOM snapshots, network, console —
       replayable with `npx playwright show-trace`. Kept only for failures,
       because they are large and a green run has nothing to explain. This is
       the single most useful thing for debugging a CI failure you cannot
       reproduce locally. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  /* One browser, not three. The default suite already covers Chromium,
     Firefox and WebKit for rendering differences; what this config adds is
     the real backend, and that behaves identically whichever engine asks. */
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /**
   * The bundle is NOT built here — `npm run test:fullstack` builds it first.
   *
   * Playwright starts webServer before anything else it controls, so a build
   * chained into this command would run inside the readiness timeout and any
   * build error would surface as "server failed to start". Building first,
   * outside Playwright, means a broken build fails as a broken build.
   */
  webServer: {
    command: 'npm run test:server',
    cwd: '../backend',
    url: 'http://localhost:3031/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
  },
})
