import express from 'express'

import { getUser, getUsers, deleteUser, updateUser } from './user.controller.js'
import { updateUserSchema } from './user.schema.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { requireAuth, requireAdmin } from '../../middlewares/requireAuth.middleware.js'

const router = express.Router()

// Listing every user was public. The admin page only checks isAdmin in the
// browser, so this data was readable by anyone calling the API directly.
router.get('/', requireAuth, requireAdmin, getUsers)

router.get('/:id', requireAuth, getUser)

// updateUser additionally enforces that a non-admin may only update their own
// record — the route alone cannot express that.
router.put('/:id', requireAuth, validate(updateUserSchema), updateUser)

router.delete('/:id', requireAuth, requireAdmin, deleteUser)

export const userRoutes = router
