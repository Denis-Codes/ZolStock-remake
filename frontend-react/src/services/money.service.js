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

/** Splits an amount into the parts the price tag renders separately. */
export function moneyParts(amount) {
  const value = Number(amount) || 0
  const whole = Math.floor(Math.abs(value))
  const agorot = Math.round((Math.abs(value) - whole) * 100)

  return {
    sign: value < 0 ? '−' : '',
    whole: String(whole),
    // Omitted entirely when they are 00, per DESIGN.md's price-tag rule.
    agorot: agorot === 0 ? null : String(agorot).padStart(2, '0'),
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
