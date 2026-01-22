import { loadFromStorage, saveToStorage } from '../../services/util.service'

// Action types
export const SET_CART = 'SET_CART'
export const ADD_TO_CART = 'ADD_TO_CART'
export const REMOVE_FROM_CART = 'REMOVE_FROM_CART'
export const UPDATE_CART_ITEM_QTY = 'UPDATE_CART_ITEM_QTY'
export const CLEAR_CART = 'CLEAR_CART'

const CART_STORAGE_KEY = 'zolstock_cart'

// Load cart from localStorage
export function loadCart() {
  return (dispatch) => {
    const cart = loadFromStorage(CART_STORAGE_KEY) || []
    dispatch({ type: SET_CART, cart })
  }
}

// Add item to cart
export function addToCart(product, quantity = 1, selectedVariant = null) {
  return (dispatch, getState) => {
    const { cart } = getState().cartModule
    const variantKey = selectedVariant
      ? `${product.id}-${selectedVariant.size}-${selectedVariant.color}`
      : product.id

    const existingItemIndex = cart.findIndex((item) => item.variantKey === variantKey)

    let updatedCart
    if (existingItemIndex > -1) {
      // Update existing item quantity
      updatedCart = cart.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    } else {
      // Add new item
      const cartItem = {
        variantKey,
        productId: product.id,
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

    saveToStorage(CART_STORAGE_KEY, updatedCart)
    dispatch({ type: SET_CART, cart: updatedCart })
  }
}

// Remove item from cart
export function removeFromCart(variantKey) {
  return (dispatch, getState) => {
    const { cart } = getState().cartModule
    const updatedCart = cart.filter((item) => item.variantKey !== variantKey)
    saveToStorage(CART_STORAGE_KEY, updatedCart)
    dispatch({ type: SET_CART, cart: updatedCart })
  }
}

// Update item quantity
export function updateCartItemQty(variantKey, quantity) {
  return (dispatch, getState) => {
    const { cart } = getState().cartModule

    if (quantity <= 0) {
      return dispatch(removeFromCart(variantKey))
    }

    const updatedCart = cart.map((item) =>
      item.variantKey === variantKey
        ? { ...item, quantity: Math.min(quantity, item.maxStock) }
        : item
    )
    saveToStorage(CART_STORAGE_KEY, updatedCart)
    dispatch({ type: SET_CART, cart: updatedCart })
  }
}

// Clear entire cart
export function clearCart() {
  return (dispatch) => {
    saveToStorage(CART_STORAGE_KEY, [])
    dispatch({ type: SET_CART, cart: [] })
  }
}

// Get cart totals (can be used in selectors)
export function getCartTotals(cart) {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const savings = cart.reduce(
    (sum, item) => sum + (item.originalPrice - item.price) * item.quantity,
    0
  )
  return { itemCount, subtotal, savings }
}
