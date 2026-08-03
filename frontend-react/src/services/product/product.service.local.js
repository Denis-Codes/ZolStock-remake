import products from '../../data/products.json'

const BASE_URL = import.meta.env.BASE_URL || '/'

function normalizeProduct(product) {
  if (!product) return product

  return {
    ...product,
    // The API keys products by a Mongo ObjectId and keeps the p1001-style id
    // as `sku`, and the components read `_id`/`sku` accordingly. products.json
    // predates that split, so mirror the same shape here — otherwise the
    // github build, which is pinned to this local service, renders every card
    // with an undefined key and a dead link.
    _id: product._id || product.id,
    sku: product.sku || product.id,
    images: product.images?.map(img => {
      if (img.startsWith('http') || img.startsWith('/')) return img
      return BASE_URL + img
    })
  }
}

export const productService = {
  query,
  getById,
  getCategories,
  getSubCategories,
}

async function query(filterBy = {}) {
  const {
    txt = '',
    category = '',
    subCategory = '',
    minPrice = '',
    maxPrice = '',
    inStock = '',
    sortField = '',
    sortDir = '1',
  } = filterBy

  let res = [...products]

  // סינון קטגוריה / תת קטגוריה
  if (category) res = res.filter(p => p.category === category)
  if (subCategory) res = res.filter(p => p.subCategory === subCategory)

  // חיפוש טקסט
  if (txt) {
    const regex = new RegExp(txt, 'i')
    res = res.filter(p =>
      regex.test(p.name) ||
      regex.test(p.displayNameHe) ||
      regex.test(p.category) ||
      regex.test(p.displayCategoryHe) ||
      regex.test(p.subCategory) ||
      regex.test(p.displaySubCategoryHe) ||
      (p.brand && regex.test(p.brand)) ||
      (p.tags && p.tags.some(tag => regex.test(tag))) ||
      (p.displayTagsHe && p.displayTagsHe.some(tag => regex.test(tag)))
    )
    console.log(txt, products.length)
  }

  // מחיר
  const min = minPrice === '' ? null : +minPrice
  const max = maxPrice === '' ? null : +maxPrice
  if (min != null && !Number.isNaN(min)) res = res.filter(p => p.price >= min)
  if (max != null && !Number.isNaN(max)) res = res.filter(p => p.price <= max)

  // במלאי
  if (inStock !== '') {
    const inStockBool = inStock === true || inStock === 'true'
    res = res.filter(p => p.inStock === inStockBool)
  }

  // מיון
  if (sortField) {
    const dir = +sortDir || 1

    res.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir
      return (aVal - bVal) * dir
    })
  }

  return res.map(normalizeProduct)
}

async function getById(productId) {
  // Matches either key, mirroring the API's byIdOrSku lookup.
  const product = products.find(p => p.id === productId || p._id === productId) || null
  return normalizeProduct(product)
}

async function getCategories() {
  const map = new Map()

  products.forEach(p => {
    if (!map.has(p.category)) {
      map.set(p.category, {
        slug: p.category,
        labelHe: p.displayCategoryHe,
      })
    }
  })

  return Array.from(map.values())
}

async function getSubCategories(categorySlug) {
  const map = new Map()

  products
    .filter(p => !categorySlug || p.category === categorySlug)
    .forEach(p => {
      if (!map.has(p.subCategory)) {
        map.set(p.subCategory, {
          slug: p.subCategory,
          labelHe: p.displaySubCategoryHe,
          category: p.category,
        })
      }
    })

  return Array.from(map.values())
}