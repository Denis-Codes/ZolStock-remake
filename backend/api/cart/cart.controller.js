import { cartService } from './cart.service.js'
import { asyncHandler } from '../../middlewares/error.middleware.js'

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getByUserId(req.loggedinUser._id)
  res.json(cart)
})

export const addToCart = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.loggedinUser._id, req.body)
  res.json(cart)
})

export const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItemQty(
    req.loggedinUser._id,
    req.params.itemId,
    req.body.quantity
  )
  res.json(cart)
})

export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.loggedinUser._id, req.params.itemId)
  res.json(cart)
})

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clear(req.loggedinUser._id)
  res.json(cart)
})

export const mergeCart = asyncHandler(async (req, res) => {
  const cart = await cartService.merge(req.loggedinUser._id, req.body.items)
  res.json(cart)
})
