import request from 'supertest'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedUsers, findUser, countDocuments } from '../helpers/db.js'
import { makeUser } from '../helpers/factories.js'
import { socketService } from '../../services/socket.service.js'

/**
 * ── The one thing mocked in the entire backend suite, and why ─────────────
 * Every other API test runs the real stack: real Express, real MongoDB, real
 * everything. This file replaces socketService, and the reason is specific.
 *
 * The review controller broadcasts over socket.io after writing. `gIo` is only
 * assigned by setupSocketAPI(), which server.js calls and createApp() does
 * not — so in tests the broadcast throws `Cannot read properties of null
 * (reading 'fetchSockets')`. Because it is called without `await`, that
 * becomes an UNHANDLED REJECTION: Vitest reports "Errors: 20" and exits 1
 * while every test passes.
 *
 * A suite that goes red for reasons unrelated to the code under test is worse
 * than no suite, so the dependency is replaced rather than tolerated. That is
 * the legitimate use of a mock: not to avoid testing something, but to remove
 * a collaborator that is genuinely out of scope. These tests are about what
 * happens to reviews, not about socket delivery.
 *
 * It also makes the BUG-007 demonstration deliberate. Instead of relying on an
 * accidental crash, that test makes the broadcast throw on purpose — which is
 * both deterministic and a far better description of the real failure mode.
 *
 * Note that the crash described above no longer happens: socketService now
 * no-ops when `gIo` is null rather than throwing. The mock stays because the
 * reason for it never depended on that crash — these tests are about what
 * happens to reviews, not about socket delivery — and because making the
 * broadcast fail ON DEMAND is the only way to test the boundary that was
 * added around it.
 */
vi.mock('../../services/socket.service.js', () => ({
  socketService: {
    broadcast: vi.fn(),
    emitTo: vi.fn(),
    emitToUser: vi.fn(),
    setupSocketAPI: vi.fn(),
  },
}))

/**
 * Reviews — the oldest route group, and the one with the fewest guardrails
 * *visible from the controller*.
 *
 * ── A correction worth keeping, because it is the lesson ──────────────────
 * The first draft of this file asserted four missing defences, based on
 * reading review.controller.js — which has no Zod schema and no ownership
 * check before calling `reviewService.remove(reviewId)`.
 *
 * Two of those four assertions failed, because the defences exist one layer
 * down in review.service.js:
 *
 *   - `add()` builds `{ byUserId, aboutUserId, txt }` explicitly, so
 *     undeclared fields are dropped — an allowlist, just not a Zod one.
 *   - `remove()` reads the session from AsyncLocalStorage and adds
 *     `byUserId` to the delete criteria unless the caller is an admin.
 *
 * So the route is better defended than the controller suggests, and the tests
 * are what established that. Reading one layer and concluding is how false bug
 * reports get filed; running the assertion is how they get caught before
 * anyone's time is wasted. Both defences now have positive tests below.
 *
 * ── Read this before the tests ────────────────────────────────────────────
 * `POST /api/review` and `DELETE /api/review/:id` used to answer **400** while
 * doing their work anyway. That was BUG-007: the handlers finished the
 * database write, then broadcast a socket event inside the same try/catch, and
 * a broadcast failure turned a completed write into a failure response. It is
 * fixed — the response is now sent before the broadcast, and a broadcast
 * failure is logged and goes no further.
 *
 * Almost every assertion in this file is nonetheless made against the
 * DATABASE rather than the response, and that stays. It was the only truthful
 * source while the bug was open, and it is the sharpest illustration in the
 * whole suite of why "assert on state, not just the status code" is the rule:
 * a test that stopped at `expect(res.status).toBe(400)` would have concluded
 * that nothing happened, when three things had. Keeping the state assertions
 * means these tests would still tell the truth if the status code went wrong
 * again.
 *
 * The rest of the file records, precisely, defences this route does not have,
 * so the gaps are written facts rather than things nobody has looked at.
 * Writing tests against unhardened code is normal work: a documented gap that
 * a test will notice changing is worth far more than an undocumented one.
 */
const app = createApp({ enableRateLimit: false })

const as = (user, req) => req.set('Cookie', cookieFor(user))

const reviewBody = (aboutUser, txt = 'Great service') => ({
  aboutUserId: String(aboutUser._id),
  txt,
})

/* Mock call history is module-level state, so it survives between tests in
   this file. Without clearing it, a `mockImplementationOnce` left unconsumed
   by one test would fire inside the next one — the same shared-state trap as
   the rate limiter, wearing a different hat. */
beforeEach(() => {
  vi.clearAllMocks()
})

async function findReviews() {
  const { dbService } = await import('../../services/db.service.js')
  return (await dbService.getCollection('review')).find({}).toArray()
}

describe('reviews — access', () => {
  it('lets anyone read reviews', async () => {
    // Deliberately public: reviews are what a prospective customer reads
    // before deciding, so requiring an account to see them would defeat their
    // purpose. Pinned so nobody "tightens" it without meaning to.
    const res = await request(app).get('/api/review')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it.each([
    ['post', '/api/review'],
    ['delete', '/api/review/000000000000000000000000'],
  ])('%s %s requires a session', async (method, path) => {
    const res = await request(app)[method](path)

    // These genuinely are 401s — requireAuth runs before the handler, so the
    // broadcast is never reached and the response is honest.
    expect(res.status).toBe(401)
  })
})

describe('POST /api/review', () => {
  it('creates a review when everything works', async () => {
    // The baseline, with the socket layer behaving. Needed so the test below
    // demonstrates the broadcast failure specifically, rather than something
    // that was broken all along.
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    const res = await as(author, request(app).post('/api/review').send(reviewBody(subject)))

    expect(res.status).toBe(200)
    expect(await countDocuments('review')).toBe(1)
  })

  /**
   * BUG-007, now fixed — a notification failure is no longer a write failure.
   *
   * The controller used to write the review, increment the score, issue a
   * refreshed cookie and THEN broadcast, all inside one try/catch. A throwing
   * broadcast turned a completed write into `400 Failed to add review`, and
   * the catch could not tell the two apart.
   *
   * What that cost: the client showed "failed, please try again", the customer
   * tried again, and there were now two identical reviews and +20 score. The
   * misleading error actively encouraged the action that compounded it.
   *
   * The failure is induced on purpose — `mockImplementationOnce` makes the
   * broadcast throw exactly once. That is what makes this a test of the
   * BOUNDARY rather than of an environment where sockets happen to be missing,
   * and it is why the test survives the fix: the broadcast can still fail for
   * reasons nobody controls, and the contract is that the response does not
   * change when it does.
   *
   * All three assertions belong in one test. Separated, each reads like a
   * different feature; together they are the statement that the write and its
   * announcement are now independent.
   */
  it('answers 200 when only the broadcast fails, because the write succeeded', async () => {
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    socketService.broadcast.mockImplementationOnce(() => {
      throw new Error('socket layer unavailable')
    })

    const res = await as(author, request(app).post('/api/review').send(reviewBody(subject)))

    expect(res.status).toBe(200)
    expect(res.body.txt).toBe('Great service')
    // The state that made the old 400 a lie, still asserted.
    expect(await countDocuments('review')).toBe(1)
    expect((await findUser({ _id: author._id })).score).toBe(110)
  })

  it('still answers 400 when the write itself fails', async () => {
    /**
     * The assertion that keeps the fix honest. Moving the broadcast past the
     * response must not turn the catch into something that never fires — a
     * handler that answers 200 unconditionally would satisfy every test above
     * and be far worse than the bug it replaced.
     *
     * `aboutUserId` goes through `ObjectId.createFromHexString()` in the
     * service, which throws on a string that is not a valid id — a genuine
     * write failure, reached before any broadcast.
     */
    const [author] = await seedUsers(makeUser({ username: 'author' }))

    const res = await as(
      author,
      request(app).post('/api/review').send({ aboutUserId: 'not-an-object-id', txt: 'Great service' })
    )

    expect(res.status).toBe(400)
    expect(res.body.err).toBe('Failed to add review')
    expect(await countDocuments('review')).toBe(0)
  })

  it('attributes the review to the signed-in user, not the request body', async () => {
    /**
     * The one thing this endpoint does defend, and it is the important one:
     * `review.byUserId = loggedinUser._id` overwrites whatever arrived.
     *
     * Without it, anyone could post a glowing review signed as a competitor,
     * or an abusive one signed as a real customer.
     *
     * Checked in the database rather than in the response: the controller
     * deletes `byUserId` from the body it sends back, so the response cannot
     * answer this question at all.
     */
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))
    const [victim] = await seedUsers(makeUser({ username: 'victim' }))

    await as(
      author,
      request(app).post('/api/review').send({ ...reviewBody(subject), byUserId: String(victim._id) })
    )

    const [stored] = await findReviews()
    // String(): the service converts both ids to ObjectId before inserting, so
    // the stored value is a BSON object rather than the hex string that went
    // over the wire.
    expect(String(stored.byUserId)).toBe(String(author._id))
  })

  /**
   * The body IS allowlisted — just in the service rather than by a Zod schema.
   *
   * `add()` constructs `{ byUserId, aboutUserId, txt }` from the input and
   * ignores everything else, so an extra field cannot reach the database.
   *
   * A positive test, not a warning. This is the defence the controller's
   * missing `validate()` call makes it look like the route lacks, and pinning
   * it here means a refactor that "tidies" add() into a spread would go red.
   */
  it('drops fields the service did not ask for', async () => {
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    await as(
      author,
      request(app)
        .post('/api/review')
        .send({ ...reviewBody(subject), unexpectedField: 'kept', rating: 999, isAdmin: true })
    )

    const [stored] = await findReviews()

    // Assert the whole allowlist, not the fields an attacker was imagined to
    // try. Anything new appearing in this document shows up here.
    expect(Object.keys(stored).sort()).toEqual(['_id', 'aboutUserId', 'byUserId', 'txt'])
  })
})

describe('reviews — gaps this endpoint has, recorded deliberately', () => {
  /**
   * ⚠️ SCORE FARMING.
   *
   * addReview awards the author +10 score per review:
   *
   *     loggedinUser.score += 10
   *     await userService.update(loggedinUser)
   *
   * No limit, no cooldown, no check that the reviews are distinct. Score is
   * currency — the profile route goes to real trouble to stop a shopper
   * setting their own balance, and this route hands it out on request.
   *
   * One subtlety worth being precise about, because it changes the severity:
   * `loggedinUser` is decoded from the COOKIE, so `score + 10` is computed
   * from whatever the token was carrying. supertest sends the same original
   * cookie every time, so three requests here all write 110 rather than
   * accumulating to 130.
   *
   * That is not a defence. The handler issues a REFRESHED cookie carrying the
   * new score (`res.cookie('loginToken', loginToken)`), and a real browser
   * sends that one next time — so in a browser it does accumulate. The cap
   * seen here is an artefact of the test client, and saying so is the
   * difference between an accurate bug report and a misleading one.
   */
  it('⚠️ awards +10 score for posting a review', async () => {
    const [author] = await seedUsers(makeUser({ username: 'farmer', score: 100 }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    await as(author, request(app).post('/api/review').send(reviewBody(subject)))

    expect((await findUser({ _id: author._id })).score).toBe(110)
  })

  it('⚠️ issues a refreshed cookie carrying the higher score', async () => {
    // This is the mechanism that makes the farming cumulative in a browser.
    // Pinned separately so the previous test's ceiling is not mistaken for a
    // limit that actually exists.
    const [author] = await seedUsers(makeUser({ username: 'farmer', score: 100 }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    const res = await as(author, request(app).post('/api/review').send(reviewBody(subject)))

    expect(res.headers['set-cookie'].join(';')).toContain('loginToken=')
  })

  /**
   * ⚠️ A user may review themselves — and be paid for it.
   *
   * Combined with the above, this is the complete self-service version: no
   * second party needed at all, and nobody else ever sees it happen.
   */
  it('⚠️ allows a user to review themselves', async () => {
    const [user] = await seedUsers(makeUser({ username: 'selfreviewer', score: 100 }))

    await as(user, request(app).post('/api/review').send(reviewBody(user)))

    expect(await countDocuments('review')).toBe(1)
    expect((await findUser({ _id: user._id })).score).toBe(110)
  })

})

describe('DELETE /api/review/:id — ownership', () => {
  /**
   * IDOR, and this one is DEFENDED — which is why it gets a positive test
   * rather than a warning.
   *
   * The controller passes the id straight to the service with no check, so
   * from there it looks wide open. `reviewService.remove` is what closes it:
   * it pulls the session out of AsyncLocalStorage and adds `byUserId` to the
   * delete criteria for anyone who is not an admin, so the query simply cannot
   * match someone else's row.
   *
   * The review count is the assertion that matters. A stranger's delete now
   * answers 400 ("Cannot remove review", because the criteria matched nothing)
   * so the status code does say something — but a status code cannot prove the
   * row is still there, and that is the only thing anyone actually cares
   * about here.
   */
  it('refuses to delete a review the caller did not write', async () => {
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))
    const [stranger] = await seedUsers(makeUser({ username: 'stranger' }))

    await as(author, request(app).post('/api/review').send(reviewBody(subject)))
    const [stored] = await findReviews()

    await as(stranger, request(app).delete(`/api/review/${stored._id}`))

    expect(await countDocuments('review')).toBe(1)
  })

  it('does not retract the deletion when the broadcast fails', async () => {
    /**
     * The same boundary as on POST, checked on the other handler.
     * `deleteReview` had the identical shape — remove, broadcast, one catch —
     * so it gets its own row rather than an assumption that fixing one fixed
     * both.
     */
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    await as(author, request(app).post('/api/review').send(reviewBody(subject)))
    const [stored] = await findReviews()

    socketService.broadcast.mockImplementationOnce(() => {
      throw new Error('socket layer unavailable')
    })

    const res = await as(author, request(app).delete(`/api/review/${stored._id}`))

    expect(res.status).toBe(200)
    expect(await countDocuments('review')).toBe(0)
  })

  it('lets the author delete their own review', async () => {
    // The positive row. Without it, a service that refused everybody would
    // pass the test above and look perfectly secure.
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))

    await as(author, request(app).post('/api/review').send(reviewBody(subject)))
    const [stored] = await findReviews()

    await as(author, request(app).delete(`/api/review/${stored._id}`))

    expect(await countDocuments('review')).toBe(0)
  })

  it('lets an administrator delete anyone\'s review', async () => {
    // Moderation. The service skips the ownership clause for admins, and that
    // branch needs its own test or nothing covers it.
    const [author] = await seedUsers(makeUser({ username: 'author' }))
    const [subject] = await seedUsers(makeUser({ username: 'subject' }))
    const [admin] = await seedUsers(makeUser({ username: 'admin', isAdmin: true }))

    await as(author, request(app).post('/api/review').send(reviewBody(subject)))
    const [stored] = await findReviews()

    await as(admin, request(app).delete(`/api/review/${stored._id}`))

    expect(await countDocuments('review')).toBe(0)
  })
})

/**
 * ── Why the ⚠️ items are recorded here and not filed as bug docs ──────────
 * They are not defects in a feature that was designed and then broken. They
 * are an entire route group that predates the hardening pass every other group
 * received — so the honest framing is "this area has not been done yet", not
 * "this line is wrong". BUG-007 is filed separately because it IS a specific,
 * fixable defect with a clear cause.
 *
 * The ⚠️ tests are the specification for that work. Each asserts today's
 * behaviour, so all of them go RED the moment the endpoint is hardened —
 * exactly the signal wanted. When that happens they should be rewritten to
 * assert the new, correct behaviour rather than deleted; the scenarios are the
 * valuable part.
 */
