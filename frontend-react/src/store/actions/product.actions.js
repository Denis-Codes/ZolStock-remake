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
