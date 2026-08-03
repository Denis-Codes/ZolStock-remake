import express from 'express'

import { validate } from '../../middlewares/validate.middleware.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { addItemSchema, updateQtySchema, mergeCartSchema } from './cart.schema.js'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
} from './cart.controller.js'

const router = express.Router()

// A cart always belongs to the signed-in user; there is no :userId in any
// path, so one shopper can never address another's cart.
router.use(requireAuth)

router.get('/', getCart)
router.post('/item', validate(addItemSchema), addToCart)
router.put('/item/:itemId', validate(updateQtySchema), updateCartItem)
router.delete('/item/:itemId', removeCartItem)
router.delete('/', clearCart)

// Called once after login to fold in whatever the shopper collected as a guest.
router.post('/merge', validate(mergeCartSchema), mergeCart)

export const cartRoutes = router
