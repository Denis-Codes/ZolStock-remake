import http from 'http'

import { MongoMemoryReplSet } from 'mongodb-memory-server'

/**
 * A real, listening backend on a real port, backed by a throwaway database.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The Vitest API tests hand requests straight to the Express app object with
 * supertest — no port, no sockets, in-process. That is the right trade for 370
 * fast tests, but it means those tests never exercise the parts of the stack
 * that only exist once something is actually listening: the HTTP server, real
 * TCP connections, real cookie handling across requests, CORS preflight.
 *
 * Playwright talks HTTP over a socket like any other client, so it needs a
 * server on a port. This script is that server.
 *
 * ── Why not just run the normal dev server ────────────────────────────────
 * `npm run dev` reads .env and connects to Atlas — the real, shared, populated
 * database. Pointing a destructive test suite at it would be a genuinely bad
 * afternoon: these tests create orders, decrement stock and register users.
 *
 * So this boots the same in-memory MongoDB the Vitest suite uses. It exists
 * only while the process runs and vanishes with it. Nothing to clean up,
 * nothing to pollute, no credentials required — which also means CI can run it
 * with no secrets configured.
 *
 * ── Why the env is set HERE, before any import of the app ─────────────────
 * config/dev.js reads process.env.MONGO_URL at module-evaluation time, not at
 * use time. So the app must not be imported until the URI exists. That is why
 * createApp is pulled in with a dynamic `await import()` further down rather
 * than a static import at the top of the file — a static import would be
 * hoisted above this code and read an empty environment.
 */
/**
 * 3031, NOT 3030 — and this is not a cosmetic choice.
 *
 * 3030 is the dev server's port, and the dev server is connected to Atlas: the
 * real, shared, populated database. If this script and a running `npm run dev`
 * ever competed for the same port, the API suite would find *something*
 * listening and start creating orders and decrementing stock against
 * production data.
 *
 * That is not hypothetical. It happened while this file was being written: the
 * dev server held 3030, this process died on EADDRINUSE, and the requests
 * meant for it were answered by Atlas instead. They were read-only that time.
 *
 * A separate port makes the collision impossible rather than unlikely. The
 * EADDRINUSE handler below is the second line of defence, so that if something
 * else does hold 3031 the failure is a sentence rather than a stack trace.
 */
const PORT = process.env.PORT || 3031

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' },
})

process.env.NODE_ENV = 'test'
process.env.MONGO_URL = replSet.getUri()
process.env.DB_NAME = 'zolstock_e2e'
process.env.SECRET = 'e2e-secret-not-used-anywhere-real'
process.env.CORS_ORIGINS = 'http://localhost:5173'

// Dynamic import: everything above must have run first. See the note above.
const { createApp } = await import('../app.js')

/**
 * ── Seed data ─────────────────────────────────────────────────────────────
 * The database starts empty, and there is no way to create a product over
 * HTTP without already being an administrator — signup deliberately refuses to
 * make one, which is the privilege-escalation defence the Vitest suite covers.
 * So the fixtures go in directly, before the port opens.
 *
 * This mirrors how a real test environment works: a known, small, deliberately
 * shaped dataset that the suite can rely on. Reusing the existing factories
 * rather than writing new ones means the fixture shape cannot drift from the
 * one 370 other tests already use.
 *
 * On the hardcoded password: it is the factories' TEST_PASSWORD, in a database
 * that exists only in this process's memory and disappears when it exits,
 * signed with a secret that is also test-only. There is nothing here to leak —
 * and it is worth being precise about why, because "it's just a test password"
 * is how real ones end up committed.
 */
const { seedProducts, seedUsers } = await import('../tests/helpers/db.js')
const { makeProduct, makeUser, makeAdmin } = await import('../tests/helpers/factories.js')

export const FIXTURES = {
  admin: makeAdmin({ username: 'e2e-admin' }),
  shopper: makeUser({ username: 'e2e-shopper' }),
  products: [
    makeProduct({ sku: 'e2e-plenty', displayNameHe: 'סיר בדיקה', price: 120, stockQty: 50 }),
    // Stock of exactly 1: the last unit, for tests about running out.
    makeProduct({ sku: 'e2e-last-one', displayNameHe: 'מגבת בדיקה', price: 80, stockQty: 1 }),
    makeProduct({ sku: 'e2e-sold-out', displayNameHe: 'כוס בדיקה', price: 45, stockQty: 0, inStock: false }),
  ],
}

await seedUsers(FIXTURES.admin, FIXTURES.shopper)
await seedProducts(...FIXTURES.products)

/**
 * Rate limiting stays ON.
 *
 * The Vitest suite disables it because its counters live in module scope and
 * would leak between test files. Here there is one process and one suite, so
 * leaving it on means the API specs run against the same configuration
 * production does — including the credential limiter, which is exactly the
 * kind of thing that gets switched off "just for tests" and never switched
 * back.
 */
const server = http.createServer(createApp())

server.on('error', async err => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        `Something else is listening there, and the API tests would run against it ` +
        `instead of this throwaway database.\n` +
        `Stop whatever holds the port, or set PORT to a free one.\n`
    )
  } else {
    console.error(err)
  }
  await replSet.stop()
  process.exit(1)
})

server.listen(PORT, () => {
  // Playwright's webServer watches stdout to know when the port is ready.
  console.log(`E2E test server listening on http://localhost:${PORT}`)
  console.log(`Database: in-memory, ephemeral. Fixtures: ${FIXTURES.products.length} products, 2 users.`)
})

async function shutdown() {
  server.close(async () => {
    await replSet.stop()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
