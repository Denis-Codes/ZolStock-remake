import { loadFromStorage, saveToStorage } from '../../services/util.service'

// Action types
export const SET_WISHLIST = 'SET_WISHLIST'
export const TOGGLE_WISHLIST_ITEM = 'TOGGLE_WISHLIST_ITEM'

const WISHLIST_STORAGE_KEY = 'zolstock_wishlist'

// Load wishlist from localStorage
export function loadWishlist() {
  return (dispatch) => {
    const wishlist = loadFromStorage(WISHLIST_STORAGE_KEY) || []
    dispatch({ type: SET_WISHLIST, wishlist })
  }
}

// Toggle item in wishlist
export function toggleWishlistItem(productId) {
  return (dispatch, getState) => {
    const { wishlist } = getState().wishlistModule
    const isInWishlist = wishlist.includes(productId)

    const updatedWishlist = isInWishlist
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId]

    saveToStorage(WISHLIST_STORAGE_KEY, updatedWishlist)
    dispatch({ type: SET_WISHLIST, wishlist: updatedWishlist })

    return !isInWishlist // Returns new state: true if added, false if removed
  }
}

// Check if item is in wishlist
export function isInWishlist(wishlist, productId) {
  return wishlist.includes(productId)
}
