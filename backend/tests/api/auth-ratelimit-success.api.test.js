import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { seedUsers } from '../helpers/db.js'
import { makeUser, TEST_PASSWORD } from '../helpers/factories.js'

/**
 * The other half of the rate-limiter contract, in its own file because it needs
 * an untouched counter — see the long explanation in auth-ratelimit.api.test.js.
 *
 * A limiter that blocks attackers is only half a working limiter. The half that
 * gets forgotten is that it must not block real people.
 */
const app = createApp({ enableRateLimit: false })

const LIMIT = 10

describe('credential rate limiting — legitimate traffic', () => {
  it('does not count successful logins against the limit', async () => {
    /**
     * `skipSuccessfulRequests: true`, and it matters more than it sounds.
     *
     * Rate limits are keyed by IP address. An office, a household, a school or
     * anyone behind mobile carrier NAT shares one address — so without this
     * flag, ten people signing in normally would exhaust a budget meant for an
     * attacker, and the eleventh colleague is locked out for fifteen minutes
     * having done nothing wrong.
     *
     * Counting only FAILURES targets the behaviour that is actually
     * suspicious: someone guessing.
     *
     * Twelve successful logins here — two past the limit — and none refused.
     */
    await seedUsers(makeUser({ username: 'regular' }))

    for (let i = 0; i < LIMIT + 2; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'regular', password: TEST_PASSWORD })

      // Asserting inside the loop so a failure names the attempt that broke,
      // rather than just reporting that something, somewhere, went wrong.
      expect(res.status, `login attempt ${i + 1} should succeed`).toBe(200)
    }
  })
})
