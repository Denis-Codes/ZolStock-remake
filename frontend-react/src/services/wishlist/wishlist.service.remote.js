import { httpService } from '../http.service'

/**
 * Server-backed wishlist.
 *
 * The API returns { productIds, products }. The store only ever held the id
 * array, and WishlistPage resolves products itself, so the actions dispatch
 * `productIds` alone and the page is unaffected by the move.
 */
export const wishlistRemoteService = {
  get: () => httpService.get('wishlist'),
  add: productId => httpService.post(`wishlist/${productId}`),
  remove: productId => httpService.delete(`wishlist/${productId}`),
  clear: () => httpService.delete('wishlist'),
  merge: productIds => httpService.post('wishlist/merge', { productIds }),
}
