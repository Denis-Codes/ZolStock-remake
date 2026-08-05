/**
 * Money formatting, shared by every surface that states a price.
 *
 * This exists because rounding was not safe to do locally: 38 of the 40
 * catalogue products are priced with agorot (24.90, 39.90 …), so a `toFixed(0)`
 * turned a ₪118.80 order into "₪119" under the label שולם — the one place the
 * interface states what was actually charged. Whole-shekel display is only
 * correct when the agorot really are zero.
 */

export const CURRENCY_SIGN = '₪'

/**
 * Splits an amount into the parts the price tag renders separately.
 *
 * Rounded to agorot BEFORE the split, and both halves are then read off that
 * one integer. The previous version split first — `Math.floor` for the shekels,
 * `Math.round` for the remainder — which reads the two halves off two different
 * numbers, and they disagree whenever the remainder rounds up to a full shekel.
 *
 * That is not a corner case here. 24.90 − 14.90 is 9.999999999999998 in binary
 * floating point, so the cart's savings line floored to 9, rounded the
 * remainder to 100 agorot, and printed "₪9.100": a carry with nowhere to go.
 * Every catalogue price ends in .90, so a subtraction of two of them is the
 * ordinary case, not the unlucky one.
 */
export function moneyParts(amount) {
  const value = Number(amount) || 0
  const totalAgorot = Math.round(Math.abs(value) * 100)

  return {
    sign: value < 0 ? '−' : '',
    whole: String(Math.floor(totalAgorot / 100)),
    // Omitted entirely when they are 00, per DESIGN.md's price-tag rule.
    agorot: totalAgorot % 100 === 0 ? null : String(totalAgorot % 100).padStart(2, '0'),
  }
}

/**
 * "₪24.90", or "₪60" when the agorot are zero. Use wherever a price is a run
 * of text rather than the composed tag.
 */
export function formatMoney(amount) {
  const { sign, whole, agorot } = moneyParts(amount)
  return `${sign}${CURRENCY_SIGN}${whole}${agorot ? `.${agorot}` : ''}`
}

/** Spoken form for aria-labels, e.g. "24 שקלים ו-90 אגורות". */
export function moneyAriaLabel(amount) {
  const { whole, agorot } = moneyParts(amount)
  return agorot ? `${whole} שקלים ו-${agorot} אגורות` : `${whole} שקלים`
}
