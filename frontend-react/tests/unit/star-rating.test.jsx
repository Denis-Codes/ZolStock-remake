import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { StarRating } from '../../src/cmps/StarRating.jsx'

/**
 * StarRating — the same information rendered twice, for two different readers.
 *
 * ── The thing this component is actually about ────────────────────────────
 * Five SVG stars mean nothing to a screen reader. A `<path d="M12 2l3.09...">`
 * is geometry; there is no text in it, and read literally it produces silence
 * or gibberish. So the whole control carries `role="img"` with an `aria-label`
 * spelling the rating out in words, and every glyph inside is `aria-hidden`.
 *
 * That makes the accessible label the *primary* output of this component, not
 * a nicety bolted on the side — and it is the thing most likely to rot,
 * because nothing on screen changes when it breaks. Someone adds a prop, the
 * label stops including the review count, and it looks perfect to everyone who
 * can see it. A test is the only reader that notices.
 *
 * ── getByRole is the query that matters ───────────────────────────────────
 * `getByRole('img', { name: '...' })` asks the DOM the same question assistive
 * technology asks: what are you, and what are you called? It resolves the
 * accessible name through the full algorithm — aria-label, aria-labelledby,
 * text content — rather than reading one attribute.
 *
 * So a passing test here is a real statement about whether the component is
 * usable without sight, and not merely that a string was set somewhere.
 */

describe('StarRating — what it announces', () => {
  it('names the score and the number of reviews', () => {
    render(<StarRating rating={4.5} reviewCount={24} />)

    expect(
      screen.getByRole('img', { name: 'דירוג 4.5 מתוך 5, 24 ביקורות' })
    ).toBeInTheDocument()
  })

  /**
   * Two ways to end up with no count: the caller turns it off for a compact
   * card, or the product has never been reviewed and the prop is absent.
   *
   * Both must produce a label that still reads as a sentence. The failure this
   * prevents is "דירוג 4.5 מתוך 5, undefined ביקורות", which is what you get
   * from string interpolation with no guard — visible to exactly the users who
   * cannot see that it looks wrong.
   */
  it.each([
    { label: 'the caller hides it', props: { rating: 4.5, reviewCount: 24, showCount: false } },
    { label: 'there are none', props: { rating: 4.5 } },
  ])('omits the review count when $label', ({ props }) => {
    render(<StarRating {...props} />)

    expect(screen.getByRole('img', { name: 'דירוג 4.5 מתוך 5' })).toBeInTheDocument()
  })

  /**
   * A rating of 4 must announce "4.0", not "4".
   *
   * `toFixed(1)` in the source does this. It reads like formatting fussiness
   * and it is not: a scale is only legible as a scale if every value on it has
   * the same shape, and "4 מתוך 5" alongside "4.5 מתוך 5" reads as two
   * different measurements.
   */
  it('always announces one decimal place', () => {
    render(<StarRating rating={4} reviewCount={10} />)

    expect(screen.getByRole('img', { name: 'דירוג 4.0 מתוך 5, 10 ביקורות' })).toBeInTheDocument()
  })
})

describe('StarRating — when it declines to render', () => {
  /**
   * THE FALSY TRAP, third appearance in this suite, and the source is written
   * specifically to avoid it: `if (!rating && rating !== 0) return null`.
   *
   * A rating of 0 is a real, meaningful value — a product that has been rated
   * and rated badly. `if (!rating)` would hide it, which quietly flatters
   * every worst product in the catalogue by showing no rating at all rather
   * than a bad one.
   *
   * These two tests are the pair that keeps that distinction alive. Neither is
   * meaningful without the other: the first alone would pass on a component
   * that always renders, the second alone on one that never does.
   */
  it('renders a rating of zero, because zero is a rating', () => {
    render(<StarRating rating={0} reviewCount={3} />)

    expect(screen.getByRole('img', { name: 'דירוג 0.0 מתוך 5, 3 ביקורות' })).toBeInTheDocument()
  })

  it.each([[undefined], [null]])('renders nothing when the rating is %o', rating => {
    const { container } = render(<StarRating rating={rating} reviewCount={3} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('StarRating — the visual scale', () => {
  /**
   * ── A deliberate exception to the "never query by class" rule ────────────
   * Everything above queries by role and accessible name. These tests reach
   * into the DOM with `.star`, which is exactly what the other files avoid.
   *
   * The justification: the glyphs are `aria-hidden` on purpose, so there is no
   * accessible query that can see them — by design, the only reader they exist
   * for is a human eye. The choice is to test them through a class hook or not
   * to test them at all.
   *
   * The cost is real and worth stating: renaming `.star` in the stylesheet
   * breaks these three tests without breaking the product. That is an accepted
   * tradeoff here, not an oversight, and it is confined to this block.
   */
  const starsIn = container => ({
    full: container.querySelectorAll('.star.full').length,
    half: container.querySelectorAll('.star.half').length,
    empty: container.querySelectorAll('.star.empty').length,
  })

  /**
   * The invariant: five glyphs, always, whatever the rating.
   *
   * This is the assertion worth having. The arithmetic in the source —
   * `emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)` — is exactly the kind
   * that produces four stars for one input and six for another, and a row of
   * stars that changes length as you scroll a shelf looks broken before anyone
   * can say why.
   *
   * The half-star window is `rating % 1` between 0.3 and 0.7, which is why 4.2
   * and 4.8 both render as four full stars and one empty rather than rounding
   * to a half. Slightly lossy, entirely consistent, and the total still holds.
   */
  it.each([
    { rating: 0, full: 0, half: 0, empty: 5 },
    { rating: 3, full: 3, half: 0, empty: 2 },
    { rating: 4.2, full: 4, half: 0, empty: 1 },
    { rating: 4.5, full: 4, half: 1, empty: 0 },
    { rating: 4.8, full: 4, half: 0, empty: 1 },
    { rating: 5, full: 5, half: 0, empty: 0 },
  ])('$rating → $full full, $half half, $empty empty', ({ rating, full, half, empty }) => {
    const { container } = render(<StarRating rating={rating} />)

    expect(starsIn(container)).toEqual({ full, half, empty })
    expect(full + half + empty).toBe(5)
  })

  /**
   * The compact variant, which exists for a measured reason: five 12px stars
   * cost 87px of a 147px meta line on a phone-width card, truncating the
   * subcategory on four cards in five.
   *
   * So it renders one star and the number. What must NOT change is the
   * announcement — the label is identical in both variants, because the reason
   * for dropping the glyphs was horizontal space, and a screen reader does not
   * have that problem.
   */
  it('drops to a single glyph in compact mode without changing what it says', () => {
    const { container } = render(<StarRating rating={4.5} reviewCount={24} compact />)

    expect(container.querySelectorAll('.star')).toHaveLength(1)
    expect(
      screen.getByRole('img', { name: 'דירוג 4.5 מתוך 5, 24 ביקורות' })
    ).toBeInTheDocument()
  })

  /**
   * A rating above 5 should not be possible — the API clamps it — but the
   * component does not, and `emptyStars` goes negative at 6. The source guards
   * the array with Math.max so it does not throw; it just renders six stars.
   *
   * Recorded as a known gap rather than dressed up as correct. If a bad import
   * ever puts a 6 in the catalogue, this test says what the shelf will look
   * like, and the next person does not have to reason it out from the source.
   */
  it('renders more than five glyphs for an impossible rating, without crashing', () => {
    const { container } = render(<StarRating rating={6} />)

    expect(container.querySelectorAll('.star')).toHaveLength(6)
  })
})
