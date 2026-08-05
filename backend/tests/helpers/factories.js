import { ObjectId } from 'mongodb'

/**
 * Fixture factories.
 *
 * ── Why factories rather than fixture files ──────────────────────────────
 * A shared products.json that every test reads has two failure modes. First,
 * tests start depending on incidental details of it — "the third product is
 * out of stock" — so changing the file to suit one test breaks three others.
 * Second, the test stops being readable: to know what is being tested you have
 * to open a different file and count rows.
 *
 * A factory inverts that. Each test states ONLY what matters to it:
 *
 *   makeProduct({ stockQty: 1 })      ← this test is about the last unit
 *
 * Everything else is filled with a valid default. The line reads as the
 * premise of the test, and no other test can be affected by it.
 *
 * ── The overrides rule ───────────────────────────────────────────────────
 * Every factory takes an overrides object merged last, so any field can be
 * replaced without a new factory. Defaults must always produce a VALID
 * object — a test that wants an invalid one asks for it explicitly, which
 * makes the invalidity visible at the call site.
 */

let seq = 0
const nextSeq = () => ++seq

/**
 * The password every factory-made user has, and its bcrypt hash.
 *
 * The hash is hardcoded rather than computed so the factory stays fast. It is
 * verified against TEST_PASSWORD by tests/helpers.test.js — because a hash
 * that silently does not match its password produces the worst kind of test
 * failure: every login test fails, and nothing points at the fixture.
 */
export const TEST_PASSWORD = 'Passw0rd!'
export const TEST_PASSWORD_HASH =
  '$2b$10$XbxGRSXWQi3TCN4zIJbXn.maB/iFhiDCfBmyO4gVcEbOPMUcnBm/m'

export function makeProduct(overrides = {}) {
  const n = nextSeq()

  return {
    _id: new ObjectId(),
    sku: `p${1000 + n}`,
    name: `Test Product ${n}`,
    displayNameHe: `מוצר בדיקה ${n}`,
    description: `Description for test product ${n}`,
    category: 'housewares',
    subCategory: 'kitchen',
    price: 100,
    salePrice: null,
    originalPrice: 100,
    discountPercent: 0,
    currency: 'ILS',
    inStock: true,
    stockQty: 50,
    images: [`/assets/img/products/test-${n}.png`],
    variants: [],
    searchText: `test product ${n} מוצר בדיקה`,
    createdAt: new Date(),
    ...overrides,
  }
}

export function makeUser(overrides = {}) {
  const n = nextSeq()

  return {
    _id: new ObjectId(),
    username: `tester${n}`,
    // A real, verified bcrypt hash of TEST_PASSWORD below. Hashing inside the
    // factory would add ~100ms per user — bcrypt is deliberately slow, which
    // is the point of it — and across a suite that becomes minutes. Tests that
    // exercise hashing itself should call bcrypt directly.
    password: TEST_PASSWORD_HASH,
    fullname: `Test User ${n}`,
    imgUrl: '',
    isAdmin: false,
    score: 100,
    createdAt: new Date(),
    ...overrides,
  }
}

export function makeAdmin(overrides = {}) {
  return makeUser({ isAdmin: true, username: `admin${nextSeq()}`, ...overrides })
}

/**
 * A stored cart line. Note it holds a product REFERENCE and a quantity, never
 * a price — mirroring cart.service.js, where prices are always resolved from
 * the catalogue. A factory that invented a price field would let a test pass
 * against a shape the app never produces.
 */
export function makeCartItem(productId, overrides = {}) {
  const n = nextSeq()

  return {
    itemId: `item${n}`,
    productId: String(productId),
    quantity: 1,
    variant: null,
    variantKey: String(productId),
    addedAt: new Date(),
    ...overrides,
  }
}

export function makeCart(userId, items = [], overrides = {}) {
  return {
    userId: String(userId),
    items,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makeShippingAddress(overrides = {}) {
  return {
    fullname: 'Test Recipient',
    phone: '0501234567',
    city: 'תל אביב',
    street: 'דיזנגוף 100',
    zip: '6100000',
    ...overrides,
  }
}
