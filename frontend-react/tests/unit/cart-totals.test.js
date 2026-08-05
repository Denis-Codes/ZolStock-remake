import { describe, it, expect } from 'vitest'

import {
  getCartTotals,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_FEE,
} from '../../src/store/actions/cart.actions.js'

/**
 * Cart totals — the numbers the shopper actually reads before paying.
 *
 * ── Why this function first ───────────────────────────────────────────────
 * `getCartTotals` is a pure function: array in, object out. No DOM, no
 * network, no store, nothing to mock. That makes it the cheapest thing in the
 * frontend to test and the easiest place to be thorough — which is lucky,
 * because it is also the code that decides what a customer believes they owe.
 *
 * ── The bit that makes it interesting ─────────────────────────────────────
 * These figures are DUPLICATED. The server prices the real order in
 * backend/api/cart/cart.service.js; this function exists only because a GUEST
 * has no server cart to read, and the cart page still has to show the same
 * numbers they will be charged once they sign in.
 *
 * Duplicated business rules drift. That is not pessimism, it is what happens:
 * someone runs a free-delivery promotion, changes the threshold in one file,
 * and now the guest cart quotes ₪29 that checkout does not charge. These tests
 * pin the client half; backend/tests/unit/cart-pricing.test.js pins the server
 * half; and the two use the same numbers on purpose so a change to either side
 * turns something red.
 *
 * ── How to write one ──────────────────────────────────────────────────────
 * Every test is three beats:
 *
 *   const cart = [makeLine({ price: 100 })]   // ARRANGE — a known cart
 *   const totals = getCartTotals(cart)        // ACT     — the one call
 *   expect(totals.subtotal).toBe(100)         // ASSERT  — one idea per test
 *
 * `it.todo(...)` below marks a test that does not exist yet. Vitest prints it
 * as pending rather than passing, so the gap stays visible instead of looking
 * like coverage. To write one: delete `.todo`, and give `it` a second
 * argument — the function holding the body.
 *
 *   it.todo('does the thing')
 *   it('does the thing', () => {  ...body...  })
 *              ↑ name              ↑ the function; `it` takes exactly two args
 */

/**
 * Builds one cart line.
 *
 * A factory rather than a fixture object: every test states only the field it
 * cares about, and the rest are filled with something valid. A test that says
 * `makeLine({ price: 299 })` is readable at a glance — you can see the number
 * under test without reading past four fields that have nothing to do with it.
 *
 * The defaults matter too. `originalPrice` equals `price`, so a line has no
 * discount unless a test deliberately gives it one — the baseline is boring on
 * purpose, and anything interesting in a test is there because it was asked
 * for.
 *
 * Lives here for now. It moves to a shared factories file the moment a second
 * test file needs it, and not before.
 */
function makeLine(overrides = {}) {
  const price = overrides.price ?? 50

  return {
    variantKey: 'p1',
    productId: 'p1',
    name: 'מוצר לדוגמה',
    price,
    originalPrice: price,
    quantity: 1,
    maxStock: 99,
    ...overrides,
  }
}

describe('getCartTotals — an empty cart', () => {
  /**
   * WORKED EXAMPLE 1 — the empty case, which is where these functions usually
   * break.
   *
   * `toEqual` compares the whole object, `toBe` compares one value. Asserting
   * the entire shape here is deliberate: it is the one test that says what the
   * return value looks like, so a field quietly appearing or disappearing gets
   * caught somewhere.
   *
   * Note `shipping: 0`. The naive version of this function charges ₪29 because
   * the subtotal is under ₪300 — so the empty cart page cheerfully announces a
   * ₪29 total for nothing. The guard is in the source; this test is what stops
   * someone deleting it as redundant.
   */
  it('owes nothing at all, delivery included', () => {
    const totals = getCartTotals([])

    expect(totals).toEqual({
      itemCount: 0,
      subtotal: 0,
      savings: 0,
      shipping: 0,
      amountToFreeShipping: 0,
      total: 0,
    })
  })

  /**
   * Same guard, stated as its own idea so the failure names it.
   *
   * "You're ₪300 away from free delivery" on an empty cart is technically true
   * and completely useless. Zero means the UI has nothing to say.
   */
  it('does not nag an empty cart about free delivery', () => {
    expect(getCartTotals([]).amountToFreeShipping).toBe(0)
  })
})

describe('getCartTotals — counting and summing', () => {
  /**
   * WORKED EXAMPLE 2 — why this is not just `cart.length`.
   *
   * One line, three units. A cart badge showing "1" when the shopper has three
   * of something is the bug this prevents, and it is an easy one to write.
   */
  it('counts units, not lines', () => {
    const cart = [makeLine({ quantity: 3 })]

    expect(getCartTotals(cart).itemCount).toBe(3)
  })

  /**
   * The other half of the same rule. The test above proves it sums WITHIN a
   * line; this one proves it sums ACROSS lines. An implementation that read
   * `cart[0].quantity` passes the first and fails this one, which is exactly
   * why both exist.
   *
   * The second line gets its own variantKey. Nothing here depends on it, but a
   * cart holding two lines with the same key is not a cart the app can
   * produce, and tests should not describe impossible states — the day someone
   * reads this to learn the data shape, it should be telling the truth.
   */
  it('counts units across several lines', () => {
    const cart = [
      makeLine({ quantity: 2 }),
      makeLine({ variantKey: 'p2', productId: 'p2', quantity: 2 }),
    ]

    expect(getCartTotals(cart).itemCount).toBe(4)
  })

  /**
   * subtotal = price × quantity, summed over the lines.
   *
   * The numbers are chosen so that only one arithmetic is right:
   *
   *   correct        20×3 + 15×2       = 90
   *   forgot qty     20 + 15           = 35
   *   summed first   (20+15) × (3+2)   = 175
   *   first line only 20×3             = 60
   *
   * Four distinguishable answers, so a failure tells you which mistake was
   * made rather than just that one was. With prices of 2 and 2 every one of
   * those produces the same number and the test proves nothing.
   */
  it('multiplies price by quantity on every line and adds them up', () => {
    const cart = [
      makeLine({ price: 20, quantity: 3 }),
      makeLine({ variantKey: 'p2', productId: 'p2', price: 15, quantity: 2 }),
    ]

    expect(getCartTotals(cart).subtotal).toBe(90)
  })
})

describe('getCartTotals — savings', () => {
  /**
   * savings = (originalPrice − price) × quantity.
   *
   * ₪20 off, two of them, ₪40 saved. The quantity is 2 rather than 1 on
   * purpose: with a quantity of 1 the multiplication is invisible, and a
   * version that forgot it entirely would pass.
   */
  it('reports the discount, multiplied by quantity', () => {
    const cart = [makeLine({ price: 80, originalPrice: 100, quantity: 2 })]

    expect(getCartTotals(cart).savings).toBe(40)
  })

  /**
   * makeLine's default sets originalPrice equal to price, so nothing here is
   * marked down and there is nothing to celebrate.
   *
   * Worth its own test because zero is the value most likely to come out wrong
   * — `undefined - 80` is NaN, and NaN renders as "you saved ₪NaN". The
   * assertion is `toBe(0)`, which NaN fails, so this catches that too.
   */
  it('reports no savings when nothing is on sale', () => {
    const cart = [makeLine({ price: 80, quantity: 2 })]

    expect(getCartTotals(cart).savings).toBe(0)
  })
})

describe('getCartTotals — the free delivery threshold', () => {
  /**
   * WORKED EXAMPLE 3 — boundary value analysis, and the reason it has a name.
   *
   * The rule is `subtotal >= 300`. Every bug that rule can have lives at 300:
   * writing `>` instead of `>=` breaks exactly one value in the entire range,
   * and a test at ₪150 or ₪450 will never see it.
   *
   * So test three points — one below, the boundary itself, one above — and
   * skip the middle of the range entirely. Testing ₪120 and ₪180 and ₪240 adds
   * runtime and finds nothing, because they are all the same case wearing
   * different numbers.
   *
   * `it.each` runs the same body per row. The `$subtotal` in the name is
   * Vitest substituting the column in, so a failure reports "₪300 subtotal"
   * rather than "case 2 of 3".
   *
   * These are the same three rows as the backend's delivery-charge tests, on
   * purpose. Two implementations of one rule, pinned to identical numbers.
   */
  it.each([
    { subtotal: FREE_SHIPPING_THRESHOLD - 1, shipping: SHIPPING_FLAT_FEE },
    { subtotal: FREE_SHIPPING_THRESHOLD, shipping: 0 },
    { subtotal: FREE_SHIPPING_THRESHOLD + 1, shipping: 0 },
  ])('₪$subtotal subtotal → ₪$shipping delivery', ({ subtotal, shipping }) => {
    const cart = [makeLine({ price: subtotal })]

    const totals = getCartTotals(cart)

    expect(totals.subtotal).toBe(subtotal)
    expect(totals.shipping).toBe(shipping)
  })

  /**
   * The rows above pin `shipping`. This pins that it actually reaches the
   * total — a function can compute the fee correctly and then forget to add
   * it, and the shopper is charged ₪299 for a ₪328 order.
   *
   * 299 + 29 = 328, worked out before the test was run rather than copied from
   * its output. That distinction is the whole point: an expected value taken
   * from what the code printed agrees with the code by construction and can
   * never disagree with it.
   */
  it('adds the delivery fee to the total below the threshold', () => {
    const cart = [makeLine({ price: 299 })]

    expect(getCartTotals(cart).total).toBe(328)
  })

  /**
   * The mirror image: once delivery is free, the total is the goods and
   * nothing else. Guards against a fee that is reported as 0 but still added
   * from some other variable.
   */
  it('charges only the goods once delivery is free', () => {
    const cart = [makeLine({ price: FREE_SHIPPING_THRESHOLD })]

    const totals = getCartTotals(cart)

    expect(totals.shipping).toBe(0)
    expect(totals.total).toBe(FREE_SHIPPING_THRESHOLD)
  })

  /**
   * ₪250 in the cart, ₪50 to go.
   *
   * This one is read by a human — the cart page renders it as "add ₪50 more
   * for free delivery" — so being off by one is visible to every shopper,
   * unlike most arithmetic bugs.
   */
  it('says how much more is needed to reach free delivery', () => {
    const cart = [makeLine({ price: 250 })]

    expect(getCartTotals(cart).amountToFreeShipping).toBe(50)
  })

  /**
   * Above the boundary rather than at it, which is the case people forget.
   *
   * 300 − 400 is −100, and without the Math.max the page reads "add ₪-100 more
   * for free delivery". It is a one-character guard, it looks redundant, and
   * this is the test that stops someone tidying it away.
   */
  it('never reports a negative amount once past the threshold', () => {
    const cart = [makeLine({ price: 400 })]

    expect(getCartTotals(cart).amountToFreeShipping).toBe(0)
  })
})

/**
 * ── Not covered here, and deliberately ────────────────────────────────────
 * addToCart / removeFromCart / updateCartItemQty are thunks: they read
 * localStorage, check whether a user is signed in, and call the server. That
 * makes them integration-shaped, not unit-shaped, and they need a store and
 * MSW to test honestly. Different sub-stage.
 *
 * Also worth knowing: the guest cart builds its line key as
 * `${productId}-${size}-${color}` while the server builds its own differently.
 * See bugs/BUG-003 — the two keys are never compared, so it is not a live bug,
 * but it is the kind of near-miss worth remembering when the merge logic
 * changes.
 */
