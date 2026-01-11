import { store } from '../store'
import { productService } from '../../services/product'

export const SET_PRODUCTS = 'SET_PRODUCTS'
export const SET_PRODUCT = 'SET_PRODUCT'
export const SET_FILTER_BY = 'SET_FILTER_BY'
export const SET_IS_LOADING = 'SET_IS_LOADING'

export async function loadProducts(filterBy = null) {
  try {
    store.dispatch({ type: SET_IS_LOADING, isLoading: true })

    const filter = filterBy || store.getState().productModule.filterBy
    const products = await productService.query(filter)

    store.dispatch({ type: SET_PRODUCTS, products })
    return products
  } catch (err) {
    console.error('Cannot load products', err)
    throw err
  } finally {
    store.dispatch({ type: SET_IS_LOADING, isLoading: false })
  }
}

export async function loadProduct(productId) {
  try {
    store.dispatch({ type: SET_IS_LOADING, isLoading: true })

    const product = await productService.getById(productId)
    store.dispatch({ type: SET_PRODUCT, product })
    return product
  } catch (err) {
    console.error('Cannot load product', err)
    throw err
  } finally {
    store.dispatch({ type: SET_IS_LOADING, isLoading: false })
  }
}

export function setFilterBy(filterBy) {
  store.dispatch({ type: SET_FILTER_BY, filterBy })
  return loadProducts(filterBy)
}
