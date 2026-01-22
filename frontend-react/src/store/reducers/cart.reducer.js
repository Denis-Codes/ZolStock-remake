import { SET_CART } from '../actions/cart.actions'

const initialState = {
  cart: [],
}

export function cartReducer(state = initialState, action) {
  switch (action.type) {
    case SET_CART:
      return { ...state, cart: action.cart }

    default:
      return state
  }
}
