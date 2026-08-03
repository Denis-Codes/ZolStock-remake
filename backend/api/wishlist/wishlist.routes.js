import express from 'express'
import { z } from 'zod'

import { validate } from '../../middlewares/validate.middleware.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  mergeWishlist,
} from './wishlist.controller.js'

const mergeWishlistSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).max(200).default([]),
})

const router = express.Router()

// Like the cart, a wishlist is always the signed-in user's own.
router.use(requireAuth)

router.get('/', getWishlist)
router.post('/merge', validate(mergeWishlistSchema), mergeWishlist)
router.post('/:productId', addToWishlist)
router.delete('/:productId', removeFromWishlist)
router.delete('/', clearWishlist)

export const wishlistRoutes = router
