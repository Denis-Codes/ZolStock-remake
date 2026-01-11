import {
  SET_PRODUCTS,
  SET_PRODUCT,
  SET_FILTER_BY,
  SET_IS_LOADING,
} from '../actions/product.actions'

import { productService } from '../../services/product'

const initialState = {
  products: [],
  product: null,
  filterBy: productService.getDefaultFilter(),
  isLoading: false,
}

export function productReducer(state = initialState, action) {
  switch (action.type) {
    case SET_PRODUCTS:
      return { ...state, products: action.products }

    case SET_PRODUCT:
      return { ...state, product: action.product }

    case SET_FILTER_BY:
      return { ...state, filterBy: { ...state.filterBy, ...action.filterBy } }

    case SET_IS_LOADING:
      return { ...state, isLoading: action.isLoading }

    default:
      return state
  }
}
