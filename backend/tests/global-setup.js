import { MongoMemoryReplSet } from 'mongodb-memory-server'

/**
 * Boots one in-memory MongoDB for the entire test run.
 *
 * ── Why a real database instead of a mock ────────────────────────────────
 * The riskiest behaviour in this codebase lives in the *database's*
 * guarantees, not in JavaScript. The oversell guard in order.service.js is
 * the clearest case:
 *
 *   updateOne({ _id, stockQty: { $gte: qty } }, { $inc: { stockQty: -qty } })
 *
 * Its correctness is entirely "Mongo applies this atomically". A mocked
 * collection returns whatever we programmed it to return, so a test against a
 * mock would be testing the mock. Only a real mongod can answer the question.
 *
 * ── Why a REPLICA SET rather than a standalone ───────────────────────────
 * MongoDB only supports multi-document transactions on a replica set. A
 * standalone mongod rejects startSession().withTransaction() outright.
 *
 * Stage 10 replaces the compensating-rollback logic in checkout() with a real
 * transaction, and Atlas (a replica set) is the deploy target. Starting on a
 * replica set now means the tests written between here and there keep working,
 * and the environment matches production. A single-node replica set costs
 * roughly a second more to boot than a standalone — cheap insurance against
 * discovering the gap in stage 10.
 *
 * ── Why in-memory rather than a shared dev database ──────────────────────
 * Tests must be able to create, corrupt and delete data freely. Pointing them
 * at a real database means either polluting it or writing cleanup code that
 * becomes load-bearing. An ephemeral server that vanishes afterwards removes
 * the question.
 */
let replSet

export async function setup({ provide }) {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  })

  const uri = replSet.getUri()

  // `provide` is Vitest's channel from this process to the test workers, which
  // run separately — a plain module-level export would not reach them.
  provide('mongoUri', uri)
}

export async function teardown() {
  await replSet?.stop()
}
