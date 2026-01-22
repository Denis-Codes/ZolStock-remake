import { SET_WISHLIST } from '../actions/wishlist.actions'

const initialState = {
  wishlist: [],
}

export function wishlistReducer(state = initialState, action) {
  switch (action.type) {
    case SET_WISHLIST:
      return { ...state, wishlist: action.wishlist }

    default:
      return state
  }
}
