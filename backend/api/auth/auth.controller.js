import { authService } from './auth.service.js'
import { logger } from '../../services/logger.service.js'
import { asyncHandler, UnauthorizedError, BadRequestError } from '../../middlewares/error.middleware.js'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Cookie options for the session token.
 *
 * httpOnly was missing, which left the login token readable by any script on
 * the page — an XSS bug anywhere in the storefront became full session theft.
 * The client never needs to read it: axios sends it automatically via
 * withCredentials.
 *
 * sameSite 'None' + secure is required because the Vite dev server (:5173)
 * and this API (:3030) are different origins. Browsers treat http://localhost
 * as a trustworthy context, so a Secure cookie is still accepted in dev.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'None',
  secure: true,
  path: '/',
}

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body

  let user
  try {
    user = await authService.login(username, password)
  } catch (err) {
    // Deliberately generic: distinguishing "no such user" from "wrong
    // password" lets an attacker enumerate valid usernames.
    logger.warn(`Failed login attempt for username: ${username}`)
    throw new UnauthorizedError('Invalid username or password')
  }

  const loginToken = authService.getLoginToken(user)

  // Log the id only. The whole user object was logged before, writing
  // personal details into logs/ on every login.
  logger.info(`User login: ${user._id}`)

  res.cookie('loginToken', loginToken, { ...COOKIE_OPTIONS, maxAge: ONE_WEEK_MS })
  res.json(user)
})

export const signup = asyncHandler(async (req, res) => {
  const credentials = req.body

  let user
  try {
    await authService.signup(credentials)
    user = await authService.login(credentials.username, credentials.password)
  } catch (err) {
    throw new BadRequestError(typeof err === 'string' ? err : 'Failed to sign up')
  }

  const loginToken = authService.getLoginToken(user)
  logger.info(`User signup: ${user._id}`)

  res.cookie('loginToken', loginToken, { ...COOKIE_OPTIONS, maxAge: ONE_WEEK_MS })
  res.json(user)
})

/**
 * Who is this request from?
 *
 * Added for BUG-005. The client used to answer this from `sessionStorage`,
 * which is scoped per tab — so a link opened in a new tab looked signed out
 * while the session cookie was sitting right there, valid.
 *
 * The cookie is the session. This endpoint is how the client asks about it
 * instead of keeping a second, worse copy of the answer.
 *
 * Behind `requireAuth`, so a guest gets a 401 rather than a 200 with null —
 * "not signed in" is a status, not a payload. The client treats that 401 as
 * the ordinary answer for a guest, not an error.
 *
 * `req.loggedinUser` is set by requireAuth from the token the cookie carries,
 * so nothing here trusts a request body.
 */
export const getLoggedinUser = asyncHandler(async (req, res) => {
  res.json(req.loggedinUser)
})

export const logout = asyncHandler(async (req, res) => {
  // clearCookie only matches when the attributes match those it was set with;
  // otherwise the browser keeps the cookie and the user stays logged in.
  res.clearCookie('loginToken', COOKIE_OPTIONS)
  res.json({ msg: 'Logged out successfully' })
})
