import express from 'express'

import { login, signup, logout, getLoggedinUser } from './auth.controller.js'
import { loginSchema, signupSchema } from './auth.schema.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authLimiter } from '../../middlewares/rateLimit.middleware.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'

const router = express.Router()

// Credential endpoints get a tighter limit than the rest of the API; only
// failed attempts count toward it, so real users are never locked out.
// validate() also strips undeclared fields, which is what keeps `isAdmin`
// from reaching the signup service.
router.post('/login', authLimiter, validate(loginSchema), login)
router.post('/signup', authLimiter, validate(signupSchema), signup)
router.post('/logout', logout)

// Deliberately NOT behind authLimiter: the client calls this on every app
// start, and it is a cookie read rather than a credential guess. Rate-limiting
// it would throttle ordinary navigation while blocking no attack — there is
// nothing here to brute-force.
router.get('/me', requireAuth, getLoggedinUser)

export const authRoutes = router