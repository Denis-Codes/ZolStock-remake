import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { seedUsers, findUser, countDocuments } from '../helpers/db.js'
import { makeUser, TEST_PASSWORD } from '../helpers/factories.js'

/**
 * Authentication endpoints.
 *
 * Signup and login are where an attacker starts, so these tests are weighted
 * towards what must NOT be possible rather than the happy path.
 *
 * ── A note on the rate limiter ────────────────────────────────────────────
 * /api/auth/* has its own limiter: 10 FAILED attempts per IP per 15 minutes.
 * Supertest sends everything from one address, so the failing requests in this
 * file all draw from one budget. There are five, which leaves room.
 *
 * The limiter's counter lives in module scope, and Vitest gives every test
 * file a fresh module registry — so each file gets its own budget and files
 * cannot exhaust each other's. That is also why the test that deliberately
 * trips the limiter lives in its own file.
 */
const app = createApp({ enableRateLimit: false })

const VALID_SIGNUP = {
  username: 'newshopper',
  password: 'Passw0rd!',
  fullname: 'New Shopper',
}

describe('POST /api/auth/signup', () => {
  it('creates an account and signs the user in', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)

    expect(res.status).toBe(200)
    expect(res.body.username).toBe('newshopper')
    expect(await countDocuments('user')).toBe(1)
  })

  it('never returns the password, hashed or otherwise', async () => {
    // The response is JSON the browser can read and any logging proxy can
    // capture. Even a bcrypt hash is worth offline cracking, so it must not
    // leave the server.
    const res = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)

    expect(res.body).not.toHaveProperty('password')
  })

  it('stores the password hashed, never in plain text', async () => {
    await request(app).post('/api/auth/signup').send(VALID_SIGNUP)

    const stored = await findUser({ username: 'newshopper' })

    expect(stored.password).not.toBe(VALID_SIGNUP.password)
    // bcrypt hashes always start with $2 — cheap way to prove it is a real
    // hash and not, say, base64 or a reversible cipher.
    expect(stored.password).toMatch(/^\$2[aby]\$/)
  })

  it('sets an httpOnly session cookie', async () => {
    /**
     * httpOnly means JavaScript on the page cannot read the cookie. Without
     * it, any cross-site scripting bug anywhere in the storefront — one bad
     * third-party widget, one unescaped review — turns into full session
     * theft, because the attacker can just read document.cookie.
     *
     * The client never needs to read this value; axios sends it automatically.
     */
    const res = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
    const cookie = res.headers['set-cookie'].join(';')

    expect(cookie).toContain('loginToken=')
    expect(cookie).toContain('HttpOnly')
  })

  it('refuses to make the caller an administrator', async () => {
    /**
     * THE test in this file.
     *
     * Signup used to spread the request body into the new user document, so
     * this exact request created an admin. No tooling, no exploit — one extra
     * JSON field, and the attacker owns the shop.
     *
     * Two independent defences now stop it: the Zod schema does not declare
     * isAdmin so it is stripped, and authService.signup hardcodes
     * `isAdmin: false` rather than reading the caller's value. This test does
     * not care which one caught it; it asserts the outcome.
     */
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, isAdmin: true })

    expect(res.status).toBe(200)

    // Assert on the DATABASE, not the response. A response that hides the
    // field while the stored row has it would be the worst possible outcome:
    // invisible, and permanent.
    const stored = await findUser({ username: 'newshopper' })
    expect(stored.isAdmin).toBe(false)
  })

  it('refuses to let the caller choose their own balance', async () => {
    // Same class of bug, lower stakes. The frontend really does send
    // score: 10000 on signup, which is exactly why the server must ignore it.
    await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, score: 999999 })

    const stored = await findUser({ username: 'newshopper' })
    expect(stored.score).toBe(100)
  })

  it('rejects a username that is already taken', async () => {
    await seedUsers(makeUser({ username: 'taken' }))

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, username: 'taken' })

    expect(res.status).toBe(400)
    expect(await countDocuments('user')).toBe(1)
  })

  it('rejects a password below the minimum length', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, password: 'short' })

    expect(res.status).toBe(400)
    // The details array is what the signup form renders next to each input.
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'password' })])
    )
    expect(await countDocuments('user')).toBe(0)
  })
})

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const [user] = await seedUsers(makeUser({ username: 'shopper' }))

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'shopper', password: TEST_PASSWORD })

    expect(res.status).toBe(200)
    expect(res.body._id).toBe(String(user._id))
    expect(res.body).not.toHaveProperty('password')
    expect(res.headers['set-cookie'].join(';')).toContain('loginToken=')
  })

  it('gives the same answer for a wrong password and an unknown user', async () => {
    /**
     * USER ENUMERATION — a subtle and very common leak.
     *
     * If "no such user" and "wrong password" produced different responses, an
     * attacker could feed in a list of email addresses and learn which ones
     * have accounts here. That list is then worth money on its own, and it
     * narrows a credential-stuffing attack from millions of guesses to
     * thousands.
     *
     * So both paths return an identical 401 with an identical message. The
     * assertion is that the two responses match EACH OTHER — which is the
     * actual requirement — rather than that each matches some fixed string.
     */
    await seedUsers(makeUser({ username: 'realuser' }))

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ username: 'realuser', password: 'NotThePassword!' })

    const noSuchUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'NotThePassword!' })

    expect(wrongPassword.status).toBe(401)
    expect(noSuchUser.status).toBe(401)
    expect(wrongPassword.body).toEqual(noSuchUser.body)
  })

  it('does not issue a cookie on a failed login', async () => {
    // Obvious, and worth stating: the failure path must not accidentally set
    // the session anyway. Costs one line.
    await seedUsers(makeUser({ username: 'realuser' }))

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'realuser', password: 'NotThePassword!' })

    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('refuses a Mongo operator where a username belongs', async () => {
    /**
     * The textbook NoSQL authentication bypass. If `{"username": {"$ne": null}}`
     * reached the query unchanged it would mean "any user whose username is
     * not null" — matching the first account in the collection, and logging
     * the attacker in as them without knowing a single username.
     *
     * The Zod schema requires a string, so it never gets that far. 400, not
     * 401: the request is malformed, not merely wrong.
     */
    await seedUsers(makeUser())

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: { $ne: null }, password: { $ne: null } })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const res = await request(app).post('/api/auth/logout')

    expect(res.status).toBe(200)

    /**
     * Clearing a cookie means setting it to empty with an expiry in the past.
     * The subtle part: clearCookie only works if the attributes (path,
     * sameSite, secure) match those it was SET with — otherwise the browser
     * treats it as a different cookie, keeps the original, and the user stays
     * signed in after clicking log out.
     */
    const cookie = res.headers['set-cookie'].join(';')
    expect(cookie).toContain('loginToken=;')
    expect(cookie).toContain('Path=/')
  })
})
