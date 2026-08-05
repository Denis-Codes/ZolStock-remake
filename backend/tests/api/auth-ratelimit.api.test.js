import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { seedUsers } from '../helpers/db.js'
import { makeUser } from '../helpers/factories.js'

/**
 * The credential-endpoint rate limiter, in a file of its own.
 *
 * ── Why its own file, learned the hard way ────────────────────────────────
 * The limiter counts failed attempts in module-scope memory. Tripping it on
 * purpose exhausts the budget for everything after it, so any test sharing the
 * file starts failing with 429s for reasons unrelated to what it tests.
 *
 * This file originally held a second test — that successful logins are not
 * counted — and it failed with `expected 429 to be 200`, because THIS test had
 * already spent all ten failures. The warning above was written first and then
 * violated one function later, which is a fair illustration of how easily
 * shared mutable state defeats good intentions.
 *
 * The tempting fix is to reorder the tests so the harmless one runs first. That
 * is worse: it makes the suite pass only in one order, which is how a test
 * becomes flaky the moment anything is parallelised or filtered.
 *
 * The real fix is isolation. Vitest gives each test file a fresh module
 * registry, so a separate file gets a separate counter — hence
 * auth-ratelimit-success.api.test.js next door.
 *
 * ── Why test this at all ──────────────────────────────────────────────────
 * The limiter is the only thing standing between this app and credential
 * stuffing: an attacker replaying millions of username/password pairs leaked
 * from some other breach. It is security that is invisible when it works, so
 * nobody notices when a refactor turns it off. That is exactly what a test is
 * for.
 */
const app = createApp({ enableRateLimit: false })

const LIMIT = 10

describe('credential rate limiting', () => {
  it('blocks further attempts after repeated failures', async () => {
    await seedUsers(makeUser({ username: 'victim' }))

    const attempt = () =>
      request(app).post('/api/auth/login').send({ username: 'victim', password: 'wrong' })

    // Burn the budget. Sequential rather than parallel: the counter has to be
    // incremented before the next request is judged, and firing them at once
    // would make the test depend on timing.
    const results = []
    for (let i = 0; i < LIMIT; i++) results.push((await attempt()).status)

    // Every attempt so far is a normal rejection.
    expect(results).toEqual(Array(LIMIT).fill(401))

    // The next one is refused before the password is even checked.
    const blocked = await attempt()

    expect(blocked.status).toBe(429)
    expect(blocked.body.err).toMatch(/too many/i)
  })
})
