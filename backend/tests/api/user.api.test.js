import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedUsers, findUser, countDocuments } from '../helpers/db.js'
import { makeUser, makeAdmin } from '../helpers/factories.js'

/**
 * User accounts — the most permission-sensitive surface in the API.
 *
 * Everything else in this app protects money. These routes protect *people*:
 * the list of who has an account, and the ability to alter someone's record.
 * Getting it wrong does not cost a shipment, it exposes a customer list.
 *
 * Two bugs have already been fixed here, and both are recorded in comments in
 * the source. They are worth reading before the tests, because they are the
 * two mistakes this file exists to keep fixed:
 *
 *   1. Listing every user was PUBLIC. The admin page checked isAdmin in the
 *      browser only — so anyone calling the API directly got the lot. Client-
 *      side permission checks are a UI convenience, never a control.
 *
 *   2. updateUser wrote to whatever _id arrived in the BODY. Any signed-in
 *      user could rewrite any other user's record by changing one field in
 *      the request. The update is now bound to the URL and ownership is
 *      enforced.
 *
 * Neither is exotic. Both are among the most commonly exploited web flaws
 * there are, and both look completely fine from inside the app.
 */
const app = createApp({ enableRateLimit: false })

const as = (user, req) => req.set('Cookie', cookieFor(user))

describe('GET /api/user — the account list', () => {
  /**
   * The authorization matrix. Same request, three callers, three answers.
   *
   * The admin row is not optional politeness — without it, an endpoint that
   * returned 500 to everybody would pass both refusals and look protected.
   */
  it('refuses an anonymous caller', async () => {
    const res = await request(app).get('/api/user')

    expect(res.status).toBe(401)
  })

  it('refuses a signed-in shopper', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).get('/api/user'))

    // 403, not 401. The server knows exactly who this is; the answer is no.
    expect(res.status).toBe(403)
  })

  it('allows an administrator', async () => {
    const [admin] = await seedUsers(makeAdmin())
    await seedUsers(makeUser(), makeUser())

    const res = await as(admin, request(app).get('/api/user'))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
  })

  it('never includes password hashes in the list', async () => {
    /**
     * A bcrypt hash is still worth stealing — it can be cracked offline at
     * leisure, and people reuse passwords. An endpoint that leaks the whole
     * user table WITH hashes turns one authorization mistake into a
     * credential breach.
     *
     * Asserted across every row rather than the first, because a mapping that
     * strips the field can easily miss a branch.
     */
    const [admin] = await seedUsers(makeAdmin())
    await seedUsers(makeUser(), makeUser())

    const res = await as(admin, request(app).get('/api/user'))

    for (const user of res.body) {
      expect(user).not.toHaveProperty('password')
    }
  })
})

describe('GET /api/user/:id', () => {
  it('requires a session', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await request(app).get(`/api/user/${user._id}`)

    expect(res.status).toBe(401)
  })

  it('returns a profile without the password', async () => {
    const [user] = await seedUsers(makeUser({ fullname: 'Real Person' }))

    const res = await as(user, request(app).get(`/api/user/${user._id}`))

    expect(res.status).toBe(200)
    expect(res.body.fullname).toBe('Real Person')
    expect(res.body).not.toHaveProperty('password')
  })

  /**
   * A malformed id must 404, not 500.
   *
   * `ObjectId.createFromHexString` throws a raw BSON error on anything that is
   * not 24 hex characters, and an unguarded throw becomes a 500. That matters
   * for two reasons: a 500 tells an attacker they reached real code and can
   * probe further, and it fills the error log with noise from anyone who
   * mistyped a URL.
   *
   * Both rows are here because they fail in different places — one in the id
   * parse, one on a lookup that finds nothing — and a fix for one does not
   * necessarily cover the other.
   */
  it.each([
    ['malformed', 'not-an-object-id'],
    ['well-formed but unknown', '000000000000000000000000'],
  ])('404s a %s id rather than erroring', async (_label, id) => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).get(`/api/user/${id}`))

    expect(res.status).toBe(404)
  })
})

describe('PUT /api/user/:id — who may change what', () => {
  it('lets a shopper update their own profile', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).put(`/api/user/${user._id}`).send({ fullname: 'New Name' }))

    expect(res.status).toBe(200)
    expect(await findUser({ _id: user._id })).toMatchObject({ fullname: 'New Name' })
  })

  /**
   * THE test in this file.
   *
   * The previous implementation took the _id from the request BODY, so this
   * exact request rewrote Alice's record while authenticated as Bob. No
   * tooling, no exploit — one field.
   *
   * The assertion checks the DATABASE, not the response. A 403 that performed
   * the write anyway is the worst possible outcome: it looks correct from the
   * outside and is permanent.
   */
  it('refuses to let one shopper edit another', async () => {
    const [alice] = await seedUsers(makeUser({ username: 'alice', fullname: 'Alice' }))
    const [bob] = await seedUsers(makeUser({ username: 'bob' }))

    const res = await as(bob, request(app).put(`/api/user/${alice._id}`).send({ fullname: 'Owned' }))

    expect(res.status).toBe(403)
    expect(await findUser({ _id: alice._id })).toMatchObject({ fullname: 'Alice' })
  })

  /**
   * The same attack through the back door: correct URL, hostile body.
   *
   * Bob updates his OWN record — permitted — but smuggles Alice's id in the
   * body, hoping the service uses that instead. The controller rebuilds the
   * object as `{ ...req.body, _id: targetId }`, so the URL always wins.
   *
   * Worth its own test because the fix for the previous one does not
   * automatically cover this: an implementation could check the URL for
   * permission and still write using the body.
   */
  it('ignores an _id smuggled in the body', async () => {
    const [alice] = await seedUsers(makeUser({ username: 'alice', fullname: 'Alice' }))
    const [bob] = await seedUsers(makeUser({ username: 'bob', fullname: 'Bob' }))

    await as(
      bob,
      request(app).put(`/api/user/${bob._id}`).send({ _id: String(alice._id), fullname: 'Rewritten' })
    )

    expect(await findUser({ _id: alice._id })).toMatchObject({ fullname: 'Alice' })
    expect(await findUser({ _id: bob._id })).toMatchObject({ fullname: 'Rewritten' })
  })

  it('lets an administrator update anyone', async () => {
    const [admin] = await seedUsers(makeAdmin())
    const [user] = await seedUsers(makeUser())

    const res = await as(admin, request(app).put(`/api/user/${user._id}`).send({ fullname: 'Edited by admin' }))

    expect(res.status).toBe(200)
    expect(await findUser({ _id: user._id })).toMatchObject({ fullname: 'Edited by admin' })
  })
})

describe('PUT /api/user/:id — server-owned fields', () => {
  /**
   * PRIVILEGE ESCALATION. The single most valuable request an attacker can
   * make against this app: turn my own ordinary account into an admin one.
   *
   * Two defences, and the test does not care which one fires. The Zod schema
   * does not declare isAdmin so it is stripped before the controller sees it,
   * and the update is built from the validated body.
   *
   * Asserted on the stored document. A response that omits the field while
   * the row has it would be invisible and permanent.
   */
  it('refuses to promote the caller to administrator', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).put(`/api/user/${user._id}`).send({ isAdmin: true }))

    expect(res.status).toBe(200)
    expect(await findUser({ _id: user._id })).toMatchObject({ isAdmin: false })
  })

  /**
   * score is currency. The frontend genuinely sends `{ _id, score }` on
   * update, which is exactly why the server must ignore it — a client that
   * can set its own balance is a shop that gives money away.
   *
   * The controller deletes it for non-admins rather than rejecting the
   * request, so the rest of the update still succeeds. That is the right
   * choice: failing the whole save would break the profile form for a field
   * the user never touched.
   */
  it('ignores a shopper setting their own balance', async () => {
    const [user] = await seedUsers(makeUser({ score: 100 }))

    await as(user, request(app).put(`/api/user/${user._id}`).send({ fullname: 'Still Me', score: 999999 }))

    const stored = await findUser({ _id: user._id })
    expect(stored.score).toBe(100)
    // ...and the legitimate part of the same request went through.
    expect(stored.fullname).toBe('Still Me')
  })

  it('lets an administrator adjust a balance', async () => {
    // The counterpart. Without it, a service that simply dropped score
    // everywhere would pass the test above and quietly break the admin tool.
    const [admin] = await seedUsers(makeAdmin())
    const [user] = await seedUsers(makeUser({ score: 100 }))

    await as(admin, request(app).put(`/api/user/${user._id}`).send({ score: 500 }))

    expect((await findUser({ _id: user._id })).score).toBe(500)
  })

  it('refuses to change a username or password through the profile route', async () => {
    /**
     * Neither field is in the schema, so both are stripped.
     *
     * The password one matters most: this route does no hashing, so a password
     * that got through would be stored in plain text — and would also silently
     * lock the user out, because login compares against a bcrypt hash.
     */
    const [user] = await seedUsers(makeUser({ username: 'original' }))

    await as(
      user,
      request(app).put(`/api/user/${user._id}`).send({ username: 'hijacked', password: 'plaintext' })
    )

    const stored = await findUser({ _id: user._id })
    expect(stored.username).toBe('original')
    expect(stored.password).not.toBe('plaintext')
    expect(stored.password).toMatch(/^\$2[aby]\$/)
  })

  it('rejects a fullname below the minimum length', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).put(`/api/user/${user._id}`).send({ fullname: 'x' }))

    expect(res.status).toBe(400)
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'fullname' })])
    )
  })
})

describe('DELETE /api/user/:id', () => {
  it.each([
    { label: 'an anonymous caller', signedIn: null, expected: 401 },
    { label: 'a signed-in shopper', signedIn: 'user', expected: 403 },
  ])('refuses $label', async ({ signedIn, expected }) => {
    const [victim] = await seedUsers(makeUser({ username: 'victim' }))
    const [caller] = await seedUsers(makeUser({ username: 'caller' }))

    const req = request(app).delete(`/api/user/${victim._id}`)
    const res = signedIn ? await as(caller, req) : await req

    expect(res.status).toBe(expected)
    // The account is still there. A refusal that deleted anyway is the whole
    // reason to assert on state and not only on the status code.
    expect(await findUser({ _id: victim._id })).not.toBeNull()
  })

  it('allows an administrator', async () => {
    const [admin] = await seedUsers(makeAdmin())
    const [victim] = await seedUsers(makeUser())

    const res = await as(admin, request(app).delete(`/api/user/${victim._id}`))

    expect(res.status).toBe(200)
    expect(await findUser({ _id: victim._id })).toBeNull()
    // The admin is still there — a delete that took the wrong row would pass
    // the assertion above.
    expect(await countDocuments('user')).toBe(1)
  })
})
