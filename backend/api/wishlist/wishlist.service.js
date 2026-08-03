import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import { byIdOrSku } from '../../services/query.util.js'
import { NotFoundError } from '../../middlewares/error.middleware.js'

export const wishlistService = {
  getByUserId,
  addProduct,
  removeProduct,
  clear,
  merge,
}

async function _collection() {
  return dbService.getCollection('wishlists')
}

async function _getRaw(userId) {
  const collection = await _collection()
  const wishlist = await collection.findOne({ userId })
  return wishlist || { userId, productIds: [] }
}

/**
 * Returns the full product documents, not just ids, so the wishlist page can
 * render without a second round trip per item. Ids whose product has been
 * retired are skipped rather than returned as holes.
 */
async function getByUserId(userId) {
  try {
    const { productIds } = await _getRaw(userId)
    if (!productIds.length) return { userId, products: [], productIds: [] }

    const collection = await dbService.getCollection('products')
    const products = await collection
      .find({ $or: productIds.map(id => byIdOrSku(id)) })
      .toArray()

    return { userId, productIds, products }
  } catch (err) {
    logger.error(`cannot get wishlist for user ${userId}`, err)
    throw err
  }
}

async function addProduct(userId, productId) {
  try {
    const products = await dbService.getCollection('products')
    const product = await products.findOne(byIdOrSku(productId))
    if (!product) throw new NotFoundError(`Product ${productId} not found`)

    const collection = await _collection()
    // $addToSet makes this idempotent — double-tapping the heart icon on a
    // slow connection cannot create a duplicate entry.
    await collection.updateOne(
      { userId },
      {
        $addToSet: { productIds: String(productId) },
        $set: { updatedAt: new Date() },
        $setOnInsert: { userId, createdAt: new Date() },
      },
      { upsert: true }
    )

    return getByUserId(userId)
  } catch (err) {
    if (err instanceof NotFoundError) throw err
    logger.error(`cannot add product ${productId} to wishlist`, err)
    throw err
  }
}

async function removeProduct(userId, productId) {
  try {
    const collection = await _collection()
    await collection.updateOne(
      { userId },
      { $pull: { productIds: String(productId) }, $set: { updatedAt: new Date() } }
    )
    return getByUserId(userId)
  } catch (err) {
    logger.error(`cannot remove product ${productId} from wishlist`, err)
    throw err
  }
}

async function clear(userId) {
  try {
    const collection = await _collection()
    await collection.updateOne(
      { userId },
      { $set: { productIds: [], updatedAt: new Date() } },
      { upsert: true }
    )
    return getByUserId(userId)
  } catch (err) {
    logger.error(`cannot clear wishlist for user ${userId}`, err)
    throw err
  }
}

/** Folds a guest wishlist into the stored one on login. */
async function merge(userId, productIds = []) {
  try {
    if (productIds.length) {
      const collection = await _collection()
      await collection.updateOne(
        { userId },
        {
          $addToSet: { productIds: { $each: productIds.map(String) } },
          $set: { updatedAt: new Date() },
          $setOnInsert: { userId, createdAt: new Date() },
        },
        { upsert: true }
      )
    }
    return getByUserId(userId)
  } catch (err) {
    logger.error(`cannot merge wishlist for user ${userId}`, err)
    throw err
  }
}
