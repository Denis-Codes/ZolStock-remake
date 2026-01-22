import { ObjectId } from 'mongodb'
import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 20

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

    if (filterBy.pageIdx !== undefined) {
      cursor = cursor.skip(+filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

    const products = await cursor.toArray()
    return products
  } catch (err) {
    logger.error('cannot find products', err)
    throw err
  }
}

async function getById(productId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(productId) }
    const collection = await dbService.getCollection('products')
    const product = await collection.findOne(criteria)
    return product
  } catch (err) {
    logger.error(`while finding product ${productId}`, err)
    throw err
  }
}

async function remove(productId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = { _id: ObjectId.createFromHexString(productId) }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('products')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw new Error('Not your product')
    return productId
  } catch (err) {
    logger.error(`cannot remove product ${productId}`, err)
    throw err
  }
}

async function add(product) {
  try {
    const collection = await dbService.getCollection('products')
    await collection.insertOne(product)
    return product
  } catch (err) {
    logger.error('cannot insert product', err)
    throw err
  }
}

async function update(product) {
  try {
    const { _id, ...productToSave } = product
    const criteria = { _id: ObjectId.createFromHexString(_id) }

    const collection = await dbService.getCollection('products')
    await collection.updateOne(criteria, { $set: productToSave })

    return product
  } catch (err) {
    logger.error(`cannot update product ${product?._id}`, err)
    throw err
  }
}

async function getCategories() {
  try {
    const collection = await dbService.getCollection('products')
    const categories = await collection.distinct('category')
    return categories.filter(Boolean)
  } catch (err) {
    logger.error('cannot get categories', err)
    throw err
  }
}

async function getSubCategories(category) {
  try {
    const collection = await dbService.getCollection('products')
    const filter = category ? { category } : {}
    const subCats = await collection.distinct('subCategory', filter)
    return subCats.filter(Boolean)
  } catch (err) {
    logger.error('cannot get sub categories', err)
    throw err
  }
}

async function addProductMsg(productId, msg) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(productId) }
    msg.id = makeId()

    const collection = await dbService.getCollection('products')
    await collection.updateOne(criteria, { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add product msg ${productId}`, err)
    throw err
  }
}

async function removeProductMsg(productId, msgId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(productId) }

    const collection = await dbService.getCollection('products')
    await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot remove product msg ${productId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy = {}) {
  const criteria = {}

  // טקסט חופשי
  if (filterBy.txt) {
    criteria.$or = [
      { name: { $regex: filterBy.txt, $options: 'i' } },
      { vendor: { $regex: filterBy.txt, $options: 'i' } },
    ]
  }

  if (filterBy.category) criteria.category = filterBy.category
  if (filterBy.subCategory) criteria.subCategory = filterBy.subCategory

  // מחיר
  const priceCriteria = {}
  if (filterBy.minPrice !== null && filterBy.minPrice !== undefined && filterBy.minPrice !== '')
    priceCriteria.$gte = +filterBy.minPrice
  if (filterBy.maxPrice !== null && filterBy.maxPrice !== undefined && filterBy.maxPrice !== '')
    priceCriteria.$lte = +filterBy.maxPrice
  if (Object.keys(priceCriteria).length) criteria.price = priceCriteria

  // במלאי (אם תרצה)
  if (filterBy.inStock === 'true') criteria.inStock = true
  if (filterBy.inStock === 'false') criteria.inStock = false

  return criteria
}

function _buildSort(filterBy = {}) {
  if (!filterBy.sortField) return {}
  const dir = +filterBy.sortDir === -1 ? -1 : 1
  return { [filterBy.sortField]: dir }
}
