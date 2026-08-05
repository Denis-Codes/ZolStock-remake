import { describe, it, expect } from 'vitest'

import { formatMoney, moneyParts, moneyAriaLabel } from '../../src/services/money.service.js'

/**
 * Price formatting — the last thing that happens to a number before a shopper
 * reads it and decides whether to pay.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * The cart's savings line rendered "−₪9.100" on a single ₪24.90 item marked
 * down to ₪14.90. The arithmetic was right: the saving is ₪10. The formatter
 * was wrong. It took `Math.floor` of the value for the shekels and
 * `Math.round` of the remainder for the agorot — two reads of two different
 * numbers — so when the remainder rounded up to a hundred agorot there was
 * nowhere for the carry to go, and the hundred was printed as if it were a
 * fraction.
 *
 * It surfaced on a subtraction because 24.90 − 14.90 is 9.999999999999998 in
 * binary floating point, and every catalogue price ends in .90. Subtracting
 * two of them is the ordinary case here, not the unlucky one.
 *
 * The tests below are written against agorot-boundary values rather than the
 * one input that was reported, because the reported input is not special —
 * anything that lands a hair under a whole shekel does the same thing.
 */

describe('formatMoney — ordinary prices', () => {
  /**
   * The catalogue's own shape. Three of these appear on a product card at once
   * (price, original, saving), so getting them wrong is not subtle.
   */
  it.each([
    { amount: 24.9, expected: '₪24.90' },
    { amount: 14.9, expected: '₪14.90' },
    { amount: 118.8, expected: '₪118.80' },
    { amount: 0.05, expected: '₪0.05' },
  ])('$amount → $expected', ({ amount, expected }) => {
    expect(formatMoney(amount)).toBe(expected)
  })

  /**
   * Whole shekels drop the agorot entirely — DESIGN.md's price-tag rule, and
   * the reason the formatter cannot simply be `toFixed(2)`.
   */
  it.each([
    { amount: 60, expected: '₪60' },
    { amount: 300, expected: '₪300' },
    { amount: 0, expected: '₪0' },
  ])('$amount → $expected, with no trailing agorot', ({ amount, expected }) => {
    expect(formatMoney(amount)).toBe(expected)
  })
})

describe('formatMoney — values that land just under a whole shekel', () => {
  /**
   * The bug, stated as the thing a shopper saw.
   *
   * ₪24.90 marked down to ₪14.90 is a ₪10 saving, and the cart said ₪9.100.
   * Written as the subtraction rather than as the literal 9.999999999999998,
   * so the test still describes the situation it came from.
   */
  it('a ₪10 saving on a ₪24.90 item reads as ₪10, not ₪9.100', () => {
    expect(formatMoney(24.9 - 14.9)).toBe('₪10')
  })

  /**
   * The general case. Each of these floors to one shekel and rounds to a
   * hundred agorot under the old split, so each one printed a three-digit
   * "fraction": "₪0.100", "₪9.100", "₪299.100".
   *
   * Rounding UP across the boundary is the correct answer, not a workaround:
   * 9.999999999999998 is ₪10 to the nearest agora, and ₪10 is what was saved.
   */
  it.each([
    { amount: 0.999999999999999, expected: '₪1' },
    { amount: 9.999999999999998, expected: '₪10' },
    { amount: 299.99999999999994, expected: '₪300' },
    { amount: 24.899999999999999, expected: '₪24.90' },
  ])('$amount → $expected', ({ amount, expected }) => {
    expect(formatMoney(amount)).toBe(expected)
  })

  /**
   * Agorot are never printed with more than two digits, whatever arrives.
   * A weaker assertion than the rows above, and a broader one: it fails for
   * any carry bug, including ones nobody has thought of an input for.
   */
  it.each([0.999999, 5.999999, 41.995, 9.999999999999998])(
    'never prints more than two agorot digits (%s)',
    amount => {
      const { agorot } = moneyParts(amount)

      expect(agorot === null || agorot.length === 2).toBe(true)
    }
  )
})

describe('formatMoney — negatives', () => {
  /**
   * The savings row renders its own minus sign in the markup, so `formatMoney`
   * is normally handed a positive number. It still has to be right when it is
   * not: a refund line would be the next caller.
   *
   * Note the sign is U+2212 MINUS SIGN, not a hyphen — matching what the pages
   * already write by hand.
   */
  it.each([
    { amount: -10, expected: '−₪10' },
    { amount: -24.9, expected: '−₪24.90' },
    { amount: -(24.9 - 14.9), expected: '−₪10' },
  ])('$amount → $expected', ({ amount, expected }) => {
    expect(formatMoney(amount)).toBe(expected)
  })
})

describe('moneyAriaLabel', () => {
  /**
   * Screen readers get the same number the sighted shopper gets. Same split,
   * so the same carry bug reached here too — "9 שקלים ו-100 אגורות" is not a
   * quantity of money anyone has ever had.
   */
  it('speaks a carried value as the shekel it rounded to', () => {
    expect(moneyAriaLabel(24.9 - 14.9)).toBe('10 שקלים')
  })

  it('speaks the agorot when there are some', () => {
    expect(moneyAriaLabel(24.9)).toBe('24 שקלים ו-90 אגורות')
  })
})
