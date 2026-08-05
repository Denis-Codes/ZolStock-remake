import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { StockWarning } from '../../src/cmps/StockWarning.jsx'

/**
 * StockWarning — eleven lines of source, and the first component test worth
 * writing, because it is boundary value analysis with a DOM attached.
 *
 * ── What it does ──────────────────────────────────────────────────────────
 * Three outcomes, decided by two props:
 *
 *   out of stock  →  "אזל מהמלאי"
 *   3 or fewer    →  "נותרו רק N!"
 *   4 or more     →  nothing at all
 *
 * The third one is the interesting case. "Renders nothing" is a real
 * requirement — a shelf where every card shouts about stock levels teaches
 * shoppers to ignore the message, so the scarcity cue only appears when it is
 * true. Absence is behaviour, and it needs a test like anything else.
 *
 * ── Querying: the rule that makes component tests durable ─────────────────
 * These tests find things by the text a shopper reads, never by CSS class.
 *
 * That is not style preference. A test asserting `.low-stock` exists is
 * asserting a styling decision — rename the class during a refactor and the
 * test fails while the product is perfectly fine. A test asserting the words
 * "נותרו רק 3!" appear on screen keeps passing through any amount of CSS
 * churn and fails only when a shopper would actually see something different.
 *
 * The heuristic: **query the way a person would describe what they see.** They
 * say "it says 3 left", not "it has class low-stock".
 *
 * ── getBy vs queryBy ──────────────────────────────────────────────────────
 * getBy*   throws if there is no match — use when you expect something
 * queryBy* returns null if there is no match — use when you expect nothing
 *
 * Getting this backwards is the most common beginner error in this library:
 * `expect(getByText('x')).toBeNull()` can never pass, because getByText throws
 * before the expect is ever reached.
 */

describe('StockWarning — out of stock', () => {
  /**
   * Two different ways to be out of stock, one message.
   *
   * `inStock: false` is the flag the server sets. `stockQty: 0` is the number
   * it derives that flag from. They should always agree — but "should always
   * agree" is precisely the assumption that fails when a decrement lands and a
   * flag update does not, and a shopper who can add a phantom item to their
   * cart is a shopper who gets an apologetic email later.
   *
   * Both rows are covered, including the one where they disagree, so the
   * component is safe against either arriving alone.
   */
  it.each([
    { label: 'flag says no', props: { inStock: false, stockQty: 5 } },
    { label: 'quantity says no', props: { inStock: true, stockQty: 0 } },
    { label: 'both say no', props: { inStock: false, stockQty: 0 } },
  ])('says so when the $label', ({ props }) => {
    render(<StockWarning {...props} />)

    expect(screen.getByText('אזל מהמלאי')).toBeInTheDocument()
  })

  it('does not also claim a low stock count', () => {
    // Guards against a version that falls through both branches and renders
    // "אזל מהמלאי" next to "נותרו רק 0!" — contradictory, and it has happened
    // to better components than this one.
    render(<StockWarning inStock={true} stockQty={0} />)

    expect(screen.queryByText(/נותרו רק/)).not.toBeInTheDocument()
  })
})

describe('StockWarning — the scarcity boundary', () => {
  /**
   * The rule is `stockQty <= 3`, so every bug it can have lives at 3 and 4.
   *
   * Four rows: 1 (the extreme), 3 (the limit), 4 (one past it), and 20 (an
   * ordinary value, included once to prove the "nothing" case is not an
   * accident of the boundary). Nothing between 4 and 20 is tested, because
   * every value in there is the same case wearing a different number.
   *
   * `%i` and `%s` in the name are printf-style placeholders filled from the
   * row, so a failure reports "3 left" rather than "case 2 of 4".
   */
  it.each([
    [1, 'נותרו רק 1!'],
    [2, 'נותרו רק 2!'],
    [3, 'נותרו רק 3!'],
  ])('warns at %i in stock', (stockQty, expected) => {
    render(<StockWarning inStock={true} stockQty={stockQty} />)

    /**
     * This finds the text even though the source writes it as
     * `נותרו רק {stockQty}!` — three separate text nodes in the JSX.
     *
     * Testing Library joins an element's *direct* text children before
     * matching, so all three concatenate. Worth knowing the limit: if the
     * number were wrapped in a <strong>, it would no longer be a direct text
     * child and this exact query would fail with "unable to find text" while
     * the screen looked identical. That case needs a function matcher.
     */
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it.each([[4], [5], [20]])('stays quiet at %i in stock', stockQty => {
    const { container } = render(<StockWarning inStock={true} stockQty={stockQty} />)

    /**
     * `toBeEmptyDOMElement` on the container, rather than querying for the
     * absence of a specific string.
     *
     * Asserting `queryByText('נותרו רק 4!')` is null would also pass if the
     * component rendered something else entirely — a stray wrapper, an empty
     * span, a different message. Asserting the container is empty says the
     * component rendered *nothing*, which is the actual requirement.
     */
    expect(container).toBeEmptyDOMElement()
  })
})

describe('StockWarning — inputs it should survive', () => {
  /**
   * No props at all. `!inStock` is true for undefined, so this takes the
   * out-of-stock branch.
   *
   * Not a hypothetical: a product document missing the field, an older cached
   * response, a partial fetch. The requirement is that the component does not
   * throw and does not invent a number — showing "אזל מהמלאי" when the data is
   * unknown is the safe direction to fail, because it declines a sale rather
   * than promising one that cannot be fulfilled.
   */
  it('treats missing data as out of stock, the safe direction', () => {
    render(<StockWarning />)

    expect(screen.getByText('אזל מהמלאי')).toBeInTheDocument()
  })

  /**
   * inStock true, stockQty undefined — the awkward middle.
   *
   * `undefined <= 3` is false, so this renders nothing. That is defensible:
   * the flag says it is available and there is no count to be scarce about.
   * Pinned because it is the branch nobody thinks about, and because the
   * obvious "fix" of `stockQty <= 3` becoming `!stockQty || stockQty <= 3`
   * would flip it to a false out-of-stock on every product missing the field.
   */
  it('renders nothing when it is available but the count is unknown', () => {
    const { container } = render(<StockWarning inStock={true} />)

    expect(container).toBeEmptyDOMElement()
  })
})
