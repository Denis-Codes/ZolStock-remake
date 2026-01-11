import { httpService } from '../http.service'

export const productService = {
  query,
  getById,
  getCategories,
  getSubCategories,
}

async function query(filterBy = {}) {
  // מצפה ל-API: GET /api/product?category=...&subCategory=...&txt=... וכו'
  return httpService.get('product', filterBy)
}

function getById(productId) {
  // מצפה ל-API: GET /api/product/:id
  return httpService.get(`product/${productId}`)
}

function getCategories() {
  // אופציה A (מומלץ): מצפה ל-API ייעודי שמחזיר קטגוריות
  // GET /api/product/category
  return httpService.get('product/category')

  // אופציה B (אם אין endpoint כזה): תעשה query() ותוציא ייחודי בצד לקוח
  // return httpService.get('product', {}).then(products => {
  //   const map = new Map()
  //   products.forEach(p => {
  //     if (!map.has(p.category)) map.set(p.category, { slug: p.category, labelHe: p.displayCategoryHe })
  //   })
  //   return Array.from(map.values())
  // })
}

function getSubCategories(categorySlug) {
  // אופציה A: API ייעודי לפי קטגוריה
  // GET /api/product/sub-category?category=furniture
  return httpService.get('product/sub-category', { category: categorySlug })

  // אופציה B: אם אין endpoint כזה, אפשר להביא מוצרים ולחלץ בצד לקוח (כמו למעלה)
}
