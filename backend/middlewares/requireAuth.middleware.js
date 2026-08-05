import { config } from '../config/index.js'
import { logger } from '../services/logger.service.js'
import { asyncLocalStorage } from '../services/als.service.js'

/**
 * These answer JSON, like every other error in the API.
 *
 * They used to answer `res.send('Not Authenticated')` — which sets
 * Content-Type: text/html — and `res.end('Not Authorized')`, which negotiates
 * no content type at all. So the two most frequent failures in the whole API,
 * an expired session and a permission refusal, were the two a client doing
 * `await res.json()` could not parse: it got a SyntaxError naming the letter
 * N instead of a reason it could show the user. See bugs/BUG-008.
 *
 * This middleware predates errorHandler and notFoundHandler, both of which
 * already send `{ err }`. Nothing here was broken — it was simply never
 * brought forward when the rest of the error handling was standardised.
 */
const NOT_AUTHENTICATED = 'Not authenticated'
const NOT_AUTHORIZED = 'Not authorized'

export function requireAuth(req, res, next) {
	const { loggedinUser } = asyncLocalStorage.getStore()
	req.loggedinUser = loggedinUser

	if (config.isGuestMode && !loggedinUser) {
		req.loggedinUser = { _id: '', fullname: 'Guest' }
		return next()
	}
	if (!loggedinUser) return res.status(401).json({ err: NOT_AUTHENTICATED })
	next()
}

export function requireAdmin(req, res, next) {
	const { loggedinUser } = asyncLocalStorage.getStore()

	if (!loggedinUser) return res.status(401).json({ err: NOT_AUTHENTICATED })
	if (!loggedinUser.isAdmin) {
		logger.warn(loggedinUser.fullname + ' attempted to perform admin action')
		return res.status(403).json({ err: NOT_AUTHORIZED })
	}
	next()
}
