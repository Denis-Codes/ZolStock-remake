import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',

    // Runs ONCE for the whole suite: boots a single in-memory MongoDB replica
    // set and hands its URI to every worker. Booting one per test file would
    // cost seconds each; booting one for everything costs it once.
    globalSetup: ['./tests/global-setup.js'],

    // Runs before EACH test file, in that file's own worker: points the app at
    // a database name unique to this file, then clears it between tests.
    setupFiles: ['./tests/setup.js'],

    // Each test file gets a fresh module registry. This matters here more than
    // usual: config/index.js reads process.env at import time, so without
    // isolation the second test file would inherit the first file's database
    // name and the two would tread on each other.
    isolate: true,

    // mongodb-memory-server downloads a real mongod binary the first time it
    // runs. That download happens inside globalSetup, so the default 10s
    // hook timeout is not enough on a cold machine or a cold CI cache.
    hookTimeout: 120_000,
    testTimeout: 20_000,

    include: ['tests/**/*.test.js'],

    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      // Reported, never enforced yet. A threshold set before the suite exists
      // just blocks work; stage 7 ratchets it up from the real number.
      reporter: ['text-summary', 'html', 'lcov'],
      include: ['api/**/*.js', 'services/**/*.js', 'middlewares/**/*.js'],
    },
  },
})
