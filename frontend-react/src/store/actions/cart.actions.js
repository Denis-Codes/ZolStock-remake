import { loadFromStorage, saveToStorage } from '../../services/util.service'
import { CART_STORAGE_KEY } from '../../services/storage-keys'
import { userService } from '../../services/user'
import { cartRemoteService, toClientCart } from '../../services/cart/cart.service.remote'

// Action types
export const SET_CART = 'SET_CART'
export const ADD_TO_CART = 'ADD_TO_CART'
export const REMOVE_FROM_CART = 'REMOVE_FROM_CART'
export const UPDATE_CART_ITEM_QTY = 'UPDATE_CART_ITEM_QTY'
export const CLEAR_CART = 'CLEAR_CART'

/**
 * The cart has two backings, chosen per call rather than at module load.
 *
 * A signed-in shopper's cart lives on the server, so it survives a new device.
 * A guest's stays in localStorage exactly as before — browsing and filling a
 * cart must not require an account. Reading the flag per call (rather than
 * once) matters because a shopper can sign in mid-session, and cart.merge()
 * folds what they collected as a guest into the stored cart at that moment.
 */
function isLoggedIn() {
  return !!userService.getLoggedinUser()
}

function readGuestCart() {
  return loadFromStorage(CART_STORAGE_KEY) || []
}

function writeGuestCart(cart) {
  saveToStorage(CART_STORAGE_KEY, cart)
  return cart
}

export function loadCart() {
  return async (dispatch) => {
    if (!isLoggedIn()) {
      return dispatch({ type: SET_CART, cart: readGuestCart() })
    }

    try {
      const serverCart = await cartRemoteService.get()
      dispatch({ type: SET_CART, cart: toClientCart(serverCart) })
    } catch (err) {
      // A cart that cannot be fetched should not blank the page; fall back to
      // whatever is on this device.
      console.error('Cannot load cart from server, falling back to local', err)
      dispatch({ type: SET_CART, cart: readGuestCart() })
    }
  }
}

export function addToCart(product, quantity = 1, selectedVariant = null) {
  return async (dispatch, getState) => {
    const productId = product._id

    if (isLoggedIn()) {
      const serverCart = await cartRemoteService.addItem(productId, quantity, selectedVariant)
      return dispatch({ type: SET_CART, cart: toClientCart(serverCart) })
    }

    const { cart } = getState().cartModule
    const variantKey = selectedVariant
      ? `${productId}-${selectedVariant.size}-${selectedVariant.color}`
      : productId

    const existingItemIndex = cart.findIndex((item) => item.variantKey === variantKey)

    let updatedCart
    if (existingItemIndex > -1) {
      updatedCart = cart.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    } else {
      const cartItem = {
        variantKey,
        productId,
        name: product.displayNameHe,
        price: product.salePrice || product.price,
        originalPrice: product.originalPrice || product.price,
        image: product.images?.[0] || 'assets/img/placeholder.png',
        quantity,
        variant: selectedVariant,
        maxStock: selectedVariant?.stockQty || product.stockQty || 99,
      }
      updatedCart = [...cart, cartItem]
    }

    dispatch({ type: SET_CART, cart: writeGuestCart(updatedCart) })
  }
}

export function removeFromCart(variantKey) {
  return async (dispatch, getState) => {
    const { cart } = getState().cartModule

    if (isLoggedIn()) {
      const line = cart.find((item) => item.variantKey === variantKey)
      if (line?.itemId) {
        const serverCart = await cartRemoteService.removeItem(line.itemId)
        return dispatch({ type: SET_CART, cart: toClientCart(serverCart) })
      }
    }

    const updatedCart = cart.filter((item) => item.variantKey !== variantKey)
    dispatch({ type: SET_CART, cart: writeGuestCart(updatedCart) })
  }
}

export function updateCartItemQty(variantKey, quantity) {
  return async (dispatch, getState) => {
    const { cart } = getState().cartModule

    if (quantity <= 0) {
      return dispatch(removeFromCart(variantKey))
    }

    if (isLoggedIn()) {
      const line = cart.find((item) => item.variantKey === variantKey)
      if (line?.itemId) {
        const serverCart = await cartRemoteService.updateQty(line.itemId, quantity)
        return dispatch({ type: SET_CART, cart: toClientCart(serverCart) })
      }
    }

    const updatedCart = cart.map((item) =>
      item.variantKey === variantKey
        ? { ...item, quantity: Math.min(quantity, item.maxStock) }
        : item
    )
    dispatch({ type: SET_CART, cart: writeGuestCart(updatedCart) })
  }
}

export function clearCart() {
  return async (dispatch) => {
    if (isLoggedIn()) {
      const serverCart = await cartRemoteService.clear()
      return dispatch({ type: SET_CART, cart: toClientCart(serverCart) })
    }
    dispatch({ type: SET_CART, cart: writeGuestCart([]) })
  }
}

/**
 * Folds the guest cart into the server cart, then clears the local copy.
 *
 * Called once on login/signup. Quantities are summed server-side rather than
 * overwritten, so signing in never discards what the shopper already picked.
 */
export function mergeGuestCart() {
  return async (dispatch) => {
    const guestCart = readGuestCart()

    try {
      const serverCart = guestCart.length
        ? await cartRemoteService.merge(
            guestCart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: item.variant || null,
            }))
          )
        : await cartRemoteService.get()

      // Cleared only after the merge succeeds, so a failed request cannot
      // lose the shopper's cart.
      writeGuestCart([])
      dispatch({ type: SET_CART, cart: toClientCart(serverCart) })
    } catch (err) {
      console.error('Cannot merge guest cart', err)
    }
  }
}

/**
 * Delivery pricing, mirrored from the server.
 *
 * The server is the authority — it prices the order and the client cannot
 * change what it is charged. These exist because a *guest* has no server cart
 * to read, and the cart page must still show the same figures it will be
 * charged after signing in. Keep in step with cart.service.js on the backend.
 */
export const FREE_SHIPPING_THRESHOLD = 300
export const SHIPPING_FLAT_FEE = 29

// Get cart totals (can be used in selectors)
export function getCartTotals(cart) {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const savings = cart.reduce(
    (sum, item) => sum + (item.originalPrice - item.price) * item.quantity,
    0
  )

  // An empty cart owes nothing, including delivery — otherwise the empty
  // state would quote a ₪29 total.
  const shipping =
    itemCount === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_FEE

  return {
    itemCount,
    subtotal,
    savings,
    shipping,
    // Zero for an empty cart: there is nothing to "add more to".
    amountToFreeShipping: itemCount === 0 ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    total: subtotal + shipping,
  }
}
