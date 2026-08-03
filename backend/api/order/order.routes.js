import express from 'express'

import { validate } from '../../middlewares/validate.middleware.js'
import { checkoutSchema, updateStatusSchema } from './order.schema.js'
import { requireAuth, requireAdmin } from '../../middlewares/requireAuth.middleware.js'
import {
  checkout,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
} from './order.controller.js'

const router = express.Router()

router.use(requireAuth)

// Declared before /:id so "all" is not read as an order id.
router.get('/all', requireAdmin, getAllOrders)

router.get('/', getMyOrders)
router.post('/', validate(checkoutSchema), checkout)

// getById enforces that a non-admin may only read their own order.
router.get('/:id', getOrder)

router.put('/:id/status', requireAdmin, validate(updateStatusSchema), updateOrderStatus)

export const orderRoutes = router
