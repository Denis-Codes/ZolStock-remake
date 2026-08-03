import { httpService } from '../http.service'

/**
 * Where the API serves product images from.
 *
 * The API returns root-relative paths ("/assets/img/products/x.png"), which is
 * what they are relative to the server. In dev the app runs on :5173 and the
 * API on :3030, so an unqualified path would be requested from Vite, which
 * does not hold these files. In production both share an origin and
 * VITE_API_URL is empty, leaving the path untouched.
 */
const ASSET_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function normalizeProduct(product) {
  if (!product) return product

  return {
    ...product,
    images: product.images?.map(img => {
      if (img.startsWith('http://') || img.startsWith('https://')) return img
      return `${ASSET_ORIGIN}${img.startsWith('/') ? '' : '/'}${img}`
    }),
  }
}

export const productService = {
  query,
  getById,
  getCategories,
  getSubCategories,
}

// GET /api/product?category=...&subCategory=...&txt=... etc.
async function query(filterBy = {}) {
  const products = await httpService.get('product', filterBy)
  return products.map(normalizeProduct)
}

// GET /api/product/:id — accepts an ObjectId or a legacy sku.
async function getById(productId) {
  const product = await httpService.get(`product/${productId}`)
  return normalizeProduct(product)
}

// GET /api/product/category -> [{ slug, labelHe }]
function getCategories() {
  return httpService.get('product/category')
}

// GET /api/product/sub-category?category=... -> [{ slug, labelHe, category }]
function getSubCategories(categorySlug) {
  return httpService.get('product/sub-category', { category: categorySlug })
}
