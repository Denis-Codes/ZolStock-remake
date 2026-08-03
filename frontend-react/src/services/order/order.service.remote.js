import { httpService } from '../http.service'

/**
 * Orders.
 *
 * checkout() sends only the address and payment choice. Items, prices and
 * totals are read from the server-side cart and priced from the catalogue —
 * the client never states what an order costs.
 */
export const orderService = {
  checkout: payload => httpService.post('order', payload),
  getMyOrders: () => httpService.get('order'),
  getById: orderId => httpService.get(`order/${orderId}`),
}

/** Shape of the address form; also what resets it between visits. */
export function getEmptyAddress() {
  return {
    fullname: '',
    phone: '',
    city: '',
    street: '',
    houseNumber: '',
    floor: '',
    apartment: '',
    zip: '',
  }
}
