// const { DEV, VITE_LOCAL } = import.meta.env

// import { productService as local } from './product.service.local'
// import { productService as remote } from './product.service.remote'

// function getDefaultFilter() {
//   return {
//     txt: '',
//     category: '',
//     subCategory: '',
//     minPrice: '',
//     maxPrice: '',
//     inStock: '',
//     sortField: '',
//     sortDir: '1',
//   }
// }

// const service = VITE_LOCAL === 'true' ? local : remote

// export const productService = {
//   getDefaultFilter,
//   ...service,
// }

// if (DEV) window.productService = productService

const { DEV, VITE_LOCAL, MODE } = import.meta.env

import { productService as local } from './product.service.local'
import { productService as remote } from './product.service.remote'

function getDefaultFilter() {
  return {
    txt: '',
    category: '',
    subCategory: '',
    minPrice: '',
    maxPrice: '',
    inStock: '',
    sortField: '',
    sortDir: '1',
  }
}

const isGithub = MODE === 'github'

// בגיטהאב תמיד LOCAL
const service = isGithub ? local : (VITE_LOCAL === 'true' ? local : remote)

export const productService = {
  getDefaultFilter,
  ...service,
}

if (DEV) window.productService = productService
