import { loadFromStorage, saveToStorage } from '../../services/util.service'
import { WISHLIST_STORAGE_KEY } from '../../services/storage-keys'
import { userService } from '../../services/user'
import { wishlistRemoteService } from '../../services/wishlist/wishlist.service.remote'

// Action types
export const SET_WISHLIST = 'SET_WISHLIST'
export const TOGGLE_WISHLIST_ITEM = 'TOGGLE_WISHLIST_ITEM'

// Same two-backing arrangement as the cart — see cart.actions for the reasoning.
function isLoggedIn() {
  return !!userService.getLoggedinUser()
}

function readGuestWishlist() {
  return loadFromStorage(WISHLIST_STORAGE_KEY) || []
}

function writeGuestWishlist(wishlist) {
  saveToStorage(WISHLIST_STORAGE_KEY, wishlist)
  return wishlist
}

export function loadWishlist() {
  return async (dispatch) => {
    if (!isLoggedIn()) {
      return dispatch({ type: SET_WISHLIST, wishlist: readGuestWishlist() })
    }

    try {
      const { productIds } = await wishlistRemoteService.get()
      dispatch({ type: SET_WISHLIST, wishlist: productIds })
    } catch (err) {
      console.error('Cannot load wishlist from server, falling back to local', err)
      dispatch({ type: SET_WISHLIST, wishlist: readGuestWishlist() })
    }
  }
}

/**
 * Returns the new membership state (true if added), which the heart icons
 * rely on to pick their toast message.
 */
export function toggleWishlistItem(productId) {
  return async (dispatch, getState) => {
    const { wishlist } = getState().wishlistModule
    const wasInWishlist = wishlist.includes(productId)

    if (isLoggedIn()) {
      try {
        const { productIds } = wasInWishlist
          ? await wishlistRemoteService.remove(productId)
          : await wishlistRemoteService.add(productId)

        dispatch({ type: SET_WISHLIST, wishlist: productIds })
        return !wasInWishlist
      } catch (err) {
        console.error('Cannot update wishlist', err)
        return wasInWishlist
      }
    }

    const updatedWishlist = wasInWishlist
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId]

    dispatch({ type: SET_WISHLIST, wishlist: writeGuestWishlist(updatedWishlist) })

    return !wasInWishlist
  }
}

/** Folds the guest wishlist into the stored one on login/signup. */
export function mergeGuestWishlist() {
  return async (dispatch) => {
    const guestWishlist = readGuestWishlist()

    try {
      const { productIds } = guestWishlist.length
        ? await wishlistRemoteService.merge(guestWishlist)
        : await wishlistRemoteService.get()

      writeGuestWishlist([])
      dispatch({ type: SET_WISHLIST, wishlist: productIds })
    } catch (err) {
      console.error('Cannot merge guest wishlist', err)
    }
  }
}

// Check if item is in wishlist
export function isInWishlist(wishlist, productId) {
  return wishlist.includes(productId)
}
