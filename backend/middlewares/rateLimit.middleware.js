import rateLimit from 'express-rate-limit'

/**
 * Broad ceiling for the whole API. Generous on purpose — a shopper loading a
 * category page fires several requests at once, so this is here to stop
 * scripted abuse, not to shape normal browsing.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { err: 'Too many requests, please slow down' },
})

/**
 * Tight limit for credential endpoints (login/signup), where the cost of
 * abuse is credential stuffing rather than load. Only failed attempts count,
 * so a legitimate user who logs in successfully is never locked out.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { err: 'Too many login attempts, try again in 15 minutes' },
})
