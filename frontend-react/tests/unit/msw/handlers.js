import { http, HttpResponse } from 'msw'

/**
 * Default request handlers — the happy path for every endpoint the app calls.
 *
 * Two conventions here, both deliberate:
 *
 * 1. Paths are matched with a leading wildcard (`*​/api/...`). http.service.js
 *    builds absolute URLs (`//localhost:3030/api/`) in dev and relative ones
 *    (`/api/`) in production, so a handler pinned to one form would silently
 *    stop matching depending on how the test process was started.
 *
 * 2. Responses mirror the REAL response shapes from the Express API — arrays
 *    where it returns arrays, `{ err }` for errors, cart totals with every
 *    field cart.service.js computes. A handler that returns a convenient
 *    made-up shape lets tests pass against data the server never sends, which
 *    is the most common way component tests give false confidence.
 */

export const testProducts = [
  {
    _id: '507f1f77bcf86cd799439011',
    sku: 'p1001',
    name: 'Test Frying Pan',
    displayNameHe: 'מחבת בדיקה',
    category: 'housewares',
    subCategory: 'kitchen',
    price: 120,
    salePrice: null,
    originalPrice: 120,
    discountPercent: 0,
    currency: 'ILS',
    inStock: true,
    stockQty: 10,
    images: ['/assets/img/products/frying-pan.png'],
    variants: [],
  },
  {
    _id: '507f1f77bcf86cd799439012',
    sku: 'p1002',
    name: 'Test Bath Towel',
    displayNameHe: 'מגבת בדיקה',
    category: 'textiles',
    subCategory: 'bath',
    price: 80,
    salePrice: 60,
    originalPrice: 80,
    discountPercent: 25,
    currency: 'ILS',
    inStock: true,
    stockQty: 4,
    images: ['/assets/img/products/bath-towel.png'],
    variants: [],
  },
]

export const emptyCartTotals = {
  itemCount: 0,
  subtotal: 0,
  savings: 0,
  shipping: 0,
  freeShippingThreshold: 300,
  amountToFreeShipping: 300,
  total: 0,
  currency: 'ILS',
}

export const handlers = [
  http.get('*/api/product', () => HttpResponse.json(testProducts)),

  http.get('*/api/product/:id', ({ params }) => {
    const product = testProducts.find(p => p._id === params.id || p.sku === params.id)
    if (!product) return HttpResponse.json({ err: 'Product not found' }, { status: 404 })
    return HttpResponse.json(product)
  }),

  http.get('*/api/cart', () =>
    HttpResponse.json({ userId: 'u1', items: [], totals: emptyCartTotals })
  ),

  http.get('*/api/order', () => HttpResponse.json([])),

  http.get('*/api/wishlist', () => HttpResponse.json([])),

  http.get('*/api/review', () => HttpResponse.json([])),
]
