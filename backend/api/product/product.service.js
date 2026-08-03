import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { escapeRegex, byIdOrSku } from '../../services/query.util.js'
import { NotFoundError, ForbiddenError } from '../../middlewares/error.middleware.js'

const DEFAULT_PAGE_SIZE = 20

export const productService = {
  remove,
  query,
  getById,
  add,
  update,
  addProductMsg,
  removeProductMsg,
  getCategories,
  getSubCategories,
}

async function query(filterBy = {}) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('products')
    let cursor = collection.find(criteria).sort(sort)

    // Only paginate when the caller explicitly asks. The previous controller
    // defaulted pageIdx to 0, which silently capped every response at 20 of
    // the 40 products — the storefront requests no pageIdx and expects the
    // full result set.
    if (filterBy.pageIdx !== null && filterBy.pageIdx !== undefined) {
      const pageSize = filterBy.pageSize || DEFAULT_PAGE_SIZE
      cursor = cursor.skip(filterBy.pageIdx * pageSize).limit(pageSize)
    }

    return await cursor.toArray()
  } catch (err) {
    logger.error('cannot find products', err)
    throw err
  }
}

/** Accepts an ObjectId hex string or a legacy "p1001" sku. */
async function getById(productId) {
  try {
    const collection = await dbService.getCollection('products')
    const product = await collection.findOne(byIdOrSku(productId))

    if (!product) throw new NotFoundError(`Product ${productId} not found`)
    return product
  } catch (err) {
    if (err instanceof NotFoundError) throw err
    logger.error(`while finding product ${productId}`, err)
    throw err
  }
}

async function remove(productId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = byIdOrSku(productId)
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('products')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw new ForbiddenError('Not your product')
    return productId
  } catch (err) {
    if (err instanceof ForbiddenError) throw err
    logger.error(`cannot remove product ${productId}`, err)
    throw err
  }
}

async function add(product) {
  try {
    const collection = await dbService.getCollection('products')
    await collection.insertOne({
      ...product,
      searchText: _buildSearchText(product),
      createdAt: new Date(),
    })
    return product
  } catch (err) {
    logger.error('cannot insert product', err)
    throw err
  }
}

async function update(product) {
  try {
    const { _id, ...productToSave } = product
    // Keep the denormalised search haystack in step with the fields it
    // mirrors, or an edited product stops matching its own new name.
    productToSave.searchText = _buildSearchText(product)
    productToSave.updatedAt = new Date()

    const collection = await dbService.getCollection('products')
    await collection.updateOne(byIdOrSku(_id), { $set: productToSave })

    return product
  } catch (err) {
    logger.error(`cannot update product ${product?._id}`, err)
    throw err
  }
}

/**
 * Returns [{ slug, labelHe }] rather than bare slug strings.
 *
 * `distinct('category')` returned ['housewares', ...], but every consumer in
 * the storefront reads `.slug` and `.labelHe` — matching the local service's
 * shape — so bare strings rendered as blank category labels.
 */
async function getCategories() {
  try {
    const collection = await dbService.getCollection('products')
    const rows = await collection
      .aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: '$category', labelHe: { $first: '$displayCategoryHe' } } },
        { $project: { _id: 0, slug: '$_id', labelHe: 1 } },
        { $sort: { slug: 1 } },
      ])
      .toArray()

    return rows
  } catch (err) {
    logger.error('cannot get categories', err)
    throw err
  }
}

/** Returns [{ slug, labelHe, category }] — same contract as the local service. */
async function getSubCategories(category) {
  try {
    const collection = await dbService.getCollection('products')
    const match = { subCategory: { $ne: null } }
    if (category) match.category = category

    const rows = await collection
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$subCategory',
            labelHe: { $first: '$displaySubCategoryHe' },
            category: { $first: '$category' },
          },
        },
        { $project: { _id: 0, slug: '$_id', labelHe: 1, category: 1 } },
        { $sort: { slug: 1 } },
      ])
      .toArray()

    return rows
  } catch (err) {
    logger.error('cannot get sub categories', err)
    throw err
  }
}

async function addProductMsg(productId, msg) {
  try {
    msg.id = makeId()

    const collection = await dbService.getCollection('products')
    await collection.updateOne(byIdOrSku(productId), { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add product msg ${productId}`, err)
    throw err
  }
}

async function removeProductMsg(productId, msgId) {
  try {
    const collection = await dbService.getCollection('products')
    await collection.updateOne(byIdOrSku(productId), { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot remove product msg ${productId}`, err)
    throw err
  }
}

/** Mirrors the seed script's haystack so added/edited products stay searchable. */
function _buildSearchText(product = {}) {
  return [
    product.name,
    product.displayNameHe,
    product.brand,
    product.displayCategoryHe,
    product.displaySubCategoryHe,
    ...(product.tags || []),
    ...(product.displayTagsHe || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function _buildCriteria(filterBy = {}) {
  const criteria = {}

  // Substring match against the denormalised haystack, which covers Hebrew
  // display names, brand and both tag lists. The previous version regexed
  // only `name` and a `vendor` field that does not exist in this schema, so
  // every Hebrew search returned nothing.
  //
  // Regex rather than the $text operator on purpose: $text matches whole
  // words only, so search-as-you-type ("אחס") would find nothing until the
  // shopper finished the word.
  if (filterBy.txt) {
    criteria.searchText = { $regex: escapeRegex(filterBy.txt.trim().toLowerCase()) }
  }

  if (filterBy.category) criteria.category = filterBy.category
  if (filterBy.subCategory) criteria.subCategory = filterBy.subCategory

  const priceCriteria = {}
  if (filterBy.minPrice !== null && filterBy.minPrice !== undefined) {
    priceCriteria.$gte = filterBy.minPrice
  }
  if (filterBy.maxPrice !== null && filterBy.maxPrice !== undefined) {
    priceCriteria.$lte = filterBy.maxPrice
  }
  if (Object.keys(priceCriteria).length) criteria.price = priceCriteria

  // Was built here but never reached: the controller did not read inStock off
  // the query string, so the sidebar's in-stock toggle did nothing.
  if (filterBy.inStock !== null && filterBy.inStock !== undefined) {
    criteria.inStock = filterBy.inStock
  }

  return criteria
}

// Only fields that exist on a product may be sorted on. An arbitrary
// user-supplied sortField would otherwise let a caller sort by any internal
// field and probe the document shape.
const SORTABLE_FIELDS = new Set([
  'price',
  'salePrice',
  'originalPrice',
  'discountPercent',
  'rating',
  'reviewCount',
  'stockQty',
  'displayNameHe',
  'name',
])

function _buildSort(filterBy = {}) {
  if (!filterBy.sortField || !SORTABLE_FIELDS.has(filterBy.sortField)) return {}
  const dir = +filterBy.sortDir === -1 ? -1 : 1
  return { [filterBy.sortField]: dir }
}
