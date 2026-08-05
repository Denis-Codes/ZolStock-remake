import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { VariantSelector } from '../../src/cmps/VariantSelector.jsx'

/**
 * VariantSelector — size and colour, and the variant they resolve to.
 *
 * ── Why this component is worth real attention ────────────────────────────
 * It is the last thing between a shopper and the wrong item arriving. Every
 * other component here displays something; this one decides what gets bought.
 * A rendering bug shows the wrong pixels. A bug here ships the wrong parcel,
 * and the shopper does not find out for two days.
 *
 * ── The shape of the problem ──────────────────────────────────────────────
 * The component takes a flat list of variants — each one a concrete
 * size+colour combination — and splits it into two independent lists of
 * buttons. Two independent selections, recombined into one variant.
 *
 * That recombination is where the interesting failures live, because not every
 * size exists in every colour, and the two lists have no idea about each
 * other.
 */

/* Every size in every colour. The boring case, and the baseline: anything that
   fails here fails for a reason unrelated to availability. */
const FULL_MATRIX = [
  { size: 'M', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 10 },
  { size: 'M', color: 'blue', colorHe: 'כחול', inStock: true, stockQty: 10 },
  { size: 'L', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 10 },
  { size: 'L', color: 'blue', colorHe: 'כחול', inStock: true, stockQty: 10 },
]

/* A real catalogue is never a full matrix. Here M exists only in red and L
   only in blue — so "M" and "blue" are each individually available, and
   together they are nothing at all. */
const SPARSE = [
  { size: 'M', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 5 },
  { size: 'L', color: 'blue', colorHe: 'כחול', inStock: true, stockQty: 5 },
]

const sizeButton = size => screen.getByRole('button', { name: size, exact: true })
const colorButton = colorHe => screen.getByRole('button', { name: colorHe })

describe('VariantSelector — first paint', () => {
  it('renders nothing for a product without variants', () => {
    // A plain product must not get an empty control with two dangling labels.
    // Both rows: undefined is what a product document without the field gives,
    // [] is what an admin who removed the last variant gives.
    for (const variants of [undefined, []]) {
      const { container, unmount } = render(<VariantSelector variants={variants} />)
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  /**
   * Something must be selected before the shopper touches anything, or the
   * add-to-cart button has no variant to add and the first click does nothing
   * for reasons the shopper cannot see.
   */
  it('preselects the first size and colour', () => {
    render(<VariantSelector variants={FULL_MATRIX} />)

    expect(sizeButton('M')).toHaveClass('selected')
    expect(colorButton('אדום')).toHaveClass('selected')
  })

  it('honours an initial variant when the caller supplies one', () => {
    // Used when arriving from a link that already names a variant, so the page
    // opens on the one the shopper was looking at rather than resetting.
    render(<VariantSelector variants={FULL_MATRIX} initialVariant={{ size: 'L', color: 'blue' }} />)

    expect(sizeButton('L')).toHaveClass('selected')
    expect(colorButton('כחול')).toHaveClass('selected')
  })

  /**
   * The parent needs the resolved variant immediately, not only after an
   * interaction — otherwise adding to cart straight away sends null.
   */
  it('tells the parent what is selected before any interaction', () => {
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={FULL_MATRIX} onVariantSelect={onVariantSelect} />)

    expect(onVariantSelect).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'M', color: 'red' })
    )
  })
})

describe('VariantSelector — choosing', () => {
  it('moves the selection and reports the new variant', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={FULL_MATRIX} onVariantSelect={onVariantSelect} />)

    await user.click(sizeButton('L'))

    expect(sizeButton('L')).toHaveClass('selected')
    expect(sizeButton('M')).not.toHaveClass('selected')
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'L', color: 'red' })
    )
  })

  it('keeps the colour when only the size changes', async () => {
    // Changing size must not silently reset the colour — the shopper picked
    // blue on purpose and did not ask for that to be undone.
    const user = userEvent.setup()
    render(<VariantSelector variants={FULL_MATRIX} />)

    await user.click(colorButton('כחול'))
    await user.click(sizeButton('L'))

    expect(colorButton('כחול')).toHaveClass('selected')
  })

  /**
   * The stock line under the buttons, which is what the shopper actually
   * reads. Three states, and the boundary is the same `<= 3` rule StockWarning
   * uses — two components implementing one threshold, so both are pinned to
   * the same numbers.
   */
  it.each([
    { stockQty: 10, inStock: true, text: 'במלאי' },
    { stockQty: 3, inStock: true, text: 'נותרו רק 3 במלאי!' },
    { stockQty: 0, inStock: false, text: 'אזל מהמלאי' },
  ])('reports "$text" for the selected variant', ({ stockQty, inStock, text }) => {
    render(
      <VariantSelector
        variants={[{ size: 'M', color: 'red', colorHe: 'אדום', inStock, stockQty }]}
      />
    )

    expect(screen.getByText(text)).toBeInTheDocument()
  })
})

describe('VariantSelector — availability', () => {
  /**
   * A size that exists in no in-stock variant cannot be chosen at all.
   *
   * `toBeDisabled` rather than checking for the class: the class is how it
   * looks, `disabled` is whether it works. A greyed-out button that still
   * responds to clicks is a worse bug than one that looks enabled, because the
   * shopper has been told no and the app said yes anyway.
   */
  it('disables a size that is entirely out of stock', () => {
    render(
      <VariantSelector
        variants={[
          { size: 'M', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 5 },
          { size: 'L', color: 'red', colorHe: 'אדום', inStock: false, stockQty: 0 },
        ]}
      />
    )

    expect(sizeButton('M')).toBeEnabled()
    expect(sizeButton('L')).toBeDisabled()
  })

  it('cannot be clicked into an out-of-stock size', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(
      <VariantSelector
        variants={[
          { size: 'M', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 5 },
          { size: 'L', color: 'red', colorHe: 'אדום', inStock: false, stockQty: 0 },
        ]}
        onVariantSelect={onVariantSelect}
      />
    )

    onVariantSelect.mockClear()
    await user.click(sizeButton('L'))

    // userEvent refuses a disabled control, exactly as a browser does — so the
    // selection never moved and the parent was never told otherwise.
    expect(sizeButton('M')).toHaveClass('selected')
    expect(onVariantSelect).not.toHaveBeenCalled()
  })
})

describe('VariantSelector — the sparse catalogue', () => {
  /**
   * 🐛 FOUND WHILE WRITING THIS FILE — see bugs/BUG-006.
   *
   * Size and colour are two independent lists, and neither constrains the
   * other. With a sparse catalogue that lets the shopper build a combination
   * that does not exist:
   *
   *   variants:  M/red,  L/blue
   *   selection: L    +  red      ← no such variant
   *
   * The component's resolution falls back through
   * `variants.find(v => v.size === selectedSize)` and quietly returns L/blue.
   * So the screen shows size L selected AND red selected, while the variant
   * actually being added to the cart is blue.
   *
   * The shopper is looking at a red swatch and buying a blue one. There is no
   * warning, and no stage after this one can catch it — by the time the cart
   * has the variant, the mistake is indistinguishable from a real choice.
   *
   * This test asserts what the component DOES today, not what it should do, so
   * the suite stays green and the behaviour is written down. The assertion
   * that it should not be possible belongs with the fix.
   */
  it('currently resolves an impossible size+colour to a different variant', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={SPARSE} onVariantSelect={onVariantSelect} />)

    // Opens on M/red, which is real.
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'M', color: 'red' })
    )

    // Both buttons are enabled: L is in stock (in blue) and red is in stock
    // (in M). Neither list knows the other's selection.
    expect(sizeButton('L')).toBeEnabled()
    await user.click(sizeButton('L'))

    // The screen now says L and red...
    expect(sizeButton('L')).toHaveClass('selected')
    expect(colorButton('אדום')).toHaveClass('selected')

    // ...and the variant handed to the parent is blue.
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'L', color: 'blue' })
    )
  })

  /**
   * The consequence, stated as its own test because it is the part a
   * non-technical reader needs: the colour on screen and the colour being
   * bought disagree.
   */
  it('shows a colour name that does not match the variant being bought', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={SPARSE} onVariantSelect={onVariantSelect} />)

    await user.click(sizeButton('L'))

    const shown = screen.getByText('אדום', { selector: '.selected-color-name' })
    const [[resolved]] = onVariantSelect.mock.calls.slice(-1)

    expect(shown).toBeInTheDocument()
    expect(resolved.colorHe).toBe('כחול')
  })
})

/**
 * ── Flagged, not changed ──────────────────────────────────────────────────
 * `isVariantAvailable(size, color)` is defined in the component and never
 * called. It is precisely the function that would fix the bug above — it
 * already knows whether a size+colour pair exists — so it reads like an
 * intention that was written and then not wired up. Left in place; noted here
 * because deleting it would remove the clue.
 */
