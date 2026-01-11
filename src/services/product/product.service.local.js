import products from '../../data/products.json'

export const productService = {
  query,
  getById,
  getCategories,
  getSubCategories, // שימושי לשלב הבא (תתי קטגוריות)
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

  // מיון (אופציונלי)
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

  return res
}

async function getById(productId) {
  return products.find(p => p.id === productId) || null
}

async function getCategories() {
  // מחזיר [{ slug, labelHe }]
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
  // מחזיר תתי קטגוריות לקטגוריה ספציפית: [{ slug, labelHe }]
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
