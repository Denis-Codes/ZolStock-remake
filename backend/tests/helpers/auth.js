import { authService } from '../../api/auth/auth.service.js'

/**
 * Builds a session cookie for a user without going through the login endpoint.
 *
 * ── Why not just log in ──────────────────────────────────────────────────
 * Because almost every authenticated test would then depend on login working.
 * When login breaks you want ONE red test — the login test — not four hundred.
 * A test's setup should not silently exercise unrelated features, or a single
 * bug produces a wall of failures that hides where the problem is.
 *
 * There is also a cost argument: login runs bcrypt.compare, which is
 * deliberately slow (~100ms). Paying that in the arrange step of every test is
 * minutes of wall-clock across a suite.
 *
 * ── Why use the app's own token minter ───────────────────────────────────
 * This calls authService.getLoginToken rather than encrypting a payload
 * itself. If a test hand-rolled the token format, changing how sessions are
 * encoded would break every test rather than the auth module — and worse, the
 * tests could keep passing against a format the app no longer issues.
 *
 * Going through the real function means the tests follow the implementation
 * automatically. Stage 1 adds expiry to this payload, and nothing here changes.
 */
export function cookieFor(user) {
  const token = authService.getLoginToken({
    _id: String(user._id),
    fullname: user.fullname,
    score: user.score,
    isAdmin: !!user.isAdmin,
  })

  // supertest's .set('Cookie', ...) expects the wire format, not an object.
  return `loginToken=${token}`
}

/**
 * A cookie that is well-formed but cannot be decrypted — for asserting that a
 * tampered or foreign token is rejected as unauthenticated rather than
 * crashing the request.
 */
export function invalidCookie() {
  return 'loginToken=not-a-real-encrypted-token'
}

/**
 * A token minted with a DIFFERENT secret, i.e. what an attacker who guessed
 * the payload shape but not the key would produce. Proves the secret is doing
 * work, which is exactly the property stage 1's fail-fast check protects.
 */
export async function cookieWithWrongSecret(user) {
  const { default: Cryptr } = await import('cryptr')
  const foreign = new Cryptr('a-completely-different-secret')

  const token = foreign.encrypt(
    JSON.stringify({
      _id: String(user._id),
      fullname: user.fullname,
      score: user.score,
      isAdmin: true, // the escalation an attacker would attempt
    })
  )

  return `loginToken=${token}`
}
