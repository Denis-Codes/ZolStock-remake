import { describe, it, expect } from 'vitest'

import { dbService } from '../../services/db.service.js'
import {
  calcShipping,
  _variantKey,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_FEE,
} from '../../api/cart/cart.service.js'

/**
 * Pricing and line-identity rules.
 *
 * Both are pure functions with no database access, but they decide what a
 * shopper is charged and which of their picks get merged together — so they
 * are worth far more per test than anything else in the cart module.
 *
 * Importing cart.service.js pulls in dbService, but only opens a connection
 * when a function that needs one is called. Nothing here does, so this file
 * never touches Mongo.
 */

describe('calcShipping — free delivery threshold', () => {
  /**
   * Boundary value analysis.
   *
   * The rule is `subtotal >= 300`. Any implementation bug lives at the edge:
   * using `>` instead of `>=` makes a cart of exactly ₪300 pay for delivery,
   * which is precisely the cart most likely to exist, because shoppers add
   * items until the "free over ₪300" nudge goes away.
   *
   * So the values tested are the boundary itself and the smallest possible
   * step either side of it — not 100 and 500, which every wrong implementation
   * also gets right.
   */
  it.each([
    ['just below the threshold', 299.99, SHIPPING_FLAT_FEE],
    ['exactly at the threshold', 300, 0],
    ['just above the threshold', 300.01, 0],
  ])('%s: ₪%s subtotal → ₪%s delivery', (_label, subtotal, expected) => {
    expect(calcShipping(subtotal)).toBe(expected)
  })

  it('charges delivery on a one-agora shortfall', () => {
    // Restating the boundary from the shopper's side. ₪299.99 is a full
    // delivery fee away from ₪300, and that is intended — but it is the kind
    // of rule someone "rounds off" later, so it is pinned.
    expect(calcShipping(FREE_SHIPPING_THRESHOLD - 0.01)).toBe(SHIPPING_FLAT_FEE)
    expect(calcShipping(FREE_SHIPPING_THRESHOLD)).toBe(0)
  })

  it('charges delivery on a zero subtotal', () => {
    /**
     * Looks wrong in isolation — an empty cart quoted ₪29 delivery. It is not
     * reached in practice: resolveLines() short-circuits an empty cart and
     * returns shipping: 0 without ever calling this function.
     *
     * Pinned anyway, because "unreachable today" is a property of the caller,
     * not of this function. If someone later removes that short-circuit, this
     * test is the only thing standing between them and a ₪29 delivery charge
     * on an empty basket.
     */
    expect(calcShipping(0)).toBe(SHIPPING_FLAT_FEE)
  })

  it('is not confused by floating-point subtotals', () => {
    // resolveLines rounds the subtotal with toFixed(2) before calling this, so
    // a value like 299.99999999999994 should not arrive. If that rounding is
    // ever dropped, this documents which side of the line such a value lands.
    expect(calcShipping(299.999999)).toBe(SHIPPING_FLAT_FEE)
    expect(calcShipping(300.000001)).toBe(0)
  })

  it('keeps the commercial constants where the storefront expects them', () => {
    // The storefront prints "חינם מעל ₪300" and the cart's progress nudge is
    // driven by freeShippingThreshold from this same constant. Changing it
    // without changing the copy would make the page lie, so the number is
    // asserted rather than left implicit.
    expect(FREE_SHIPPING_THRESHOLD).toBe(300)
    expect(SHIPPING_FLAT_FEE).toBe(29)
  })
})

describe('_variantKey — which picks count as the same cart line', () => {
  const PRODUCT_ID = '507f1f77bcf86cd799439011'

  it('uses the bare product id when there is no variant', () => {
    expect(_variantKey(PRODUCT_ID, null)).toBe(PRODUCT_ID)
    expect(_variantKey(PRODUCT_ID, undefined)).toBe(PRODUCT_ID)
  })

  it('treats an empty variant object as no variant', () => {
    // Matters because the client sends `variant: {}` when a product has no
    // options to pick. If that produced a different key from `variant: null`,
    // the same product added twice would sit on two rows.
    expect(_variantKey(PRODUCT_ID, {})).toBe(PRODUCT_ID)
  })

  it.each([
    ['size only', { size: 'M' }, `${PRODUCT_ID}-M`],
    ['colour only', { color: 'red' }, `${PRODUCT_ID}-red`],
    ['both', { size: 'M', color: 'red' }, `${PRODUCT_ID}-M-red`],
  ])('builds a distinct key for %s', (_label, variant, expected) => {
    expect(_variantKey(PRODUCT_ID, variant)).toBe(expected)
  })

  it('is insensitive to the order the client sends the variant fields in', () => {
    // JSON object key order is not guaranteed across clients. The function
    // reads size and colour by name rather than iterating, so this holds —
    // but it holds by design, and the test says so.
    expect(_variantKey(PRODUCT_ID, { color: 'red', size: 'M' })).toBe(
      _variantKey(PRODUCT_ID, { size: 'M', color: 'red' })
    )
  })

  it('separates two variants of the same product', () => {
    // The whole point of the function: a shopper buying a towel in two colours
    // must get two lines, not one line of quantity 2.
    expect(_variantKey(PRODUCT_ID, { color: 'red' })).not.toBe(
      _variantKey(PRODUCT_ID, { color: 'blue' })
    )
  })

  it('separates the same variant across two products', () => {
    expect(_variantKey('p1001', { size: 'M' })).not.toBe(_variantKey('p1002', { size: 'M' }))
  })

  it('is case-sensitive on variant values', () => {
    // Documenting, not endorsing. "M" and "m" are different lines. The schema
    // trims variant values but does not normalise their case, so a client that
    // sends lowercase would split a shopper's line in two. Low impact today
    // because the storefront sends values straight from the product document.
    expect(_variantKey(PRODUCT_ID, { size: 'M' })).not.toBe(
      _variantKey(PRODUCT_ID, { size: 'm' })
    )
  })

  it('documents the hyphen collision in the key encoding', () => {
    /**
     * The key is built by joining values with "-", and the values themselves
     * may contain "-". So a size of "36-38" and a size/colour pair of
     * "36"/"38" encode to the same string, and the cart would merge two
     * genuinely different picks into one line.
     *
     * Left as an assertion of current behaviour rather than a filed bug: this
     * catalogue has no such values, so it is unreachable with real data. It is
     * recorded because it is a property of the *encoding* — the class of bug
     * you find by asking "can two different inputs produce one output?" rather
     * than by walking the happy path — and because any future move to
     * hyphenated size labels makes it live immediately.
     */
    expect(_variantKey('p1', { size: '36-38' })).toBe(_variantKey('p1', { size: '36', color: '38' }))
  })

  /**
   * Was BUG-003, and this test taught a lesson about WHERE to pin one.
   *
   * ── The original test, and why it was wrong ───────────────────────────────
   * It was written as `it.fails(...)` asserting:
   *
   *     _variantKey('507f1f77bcf86cd799439011', null) === _variantKey('p1001', null)
   *
   * — that the same product arriving under either of its two valid names
   * should produce one key. The intent was right and the bug was real. The
   * assertion was pinned to a function that can never satisfy it.
   *
   * `_variantKey` is pure. It has no database, so it cannot know that
   * `507f…011` and `p1001` are one product; only a lookup can. The two ids are
   * different strings and a faithful function returns different keys.
   *
   * So after the fix landed, this test still failed — correctly, permanently,
   * and for a reason that had nothing to do with the bug. An `it.fails` that
   * can never flip is not a pinned bug; it is a test that will be deleted by
   * whoever gets tired of it.
   *
   * ── What the fix actually was ─────────────────────────────────────────────
   * `addItem()` now calls `_variantKey(product._id, variant)` — the resolved
   * document rather than the raw request. The normalising belongs to the
   * caller, which is the layer that has the lookup.
   *
   * The real assertion therefore lives in
   * `tests/api/cart.api.test.js` → 'merges a product added by sku and by
   * ObjectId into one line', which has a database and can prove it.
   *
   * ── Worth recording as a method ───────────────────────────────────────────
   * **Pin a bug at the layer that can actually fix it.** A test at the wrong
   * layer looks like coverage, passes review, and quietly asserts an
   * impossibility. The question to ask is "could the code under test satisfy
   * this if it wanted to?" — here, `_variantKey` could not.
   *
   * What stays here is the property that IS this function's job: the encoding
   * is literal, and two different ids are two different lines. That is what
   * makes it safe to normalise upstream.
   */
  it('is a literal function of its input — normalising is the caller\'s job', () => {
    const byObjectId = _variantKey('507f1f77bcf86cd799439011', null)
    const bySku = _variantKey('p1001', null)

    expect(byObjectId).not.toBe(bySku)
    expect(byObjectId).toBe('507f1f77bcf86cd799439011')
    expect(bySku).toBe('p1001')
  })
})

describe('cost of this file', () => {
  it('never opens a database connection', () => {
    /**
     * A test about the test suite, and the last one in the file so everything
     * above has already run.
     *
     * cart.service.js imports dbService, so the module is loaded — but loading
     * is not connecting, and none of the functions exercised above need a
     * database. That is what keeps this file at ~30ms instead of a connection
     * round-trip per test.
     *
     * It is worth guarding rather than assuming. The natural next test someone
     * writes here is "adding an item merges with the existing line", which
     * needs a real cart in Mongo — and adding it to this file would silently
     * turn the cheapest file in the suite into one of the slowest. This test
     * fails at that moment and says where the new test belongs: the API tests,
     * which pay for a database on purpose.
     */
    expect(dbService.isConnected()).toBe(false)
  })
})
