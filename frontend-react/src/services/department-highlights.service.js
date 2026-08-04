/**
 * Per-department catalogue facts: the cheapest thing in it and the deepest
 * markdown currently on its shelf.
 *
 * Read straight from `products.json` rather than through `productService`, for
 * the same reason `AppHeader` reads it for the subcategory menus: these are
 * catalogue facts, not live state, and the homepage hero states a price in the
 * first viewport. Going through the API would mean the first thing a shopper
 * sees is a skeleton where the number should be — on the one surface whose job
 * is to show the price. The JSON is the seed the API is built from, so the two
 * cannot disagree about what the catalogue contains.
 *
 * Out-of-stock rows are excluded: "from ₪9.90" has to point at something a
 * shopper can actually put in a basket.
 */
import products from '../data/products.json'
import { DEPARTMENTS } from './taxonomy.service'

function buildHighlights() {
  const byCategory = new Map()

  for (const product of products) {
    if (product.inStock === false) continue

    const price = product.salePrice || product.price
    if (!Number.isFinite(price)) continue

    const current = byCategory.get(product.category) || {
      fromPrice: Infinity,
      maxDiscount: 0,
      count: 0,
    }

    current.fromPrice = Math.min(current.fromPrice, price)
    current.maxDiscount = Math.max(current.maxDiscount, product.discountPercent || 0)
    current.count += 1

    byCategory.set(product.category, current)
  }

  return DEPARTMENTS.map((department) => {
    const stats = byCategory.get(department.slug)
    if (!stats || !Number.isFinite(stats.fromPrice)) return null

    return {
      ...department,
      fromPrice: stats.fromPrice,
      maxDiscount: stats.maxDiscount,
      productCount: stats.count,
    }
  }).filter(Boolean)
}

/** Every department that has something in stock, in the chain's own order. */
export const DEPARTMENT_HIGHLIGHTS = buildHighlights()

/**
 * The departments carrying the deepest markdowns, for the homepage hero.
 * Ties break on the lower entry price, so the slide with the better story wins.
 */
export function getDeepestDiscountDepartments(limit = 4) {
  return [...DEPARTMENT_HIGHLIGHTS]
    .filter((d) => d.maxDiscount > 0)
    .sort((a, b) => b.maxDiscount - a.maxDiscount || a.fromPrice - b.fromPrice)
    .slice(0, limit)
}

/** Public path of a department's artwork. Mirrors the tiles on the homepage. */
export function departmentImage(slug) {
  return `${import.meta.env.BASE_URL || '/'}assets/img/categories/${slug}.png`
}
