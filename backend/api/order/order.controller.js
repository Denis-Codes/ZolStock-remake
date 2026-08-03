import { orderService } from './order.service.js'
import { asyncHandler } from '../../middlewares/error.middleware.js'

export const checkout = asyncHandler(async (req, res) => {
  const order = await orderService.checkout(req.loggedinUser._id, req.body)
  res.status(201).json(order)
})

export const getMyOrders = asyncHandler(async (req, res) => {
  res.json(await orderService.getByUserId(req.loggedinUser._id))
})

export const getOrder = asyncHandler(async (req, res) => {
  res.json(await orderService.getById(req.params.id, req.loggedinUser))
})

export const getAllOrders = asyncHandler(async (req, res) => {
  res.json(
    await orderService.queryAll({
      status: req.query.status || '',
      userId: req.query.userId || '',
    })
  )
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  res.json(await orderService.updateStatus(req.params.id, req.body.status))
})
