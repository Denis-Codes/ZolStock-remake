import { randomUUID } from 'crypto'
import { inject, afterEach, afterAll } from 'vitest'

/**
 * Per-test-file setup. Runs in the worker, BEFORE the test file is imported —
 * which is the only reason this works at all.
 *
 * config/dev.js reads process.env.MONGO_URL when the module is first
 * evaluated, not when it is used. So the environment has to be correct before
 * anything imports config, and a setup file is the one hook that runs early
 * enough. (This is also why vitest.config.js sets `isolate: true`: without a
 * fresh module registry per file, only the first file's values would apply.)
 */
const uri = inject('mongoUri')

// ── Isolation strategy ──────────────────────────────────────────────────
// Vitest runs test files in parallel workers. Three options:
//
//   1. One mongod per file          — bulletproof, but seconds of boot per file
//   2. One mongod, one DB per file  — parallel-safe, boots once      ← chosen
//   3. One mongod, one shared DB    — fastest, but files corrupt each other
//
// (2) buys real isolation for the price of a database name. Mongo creates
// databases lazily, so an unused name costs nothing.
const dbName = `test_${randomUUID().replace(/-/g, '')}`

process.env.NODE_ENV = 'test'
process.env.MONGO_URL = uri
process.env.DB_NAME = dbName

// Deterministic secret. Without it, auth.service.js falls back to its
// hardcoded default and the tests would quietly validate the very fallback
// stage 1 is meant to remove.
process.env.SECRET = 'test-secret-not-used-anywhere-real'

// Not read in test mode, but set so nothing reads an empty allowlist and
// behaves differently than it would in dev.
process.env.CORS_ORIGINS = 'http://localhost:5173'

/**
 * Wipes every document between tests, keeping the database and its indexes.
 *
 * Dropping the whole database instead would also drop the unique index on
 * users.username that user.service.js creates on first insert — so a later
 * test could insert a duplicate username and pass, while production would
 * reject it. Deleting documents keeps the schema and clears the state.
 */
// Both hooks bail out when the test file never opened a connection. Pure unit
// test files (query.util, schemas, pricing) import nothing that touches Mongo,
// and without this guard the cleanup would open a client for them anyway —
// turning a 2ms test file into a connection round-trip per test.
afterEach(async () => {
  const { dbService } = await import('../services/db.service.js')
  if (!dbService.isConnected()) return

  const db = await dbService.getDb()
  const collections = await db.collections()
  await Promise.all(collections.map(c => c.deleteMany({})))
})

afterAll(async () => {
  const { dbService } = await import('../services/db.service.js')
  if (!dbService.isConnected()) return
  await dbService.close()
})
