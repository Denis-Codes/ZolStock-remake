import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedUsers } from '../helpers/db.js'
import { makeUser } from '../helpers/factories.js'

/**
 * The error contract — one rule, checked across the whole API.
 *
 * ── Why this file is not organised by route ──────────────────────────────
 * Every other API test file covers one route group. This one covers one
 * PROMISE that all of them make: **an API that answers JSON on success must
 * answer JSON on failure.**
 *
 * Some rules are not the property of any single endpoint. Testing them route
 * by route means writing the same assertion twenty times and still missing the
 * twenty-first when someone adds it. Collecting them here means the rule has
 * one home, and a new route that breaks it is one row away from being caught.
 *
 * ── Why the rule matters ──────────────────────────────────────────────────
 * The client does `const data = await res.json()`. If a failure returns a bare
 * string, that call throws a SyntaxError — so the error the developer sees is
 *
 *     SyntaxError: Unexpected token 'N', "Not Authenticated" is not valid JSON
 *
 * instead of "you are not signed in". The real cause is completely obscured,
 * and the app usually cannot render anything sensible either, because its
 * error handling expects `{ err }`.
 *
 * The app already has this right almost everywhere: errorHandler and
 * notFoundHandler both send JSON. The exception is requireAuth, which predates
 * them.
 */
const app = createApp({ enableRateLimit: false })

/* One route per shape of failure, so the table proves the rule holds across
   the app rather than in one corner of it. */
const PROTECTED_ROUTES = [
  ['get', '/api/cart'],
  ['get', '/api/order'],
  ['get', '/api/wishlist'],
  ['post', '/api/review'],
  ['post', '/api/product'],
]

describe('every failure is JSON — the cases that already hold', () => {
  it.each([
    ['unknown API path', 'get', '/api/does-not-exist'],
    ['unknown product', 'get', '/api/product/no-such-product'],
    ['malformed order id', 'get', '/api/order/not-an-id'],
  ])('%s answers JSON', async (_label, method, path) => {
    const [user] = await seedUsers(makeUser())

    const res = await request(app)[method](path).set('Cookie', cookieFor(user))

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    // `err` is the field the frontend reads. Asserting the status alone would
    // pass on a JSON body of a completely different shape.
    expect(res.body.err).toBeTruthy()
  })

  it('a validation failure answers JSON with per-field details', async () => {
    /**
     * The richest error shape in the API, and the one the forms depend on:
     * `details` is what renders the message next to the offending input.
     *
     * Pinned here as well as in the route's own tests, because it is part of
     * the app-wide contract — any new validated route should produce this same
     * shape rather than inventing its own.
     */
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'x', password: 'short', fullname: 'A' })

    expect(res.status).toBe(400)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(Array.isArray(res.body.details)).toBe(true)
    expect(res.body.details[0]).toHaveProperty('field')
  })
})

describe('🐛 BUG-008: authentication failures answer plain text', () => {
  /**
   * requireAuth is the one place that breaks the rule:
   *
   *     if (!loggedinUser) return res.status(401).send('Not Authenticated')
   *     if (!loggedinUser.isAdmin) res.status(403).end('Not Authorized')
   *
   * `res.send(string)` sets Content-Type: text/html. So the single most
   * COMMON error in the entire API — a session that expired — is the one shape
   * the client cannot parse.
   *
   * These tests assert the CURRENT behaviour rather than the desired one, so
   * the suite stays green and the gap is a written fact. They are named for
   * the bug and will go red the moment it is fixed, which is the intended
   * signal.
   *
   * The fix is two lines and is in bugs/BUG-008. It is not applied here
   * because this stage adds tests; it does not change behaviour.
   */
  it.each(PROTECTED_ROUTES)(
    '%s %s answers 401 as text/html, not JSON',
    async (method, path) => {
      const res = await request(app)[method](path)

      expect(res.status).toBe(401)
      // The bug, stated as an assertion.
      expect(res.headers['content-type']).not.toMatch(/application\/json/)
      expect(res.text).toBe('Not Authenticated')
      // And the field every other error in the API provides is absent.
      expect(res.body.err).toBeUndefined()
    }
  )

  it('403 answers with an empty body, so the client cannot say why', async () => {
    /**
     * Worse than the 401 in one specific way: `res.status(403).end('Not
     * Authorized')` — `end()` rather than `send()` — so there is not even a
     * string to fall back on in some clients.
     *
     * A user who is signed in and lacks permission gets a blank refusal, and
     * the UI has nothing to distinguish it from a network failure.
     */
    const [user] = await seedUsers(makeUser())

    const res = await request(app).get('/api/user').set('Cookie', cookieFor(user))

    expect(res.status).toBe(403)
    expect(res.body.err).toBeUndefined()
  })

  /**
   * The consequence, made concrete.
   *
   * This is what the frontend's http.service actually does with the response,
   * and it is the failure a developer would see in the console: not "not
   * authenticated" but a JSON parse error naming the letter N.
   */
  it('cannot be parsed as JSON by a client that expects it', () => {
    const body = 'Not Authenticated'

    expect(() => JSON.parse(body)).toThrow(SyntaxError)
  })
})
