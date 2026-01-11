const { DEV, VITE_LOCAL } = import.meta.env

import { productService as local } from './product.service.local'
import { productService as remote } from './product.service.remote'

function getDefaultFilter() {
  return {
    txt: '',
    category: '',     // slug (e.g. "furniture")
    subCategory: '',  // slug (e.g. "sofa") - נשתמש בזה בהמשך
    minPrice: '',
    maxPrice: '',
    inStock: '',      // true/false בהמשך אם תרצה
    sortField: '',    // 'price' | 'rating' | 'name' וכו'
    sortDir: '1',     // '1' / '-1'
  }
}

const service = VITE_LOCAL === 'true' ? local : remote

export const productService = {
  getDefaultFilter,
  ...service,
}

// Easy access to this service from the dev tools console
if (DEV) window.productService = productService
