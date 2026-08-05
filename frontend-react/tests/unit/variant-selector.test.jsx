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
   * 🐛 FOUND WHILE WRITING THIS FILE, now fixed — see bugs/BUG-006.
   *
   * Size and colour were two independent lists, and neither constrained the
   * other. With a sparse catalogue that let the shopper build a combination
   * that did not exist:
   *
   *   variants:  M/red,  L/blue
   *   selection: L    +  red      ← no such variant
   *
   * Resolution fell through `variants.find(v => v.size === selectedSize)` and
   * quietly returned L/blue. The screen showed size L AND red selected while
   * the variant going into the cart was blue — a red swatch, a blue parcel,
   * and no stage after this one able to notice, because by the time the cart
   * holds the variant the mistake is indistinguishable from a real choice.
   *
   * These tests were written against that behaviour and were inverted when the
   * fix landed. The sparse fixture is the valuable part: a fixture where every
   * combination exists cannot exercise the code that decides what to do when
   * one does not.
   */
  it('cannot be put into a size+colour combination that does not exist', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={SPARSE} onVariantSelect={onVariantSelect} />)

    // Opens on M/red, which is real.
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'M', color: 'red' })
    )

    // L is in stock, so it stays selectable — the fix constrains colour, not
    // size. Nothing here should make a real size unreachable.
    expect(sizeButton('L')).toBeEnabled()
    await user.click(sizeButton('L'))

    // Red does not exist in L, so it is no longer offered, and the selection
    // has moved to the colour L actually comes in.
    expect(sizeButton('L')).toHaveClass('selected')
    expect(colorButton('אדום')).toBeDisabled()
    expect(colorButton('כחול')).toHaveClass('selected')

    // And the variant handed to the parent is the one on screen.
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'L', color: 'blue' })
    )
  })

  /**
   * The consequence, stated as its own test because it is the part a
   * non-technical reader needs: the colour on screen and the colour being
   * bought are the same colour.
   */
  it('shows the colour name of the variant actually being bought', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={SPARSE} onVariantSelect={onVariantSelect} />)

    await user.click(sizeButton('L'))

    const [[resolved]] = onVariantSelect.mock.calls.slice(-1)

    expect(screen.getByText(resolved.colorHe, { selector: '.selected-color-name' })).toBeInTheDocument()
    expect(screen.queryByText('אדום', { selector: '.selected-color-name' })).toBeNull()
  })

  /**
   * The half of the fix that is easy to leave out, and the reason the chosen
   * colour is kept in state rather than overwritten when it becomes
   * impossible.
   *
   * A shopper who wanted red and looked at L has not stopped wanting red.
   * Discarding the choice on the way past would mean coming back to M and
   * finding blue, which is a smaller version of the same complaint: the
   * component deciding something on the shopper's behalf without saying so.
   */
  it('restores the shopper\'s colour when they return to a size that has it', async () => {
    const user = userEvent.setup()
    const onVariantSelect = vi.fn()

    render(<VariantSelector variants={SPARSE} onVariantSelect={onVariantSelect} />)

    await user.click(sizeButton('L'))
    expect(colorButton('כחול')).toHaveClass('selected')

    await user.click(sizeButton('M'))

    expect(colorButton('אדום')).toHaveClass('selected')
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'M', color: 'red' })
    )
  })

  it('opens on a real variant even when asked for an impossible one', async () => {
    /**
     * `initialVariant` comes from a link, and a link can be stale — the
     * combination it names may have sold out or never existed. The same
     * constraint has to apply on first paint, not only after a click, or the
     * bug simply moves to the URL.
     */
    const onVariantSelect = vi.fn()

    render(
      <VariantSelector
        variants={SPARSE}
        initialVariant={{ size: 'L', color: 'red' }}
        onVariantSelect={onVariantSelect}
      />
    )

    expect(sizeButton('L')).toHaveClass('selected')
    expect(colorButton('כחול')).toHaveClass('selected')
    expect(onVariantSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'L', color: 'blue' })
    )
  })

  it('leaves the selection alone when nothing in the size is in stock', async () => {
    /**
     * The edge the fix must not turn into a crash or a silent lie: there is no
     * available colour to move to, so the chosen one stands and the stock line
     * is what tells the shopper why. A component that blanked the swatch here
     * would be replacing a wrong answer with no answer.
     */
    render(
      <VariantSelector
        variants={[
          { size: 'M', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 5 },
          { size: 'L', color: 'blue', colorHe: 'כחול', inStock: false, stockQty: 0 },
        ]}
        initialVariant={{ size: 'L', color: 'blue' }}
      />
    )

    expect(colorButton('כחול')).toHaveClass('selected')
    expect(screen.getByText('אזל מהמלאי')).toBeInTheDocument()
  })
})
