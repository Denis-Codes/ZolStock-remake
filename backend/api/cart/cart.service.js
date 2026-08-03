import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import { makeId } from '../../services/util.service.js'
import { byIdOrSku } from '../../services/query.util.js'
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware.js'

export const cartService = {
  getByUserId,
  addItem,
  updateItemQty,
  removeItem,
  clear,
  merge,
  resolveLines,
}

/**
 * Delivery pricing.
 *
 * PLACEHOLDER COMMERCIAL VALUES — confirm before this is presented as a real
 * chain's terms. The ₪300 threshold is inherited from copy already shown on
 * the cart page ("חינם מעל ₪300"); the flat fee below is not sourced from
 * anything and is the one number here that was chosen rather than found.
 *
 * Kept server-side because the client must not be able to price its own
 * delivery, for the same reason it cannot price its own products.
 */
export const FREE_SHIPPING_THRESHOLD = 300
export const SHIPPING_FLAT_FEE = 29

function calcShipping(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_FEE
}

/**
 * A cart stores product *references* and quantities only — never prices.
 *
 * Prices are resolved from the products collection on every read and again at
 * checkout. Trusting a client-supplied price is the classic storefront
 * vulnerability: a shopper could POST a cart line at ₪0.01 and check out at
 * that price. The client may display whatever it likes; the server prices the
 * order.
 */
async function _collection() {
  return dbService.getCollection('carts')
}

async function _getRaw(userId) {
  const collection = await _collection()
  const cart = await collection.findOne({ userId })
  return cart || { userId, items: [] }
}

/**
 * Enriches stored lines with live product data and computes totals.
 *
 * Lines whose product has since been deleted from the catalogue are dropped
 * rather than erroring, so one retired product cannot make a shopper's whole
 * cart unopenable.
 */
async function resolveLines(items = []) {
  if (!items.length) {
    return {
      items: [],
      totals: {
        itemCount: 0,
        subtotal: 0,
        savings: 0,
        shipping: 0,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        amountToFreeShipping: FREE_SHIPPING_THRESHOLD,
        total: 0,
        currency: 'ILS',
      },
    }
  }

  const products = await dbService.getCollection('products')
  const found = await products
    .find({ $or: items.map(item => byIdOrSku(item.productId)) })
    .toArray()

  // Index by both keys so a line referencing either form resolves.
  const byKey = new Map()
  found.forEach(product => {
    byKey.set(String(product._id), product)
    if (product.sku) byKey.set(product.sku, product)
  })

  const resolved = []
  for (const item of items) {
    const product = byKey.get(String(item.productId))
    if (!product) continue

    const unitPrice = product.salePrice ?? product.price ?? 0
    const originalPrice = product.originalPrice ?? unitPrice

    resolved.push({
      ...item,
      product: {
        _id: product._id,
        sku: product.sku,
        displayNameHe: product.displayNameHe,
        name: product.name,
        images: product.images,
        category: product.category,
        subCategory: product.subCategory,
        inStock: product.inStock,
        stockQty: product.stockQty,
        price: product.price,
        salePrice: product.salePrice,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        currency: product.currency,
      },
      unitPrice,
      lineTotal: +(unitPrice * item.quantity).toFixed(2),
      // Flagged rather than silently corrected, so the cart page can tell the
      // shopper why a quantity cannot be fulfilled.
      exceedsStock: !product.inStock || item.quantity > (product.stockQty ?? 0),
    })
  }

  const subtotal = resolved.reduce((sum, line) => sum + line.lineTotal, 0)
  const savings = resolved.reduce((sum, line) => {
    const original = line.product.originalPrice ?? line.unitPrice
    return sum + (original - line.unitPrice) * line.quantity
  }, 0)

  const roundedSubtotal = +subtotal.toFixed(2)
  const shipping = calcShipping(roundedSubtotal)

  return {
    items: resolved,
    totals: {
      itemCount: resolved.reduce((n, line) => n + line.quantity, 0),
      subtotal: roundedSubtotal,
      savings: +savings.toFixed(2),
      shipping,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      // Drives the "add ₪X more for free delivery" nudge. Zero once earned.
      amountToFreeShipping: +Math.max(0, FREE_SHIPPING_THRESHOLD - roundedSubtotal).toFixed(2),
      total: +(roundedSubtotal + shipping).toFixed(2),
      currency: 'ILS',
    },
  }
}

async function getByUserId(userId) {
  try {
    const cart = await _getRaw(userId)
    return { userId, ...(await resolveLines(cart.items)) }
  } catch (err) {
    logger.error(`cannot get cart for user ${userId}`, err)
    throw err
  }
}

/**
 * Identifies a line. Two entries of the same product in different variants
 * are separate lines; the same product in the same variant merges.
 */
function _variantKey(productId, variant) {
  if (!variant) return String(productId)
  const parts = [variant.size, variant.color].filter(Boolean).join('-')
  return parts ? `${productId}-${parts}` : String(productId)
}

async function addItem(userId, { productId, quantity = 1, variant = null }) {
  try {
    const products = await dbService.getCollection('products')
    const product = await products.findOne(byIdOrSku(productId))
    if (!product) throw new NotFoundError(`Product ${productId} not found`)

    const variantKey = _variantKey(productId, variant)
    const collection = await _collection()
    const cart = await _getRaw(userId)

    const existing = cart.items.find(item => item.variantKey === variantKey)
    const newQty = (existing?.quantity || 0) + quantity

    if (newQty > (product.stockQty ?? 0)) {
      throw new BadRequestError(
        `Only ${product.stockQty ?? 0} left in stock`,
        { productId, available: product.stockQty ?? 0 }
      )
    }

    if (existing) {
      await collection.updateOne(
        { userId, 'items.variantKey': variantKey },
        { $set: { 'items.$.quantity': newQty, updatedAt: new Date() } }
      )
    } else {
      await collection.updateOne(
        { userId },
        {
          $push: {
            items: {
              itemId: makeId(8),
              productId: String(productId),
              quantity,
              variant,
              variantKey,
              addedAt: new Date(),
            },
          },
          $set: { updatedAt: new Date() },
          $setOnInsert: { userId, createdAt: new Date() },
        },
        { upsert: true }
      )
    }

    return getByUserId(userId)
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) throw err
    logger.error(`cannot add item to cart for user ${userId}`, err)
    throw err
  }
}

async function updateItemQty(userId, itemId, quantity) {
  try {
    const collection = await _collection()
    const cart = await _getRaw(userId)
    const item = cart.items.find(line => line.itemId === itemId)
    if (!item) throw new NotFoundError(`Cart item ${itemId} not found`)

    if (quantity <= 0) return removeItem(userId, itemId)

    const products = await dbService.getCollection('products')
    const product = await products.findOne(byIdOrSku(item.productId))
    if (product && quantity > (product.stockQty ?? 0)) {
      throw new BadRequestError(
        `Only ${product.stockQty ?? 0} left in stock`,
        { productId: item.productId, available: product.stockQty ?? 0 }
      )
    }

    await collection.updateOne(
      { userId, 'items.itemId': itemId },
      { $set: { 'items.$.quantity': quantity, updatedAt: new Date() } }
    )

    return getByUserId(userId)
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) throw err
    logger.error(`cannot update cart item ${itemId}`, err)
    throw err
  }
}

async function removeItem(userId, itemId) {
  try {
    const collection = await _collection()
    await collection.updateOne(
      { userId },
      { $pull: { items: { itemId } }, $set: { updatedAt: new Date() } }
    )
    return getByUserId(userId)
  } catch (err) {
    logger.error(`cannot remove cart item ${itemId}`, err)
    throw err
  }
}

async function clear(userId) {
  try {
    const collection = await _collection()
    await collection.updateOne(
      { userId },
      { $set: { items: [], updatedAt: new Date() } },
      { upsert: true }
    )
    return getByUserId(userId)
  } catch (err) {
    logger.error(`cannot clear cart for user ${userId}`, err)
    throw err
  }
}

/**
 * Folds a guest cart (built in localStorage before signing in) into the
 * stored one. Quantities are summed for lines already present rather than
 * overwritten, so signing in never silently discards what a shopper picked.
 */
async function merge(userId, guestItems = []) {
  try {
    for (const guestItem of guestItems) {
      try {
        await addItem(userId, {
          productId: guestItem.productId,
          quantity: guestItem.quantity || 1,
          variant: guestItem.variant || null,
        })
      } catch (err) {
        // A retired product or a stock ceiling must not abort the whole
        // merge — skip that line and keep the rest.
        logger.warn(`skipping guest cart line ${guestItem.productId}: ${err.message}`)
      }
    }
    return getByUserId(userId)
  } catch (err) {
    logger.error(`cannot merge cart for user ${userId}`, err)
    throw err
  }
}
