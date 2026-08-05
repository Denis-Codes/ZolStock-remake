// Side-effect module: loads .env into process.env.
//
// This exists as its own file because ES module imports are hoisted and
// evaluated before any statement in the importing module. Calling
// dotenv.config() at the top of index.js would run *after* dev.js/prod.js had
// already read process.env and captured undefined. Importing this first
// guarantees the variables are in place before any config is evaluated.
import dotenv from 'dotenv'

// Tests never read .env.
//
// tests/setup.js sets every variable the app needs before this module is ever
// imported. Letting dotenv layer the developer's local .env on top would mean
// the suite is partly configured by a file that is not in git — so a test could
// depend on a value that exists on one machine and nowhere else, pass locally,
// and fail in CI with nothing to point at. Skipping it here makes the test
// environment identical everywhere.
//
// `quiet` suppresses dotenv v17's startup banner, which otherwise prints once
// per process and once per test file.
if (process.env.NODE_ENV !== 'test') dotenv.config({ quiet: true })
