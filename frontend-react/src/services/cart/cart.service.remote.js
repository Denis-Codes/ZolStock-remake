import { httpService } from '../http.service'

/**
 * Server-backed cart.
 *
 * Every call returns the whole cart rather than a delta, so the store always
 * mirrors what the server actually holds — quantities capped by stock, lines
 * dropped for retired products — instead of what the client hoped it would.
 */
export const cartRemoteService = {
  get: () => httpService.get('cart'),
  addItem: (productId, quantity = 1, variant = null) =>
    httpService.post('cart/item', { productId, quantity, variant }),
  updateQty: (itemId, quantity) => httpService.put(`cart/item/${itemId}`, { quantity }),
  removeItem: itemId => httpService.delete(`cart/item/${itemId}`),
  clear: () => httpService.delete('cart'),
  merge: items => httpService.post('cart/merge', { items }),
}

/**
 * Converts a server cart line into the flat shape the store and CartPage have
 * always used.
 *
 * Adapting here rather than reshaping the components keeps CartPage, CartIcon
 * and getCartTotals working untouched — the server became the source of the
 * data without becoming the source of its shape.
 */
export function toClientCartItem(line) {
  return {
    // Needed to address the line on the server; absent for guest carts.
    itemId: line.itemId,
    variantKey: line.variantKey,
    productId: line.productId,
    name: line.product?.displayNameHe || line.product?.name || '',
    price: line.unitPrice,
    originalPrice: line.product?.originalPrice ?? line.unitPrice,
    image: line.product?.images?.[0] || 'assets/img/placeholder.png',
    quantity: line.quantity,
    variant: line.variant || null,
    maxStock: line.product?.stockQty ?? 99,
    exceedsStock: !!line.exceedsStock,
  }
}

export function toClientCart(serverCart) {
  return (serverCart?.items || []).map(toClientCartItem)
}
