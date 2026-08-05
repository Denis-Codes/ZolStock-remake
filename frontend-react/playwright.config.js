// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  /* Scoped to tests/e2e, not ./tests.
   *
   * This directory is the LOCAL-MODE browser suite: it runs against the Vite
   * dev server with VITE_LOCAL forcing the catalogue to come from src/data,
   * and there is no backend anywhere in the picture. That is deliberate — the
   * GitHub Pages deployment is built with `--mode github`, which hardcodes
   * local mode, so these tests exercise exactly what ships there.
   *
   * Two sibling suites now live under tests/ and need a real server:
   *
   *   tests/api/        -> playwright.api.config.js       (:3031, no browser)
   *   tests/fullstack/  -> playwright.fullstack.config.js (:3031, real bundle)
   *
   * With `testDir: './tests'` this config collected those too and ran them
   * against :5173 in local mode, where the API they need does not exist. The
   * narrower path is what keeps the three suites from running each other's
   * tests. */
  testDir: './tests/e2e',

  /* Two test runners share this repo, so they need file conventions that do
     not overlap. Playwright's default testMatch also picks up `*.test.js(x)`,
     which is Vitest's convention — so without this it collects
     tests/unit/*.test.jsx and those files fail on import with an opaque Vitest
     internal error rather than anything meaningful.

       *.spec.js   -> Playwright (browser, tests/e2e)
       *.test.js   -> Vitest     (node/jsdom, tests/unit)

     tests/pages and tests/utils hold page objects and helpers rather than
     tests, so neither runner should collect them — the naming rule covers
     that too. */
  testMatch: '**/*.spec.js',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Global safety net: caps every action (click, fill, etc.) and every
       navigation at 30s. Without this, a single hung page (e.g. a
       third-party script that never resolves — see BUG-002) can block a
       test indefinitely, relying only on the outer CI job timeout to ever
       notice — which wastes the whole job's time budget on one hang. */
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});