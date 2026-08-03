import { wishlistService } from './wishlist.service.js'
import { asyncHandler } from '../../middlewares/error.middleware.js'

export const getWishlist = asyncHandler(async (req, res) => {
  res.json(await wishlistService.getByUserId(req.loggedinUser._id))
})

export const addToWishlist = asyncHandler(async (req, res) => {
  res.json(await wishlistService.addProduct(req.loggedinUser._id, req.params.productId))
})

export const removeFromWishlist = asyncHandler(async (req, res) => {
  res.json(await wishlistService.removeProduct(req.loggedinUser._id, req.params.productId))
})

export const clearWishlist = asyncHandler(async (req, res) => {
  res.json(await wishlistService.clear(req.loggedinUser._id))
})

export const mergeWishlist = asyncHandler(async (req, res) => {
  res.json(await wishlistService.merge(req.loggedinUser._id, req.body.productIds))
})
