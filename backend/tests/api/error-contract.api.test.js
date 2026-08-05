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

describe('authentication and authorization failures — BUG-008, now fixed', () => {
  /**
   * requireAuth used to be the one place that broke the rule:
   *
   *     if (!loggedinUser) return res.status(401).send('Not Authenticated')
   *     if (!loggedinUser.isAdmin) res.status(403).end('Not Authorized')
   *
   * `res.send(string)` sets Content-Type: text/html, and `res.end(string)`
   * negotiates no content type at all — so the single most COMMON error in the
   * entire API, a session that expired, was the one shape the client could not
   * parse. It now answers `{ err }` like everything else.
   *
   * These tests were written against the old behaviour and are kept rather
   * than deleted: the route table is the valuable part, and it is what stops a
   * future route quietly reintroducing a plain-text refusal. The assertions
   * were inverted when the fix landed.
   */
  it.each(PROTECTED_ROUTES)(
    '%s %s answers 401 as JSON the client can read',
    async (method, path) => {
      const res = await request(app)[method](path)

      expect(res.status).toBe(401)
      expect(res.headers['content-type']).toMatch(/application\/json/)
      // `err` is the field the frontend renders. A JSON body of some other
      // shape would satisfy the content type and still tell the user nothing.
      expect(res.body.err).toBe('Not authenticated')
    }
  )

  it('403 says why, instead of answering with an empty body', async () => {
    /**
     * The worse half of the old behaviour: `res.status(403).end('Not
     * Authorized')` sent nothing a client could act on, so a signed-in user
     * without permission got a refusal indistinguishable from a network
     * failure. "You don't have access" and "the server is down" should not
     * look the same.
     */
    const [user] = await seedUsers(makeUser())

    const res = await request(app).get('/api/user').set('Cookie', cookieFor(user))

    expect(res.status).toBe(403)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body.err).toBe('Not authorized')
  })

  it('stops at 403 rather than falling through to the handler', async () => {
    /**
     * A latent problem alongside the content type, and the reason the fix was
     * not purely cosmetic: the old code called `res.status(403).end()` and then
     * `return`ed on the next line, but nothing enforced that — the refusal and
     * the decision to stop were two separate statements. `return res.json(...)`
     * makes them one.
     *
     * Asserted through the observable consequence: a second body would trip
     * Express's "Cannot set headers after they are sent", so a clean single
     * JSON response is the evidence the chain ended here.
     */
    const [user] = await seedUsers(makeUser())

    const res = await request(app).get('/api/user').set('Cookie', cookieFor(user))

    expect(res.status).toBe(403)
    expect(Object.keys(res.body)).toEqual(['err'])
  })

  /**
   * The consequence, made concrete.
   *
   * This is what the frontend's http.service actually does with the response.
   * Before the fix it produced `SyntaxError: Unexpected token 'N', "Not
   * Authenticated" is not valid JSON` — a developer debugging a failed request
   * was shown a parse error naming a letter rather than "your session
   * expired".
   */
  it('parses as JSON in a client that expects it', async () => {
    const res = await request(app).get('/api/cart')

    expect(() => JSON.parse(res.text)).not.toThrow()
    expect(JSON.parse(res.text)).toEqual({ err: 'Not authenticated' })
  })
})
