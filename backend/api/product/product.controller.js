import { productService } from './product.service.js'
import { toNumber, toBoolean } from '../../services/query.util.js'
import { asyncHandler, ForbiddenError } from '../../middlewares/error.middleware.js'

/**
 * Reads the filter off the query string.
 *
 * pageIdx stays null unless explicitly supplied: the storefront sends no
 * pageIdx and expects every match back, and defaulting it to 0 previously
 * truncated every response to the first 20 products.
 */
export function buildFilter(query = {}) {
  return {
    txt: query.txt || '',
    category: query.category || '',
    subCategory: query.subCategory || '',
    minPrice: toNumber(query.minPrice),
    maxPrice: toNumber(query.maxPrice),
    inStock: toBoolean(query.inStock),
    sortField: query.sortField || '',
    sortDir: toNumber(query.sortDir) ?? 1,
    pageIdx: toNumber(query.pageIdx),
    pageSize: toNumber(query.pageSize),
  }
}

export const getProducts = asyncHandler(async (req, res) => {
  const products = await productService.query(buildFilter(req.query))
  res.json(products)
})

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id)
  res.json(product)
})

export const addProduct = asyncHandler(async (req, res) => {
  const { loggedinUser, body: product } = req

  product.owner = loggedinUser
  const addedProduct = await productService.add(product)
  res.json(addedProduct)
})

export const updateProduct = asyncHandler(async (req, res) => {
  const { loggedinUser, body: product } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && product.owner?._id !== userId) {
    throw new ForbiddenError('Not your product')
  }

  const updatedProduct = await productService.update(product)
  res.json(updatedProduct)
})

export const removeProduct = asyncHandler(async (req, res) => {
  const removedId = await productService.remove(req.params.id)
  res.json({ removedId })
})

export const addProductMsg = asyncHandler(async (req, res) => {
  const msg = { txt: req.body.txt, by: req.loggedinUser }
  const savedMsg = await productService.addProductMsg(req.params.id, msg)
  res.json(savedMsg)
})

export const removeProductMsg = asyncHandler(async (req, res) => {
  const removedId = await productService.removeProductMsg(req.params.id, req.params.msgId)
  res.json({ removedId })
})

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await productService.getCategories()
  res.json(categories)
})

export const getSubCategories = asyncHandler(async (req, res) => {
  const subCats = await productService.getSubCategories(req.query.category || '')
  res.json(subCats)
})
