// @ts-check
import { defineConfig } from '@playwright/test'

/**
 * Playwright, in API mode.
 *
 * ── Yes, Playwright does APIs ─────────────────────────────────────────────
 * Playwright is usually described as a browser automation tool, and most job
 * postings list it that way. It also ships a `request` fixture that speaks
 * plain HTTP with no browser involved — so an entire API suite can live in the
 * same runner, the same report and the same CI job as the browser suite.
 * Plenty of teams run it exactly like this.
 *
 * ── Why a separate config file rather than a project in the main one ──────
 * A `projects: []` entry in playwright.config.js would be the more idiomatic
 * arrangement and would give one merged HTML report.
 *
 * It was not done that way on purpose. The main config already drives three
 * browsers and three green CI jobs, and adding a project there changes what
 * every existing `npx playwright test` invocation collects — including the
 * three `--grep` commands in the workflow. A separate file cannot affect any
 * of them: the browser suite runs exactly as it did before this file existed.
 *
 * The cost is two HTML reports instead of one, and remembering `--config` when
 * running the API suite. That is the cheaper side of the trade while the
 * browser pipeline is the thing that must not break.
 *
 * ── Run it ────────────────────────────────────────────────────────────────
 *   npm run test:api
 */
export default defineConfig({
  testDir: './tests/api',

  /* Same naming rule as the browser suite: *.spec.js is Playwright's,
     *.test.js is Vitest's. Both runners live in this repo and collecting each
     other's files produces opaque import errors rather than useful ones. */
  testMatch: '**/*.spec.js',

  /**
   * Sequential, deliberately.
   *
   * These tests share one database and one server process. Two workers
   * checking out the last unit of the same product at once would produce a
   * genuine 409 — correct behaviour, reported as a test failure. Parallelism
   * here would buy a couple of seconds and cost reliability, which is the
   * wrong way round: a suite people do not trust gets ignored, and an ignored
   * suite is worth less than no suite.
   */
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: [['html', { outputFolder: 'playwright-report-api', open: 'never' }]],

  use: {
    /**
     * 3031, not 3030.
     *
     * 3030 is the dev server, and the dev server talks to Atlas — the real
     * database. A destructive API suite that found it there would create
     * orders and decrement stock against live data. The separate port makes
     * that collision impossible rather than merely unlikely; see the note at
     * the top of backend/scripts/test-server.js for the near-miss that
     * prompted it.
     */
    baseURL: 'http://localhost:3031',

    /* Attach the request and response bodies to the report for any test that
       fails. An API failure is almost always explained by the payload, and
       without this the report says "expected 200, got 400" and leaves you to
       reproduce it by hand. */
    trace: 'retain-on-failure',

    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },

  /**
   * Boots the backend against a throwaway in-memory MongoDB and waits for the
   * port before the first test runs. See backend/scripts/test-server.js for
   * why it is not simply `npm run dev`.
   *
   * `reuseExistingServer` is off even locally. The database is seeded by the
   * tests themselves, so reusing a server left over from a previous run would
   * mean starting on top of the previous run's data — the classic source of
   * "passes the first time, fails the second".
   */
  webServer: {
    command: 'npm run test:server',
    cwd: '../backend',
    url: 'http://localhost:3031/api/product',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
  },
})
