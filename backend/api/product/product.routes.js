import express from 'express'

import { log } from '../../middlewares/logger.middleware.js'
import { requireAuth, requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import {
  getProducts,
  getProductById,
  getCategories,
  getSubCategories,
  addProduct,
  updateProduct,
  removeProduct,
  addProductMsg,
  removeProductMsg,
} from './product.controller.js'

const router = express.Router()

router.get('/', log, getProducts)

// Meta routes are declared before the :id route so "category" and
// "sub-category" are not swallowed as product identifiers.
router.get('/category', log, getCategories)
router.get('/sub-category', log, getSubCategories)

// The id param is deliberately unconstrained. It previously required a
// 24-char ObjectId hex, so /api/product/p1001 matched no route at all and
// fell through to the SPA catch-all, returning HTML. Products carry both an
// ObjectId and a legacy sku, and the service resolves either form.
router.get('/:id', log, getProductById)

// Catalogue writes are admin-only: these are shop products, not user-owned
// content, so any authenticated shopper being able to POST one was wrong.
router.post('/', log, requireAuth, requireAdmin, addProduct)
router.put('/:id', requireAuth, requireAdmin, updateProduct)
router.delete('/:id', requireAuth, requireAdmin, removeProduct)

router.post('/:id/msg', requireAuth, addProductMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeProductMsg)

export const productRoutes = router
