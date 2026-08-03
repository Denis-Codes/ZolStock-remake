import { ObjectId } from 'mongodb'

import { cartService } from '../cart/cart.service.js'
import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import { byIdOrSku, isObjectIdLike } from '../../services/query.util.js'
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../middlewares/error.middleware.js'

export const orderService = {
  checkout,
  getByUserId,
  getById,
  queryAll,
  updateStatus,
}

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

async function _collection() {
  return dbService.getCollection('orders')
}

/**
 * Reserves stock for one line, atomically.
 *
 * The guard is inside the filter, not a separate read: `stockQty: { $gte: qty }`
 * means Mongo only decrements if there is enough at the moment of the write.
 * A read-then-write would let two shoppers checking out simultaneously both
 * pass the check and oversell the last unit.
 */
async function _reserveStock(products, productId, qty) {
  const res = await products.updateOne(
    { ...byIdOrSku(productId), stockQty: { $gte: qty }, inStock: true },
    { $inc: { stockQty: -qty } }
  )
  return res.modifiedCount === 1
}

async function _releaseStock(products, productId, qty) {
  await products.updateOne(byIdOrSku(productId), {
    $inc: { stockQty: qty },
    $set: { inStock: true },
  })
}

/**
 * Turns the user's cart into an order.
 *
 * This deployment runs a standalone mongod, which has no multi-document
 * transactions, so atomicity across lines is achieved by compensation: each
 * line is reserved with a conditional decrement, and if any line fails every
 * previously reserved line is released before throwing. The result is that a
 * failed checkout never leaves stock held.
 */
async function checkout(userId, { shippingAddress, paymentMethod = 'simulated', notes = '' }) {
  const products = await dbService.getCollection('products')
  const reserved = []

  try {
    // Prices come from the catalogue here, never from the request body.
    const cart = await cartService.getByUserId(userId)

    if (!cart.items.length) throw new BadRequestError('Your cart is empty')

    const unavailable = cart.items.filter(line => line.exceedsStock)
    if (unavailable.length) {
      throw new ConflictError('Some items are no longer available in the requested quantity', {
        items: unavailable.map(line => ({
          productId: line.productId,
          requested: line.quantity,
          available: line.product.stockQty ?? 0,
        })),
      })
    }

    for (const line of cart.items) {
      const ok = await _reserveStock(products, line.productId, line.quantity)
      if (!ok) {
        throw new ConflictError(
          `"${line.product.displayNameHe || line.product.name}" sold out while you were checking out`,
          { productId: line.productId }
        )
      }
      reserved.push(line)
    }

    // Flip the in-stock flag for anything that just hit zero, so the
    // storefront's stock badges stay truthful.
    await products.updateMany({ stockQty: { $lte: 0 } }, { $set: { inStock: false } })

    // Simulated payment. There is no gateway wired up; this records the
    // intent and marks the order paid so the rest of the flow is exercisable.
    const payment = {
      method: paymentMethod,
      status: 'paid',
      simulated: true,
      paidAt: new Date(),
      reference: `SIM-${Date.now().toString(36).toUpperCase()}`,
    }

    const order = {
      userId,
      // A price snapshot: the order must reflect what was charged, even after
      // the catalogue price changes later.
      items: cart.items.map(line => ({
        productId: line.productId,
        sku: line.product.sku,
        displayNameHe: line.product.displayNameHe,
        name: line.product.name,
        image: line.product.images?.[0] || null,
        variant: line.variant || null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        originalPrice: line.product.originalPrice ?? line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      totals: cart.totals,
      shippingAddress,
      payment,
      notes,
      status: 'paid',
      statusHistory: [{ status: 'paid', at: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const collection = await _collection()
    const { insertedId } = await collection.insertOne(order)

    await cartService.clear(userId)

    logger.info(`Order ${insertedId} placed by user ${userId}, total ${order.totals.total}`)
    return { ...order, _id: insertedId }
  } catch (err) {
    // Compensating rollback — give back everything this attempt took.
    for (const line of reserved) {
      try {
        await _releaseStock(products, line.productId, line.quantity)
      } catch (releaseErr) {
        logger.error(`FAILED to release stock for ${line.productId} after checkout failure`, releaseErr)
      }
    }

    if (err instanceof BadRequestError || err instanceof ConflictError) throw err
    logger.error(`checkout failed for user ${userId}`, err)
    throw err
  }
}

async function getByUserId(userId) {
  try {
    const collection = await _collection()
    return await collection.find({ userId }).sort({ createdAt: -1 }).toArray()
  } catch (err) {
    logger.error(`cannot get orders for user ${userId}`, err)
    throw err
  }
}

async function getById(orderId, loggedinUser) {
  try {
    if (!isObjectIdLike(orderId)) throw new NotFoundError(`Order ${orderId} not found`)

    const collection = await _collection()
    const order = await collection.findOne({ _id: ObjectId.createFromHexString(orderId) })
    if (!order) throw new NotFoundError(`Order ${orderId} not found`)

    // Checked here rather than in the query so an unauthorised read is
    // distinguishable from a missing order in the logs.
    if (!loggedinUser.isAdmin && order.userId !== loggedinUser._id) {
      throw new ForbiddenError('This is not your order')
    }

    return order
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) throw err
    logger.error(`cannot get order ${orderId}`, err)
    throw err
  }
}

async function queryAll(filterBy = {}) {
  try {
    const criteria = {}
    if (filterBy.status) criteria.status = filterBy.status
    if (filterBy.userId) criteria.userId = filterBy.userId

    const collection = await _collection()
    return await collection.find(criteria).sort({ createdAt: -1 }).toArray()
  } catch (err) {
    logger.error('cannot query orders', err)
    throw err
  }
}

async function updateStatus(orderId, status) {
  try {
    if (!ORDER_STATUSES.includes(status)) {
      throw new BadRequestError(`Status must be one of: ${ORDER_STATUSES.join(', ')}`)
    }
    if (!isObjectIdLike(orderId)) throw new NotFoundError(`Order ${orderId} not found`)

    const _id = ObjectId.createFromHexString(orderId)
    const collection = await _collection()

    const res = await collection.findOneAndUpdate(
      { _id },
      {
        $set: { status, updatedAt: new Date() },
        $push: { statusHistory: { status, at: new Date() } },
      },
      { returnDocument: 'after' }
    )

    const order = res?.value ?? res
    if (!order) throw new NotFoundError(`Order ${orderId} not found`)
    return order
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) throw err
    logger.error(`cannot update order ${orderId}`, err)
    throw err
  }
}
