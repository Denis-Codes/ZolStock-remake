import { productService } from '../../services/product'

export const SET_PRODUCTS = 'SET_PRODUCTS'
export const SET_PRODUCT = 'SET_PRODUCT'
export const SET_FILTER_BY = 'SET_FILTER_BY'
export const RESET_FILTER_BY = 'RESET_FILTER_BY'
export const SET_IS_LOADING = 'SET_IS_LOADING'

// action creators "רגילים"
export function setFilterBy(filterBy) {
  return { type: SET_FILTER_BY, filterBy }
}

export function resetFilterBy() {
  return { type: RESET_FILTER_BY }
}

// thunk: טעינת מוצרים
export function loadProducts(filterBy = null) {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: SET_IS_LOADING, isLoading: true })

      const stateFilter = getState().productModule.filterBy
      const filter = filterBy ?? stateFilter

      const products = await productService.query(filter)
      dispatch({ type: SET_PRODUCTS, products })

      return products
    } catch (err) {
      console.error('Cannot load products', err)
      throw err
    } finally {
      dispatch({ type: SET_IS_LOADING, isLoading: false })
    }
  }
}

// thunk אופציונלי: “נקה פילטרים + טען מחדש” בלחיצה אחת
export function resetFilterAndLoad() {
  return async (dispatch) => {
    dispatch(resetFilterBy())
    return dispatch(loadProducts())
  }
}

/**
 * The four fields a shopper can set that are able to empty a list. Category and
 * sub-category are deliberately not among them: those come from the URL, not
 * from the filter panel, so clearing them would navigate the page out from
 * under the button that was clicked. Sort cannot empty anything.
 */
const BROWSING_FILTERS = ['txt', 'minPrice', 'maxPrice', 'inStock']

function isSet(value) {
  return value !== '' && value !== null && value !== undefined
}

export function hasActiveFilters(filterBy) {
  if (!filterBy) return false
  return BROWSING_FILTERS.some(key => isSet(filterBy[key]))
}

/**
 * Clears the browsing filters while keeping the shopper where they are. Shared
 * by the filter panel's ניקוי button and the empty state's נקה סינון exit — an
 * empty result that offers a way out has to undo exactly what the panel would,
 * or the two disagree about what "cleared" means.
 */
export function clearFilters() {
  return (dispatch, getState) => {
    const filterBy = getState().productModule.filterBy || {}

    dispatch(setFilterBy({
      ...filterBy,

      // keep context:
      category: filterBy.category || '',
      subCategory: filterBy.subCategory || '',

      // reset filters:
      txt: '',
      minPrice: '',
      maxPrice: '',
      inStock: '',
      sortField: '',
      sortDir: '1',
    }))
  }
}
