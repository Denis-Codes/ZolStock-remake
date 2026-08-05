import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Pagination } from '../../src/cmps/Pagination.jsx'

/**
 * Pagination — the first component here with behaviour rather than just output.
 *
 * ── Two new tools ─────────────────────────────────────────────────────────
 * `vi.fn()` is a spy: a function that records every call made to it. The
 * component takes `onChange`, so the way to ask "did clicking page 3 do the
 * right thing" is to hand it a spy and inspect what it received. Nothing about
 * the parent needs to exist.
 *
 * `userEvent` simulates a real click — pointer down, focus, pointer up, click,
 * in that order, respecting `disabled`. The older `fireEvent.click` dispatches
 * a bare click event and will happily "click" a disabled button that no human
 * could activate, which turns a genuine bug into a passing test. Always
 * userEvent for interaction.
 *
 * It is async, and every call must be awaited. Forgetting the await is the
 * classic mistake: React has not re-rendered when the assertion runs, and the
 * test fails describing the state from *before* the click.
 *
 * ── What is worth testing here ────────────────────────────────────────────
 * The windowing logic is the interesting part. At the catalogue's present size
 * it returns [1, 2] and never engages — so this is code that is effectively
 * untested by using the site, and will first run for real the week the
 * catalogue grows past eight pages. That is the definition of something worth
 * pinning now rather than discovering later.
 */

/* Fresh spy per test. Sharing one would let call counts leak between tests and
   produce failures that depend on run order — the same trap the backend rate
   limiter fell into. */
const setup = props => {
  const onChange = vi.fn()
  const utils = render(<Pagination page={1} totalPages={5} onChange={onChange} {...props} />)
  return { onChange, user: userEvent.setup(), ...utils }
}

describe('Pagination — when it appears at all', () => {
  /**
   * One page is not a choice, so it gets no control.
   *
   * Rendering a disabled paginator under a single page of results is visual
   * noise that says "there is more" when there is not. Absence is the correct
   * output, and `totalPages: 0` is the row people forget — an empty result set
   * is a normal state, not an error state.
   */
  it.each([[0], [1]])('renders nothing for %i pages', totalPages => {
    const { container } = setup({ totalPages })

    expect(container).toBeEmptyDOMElement()
  })

  it('is a landmark a keyboard user can find', () => {
    setup({ totalPages: 5 })

    // <nav> with a name. Screen readers list landmarks, so an unnamed one
    // reads as "navigation" with no way to tell it from the site header.
    expect(screen.getByRole('navigation', { name: 'ניווט בין עמודי תוצאות' })).toBeInTheDocument()
  })
})

describe('Pagination — telling you where you are', () => {
  /**
   * `aria-current="page"` is how the current page is announced. The visual
   * cue is the `is-current` class, but a class is invisible to a screen
   * reader — without the attribute, a blind user can hear the page numbers and
   * not which one they are on.
   *
   * Testing Library exposes it as the `current` option on getByRole, so this
   * asserts the real accessibility contract rather than an attribute string.
   */
  it('marks the current page, and only the current page', () => {
    setup({ page: 3, totalPages: 5 })

    expect(screen.getByRole('button', { name: 'עמוד 3', current: 'page' })).toBeInTheDocument()

    // And nothing else claims to be current. Asserting the positive alone
    // would pass on a component that marks every button.
    const current = screen
      .getAllByRole('button')
      .filter(btn => btn.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
  })

  /**
   * You cannot go back from the first page or forward from the last.
   *
   * `toBeDisabled` rather than checking the attribute, because it understands
   * both the `disabled` property and `aria-disabled` — it asks whether the
   * control is actually unusable, not how that was expressed.
   */
  it('disables the step that leads nowhere', () => {
    const { unmount } = setup({ page: 1, totalPages: 5 })

    expect(screen.getByRole('button', { name: /הקודם/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /הבא/ })).toBeEnabled()

    // Unmount before rendering the second case, otherwise both paginators are
    // in the document at once and every query finds two matches.
    unmount()
    setup({ page: 5, totalPages: 5 })

    expect(screen.getByRole('button', { name: /הקודם/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /הבא/ })).toBeDisabled()
  })
})

describe('Pagination — what a click does', () => {
  it('asks for the page that was clicked', async () => {
    // Three pages, standing on the first. Clicking page 3 must report 3 — a
    // component that reported `page + 1` would also produce a plausible-looking
    // number here if the target were adjacent, so the target is deliberately
    // two steps away.
    const { onChange, user } = setup({ page: 1, totalPages: 3 })

    await user.click(screen.getByRole('button', { name: 'עמוד 3' }))

    // Both halves matter: called once, and called with 3. `toHaveBeenCalled`
    // alone would pass on a component that fires onChange(undefined), or that
    // fires it twice and lands the shopper two pages away.
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it.each([
    { label: 'הבא', page: 2, expected: 3 },
    { label: 'הקודם', page: 2, expected: 1 },
  ])('the $label step moves one page to $expected', async ({ label, page, expected }) => {
    const { onChange, user } = setup({ page, totalPages: 5 })

    await user.click(screen.getByRole('button', { name: new RegExp(label) }))

    expect(onChange).toHaveBeenCalledWith(expected)
  })

  /**
   * The disabled edge, tested through a real click rather than by reading the
   * attribute.
   *
   * This is where userEvent earns its keep: it refuses to activate a disabled
   * control, exactly as a browser does. `fireEvent.click` would dispatch the
   * event anyway, onChange(0) would fire, and the test would pass while the
   * app asked for page zero.
   */
  it('cannot be clicked past the first page', async () => {
    const { onChange, user } = setup({ page: 1, totalPages: 5 })

    await user.click(screen.getByRole('button', { name: /הקודם/ }))

    expect(onChange).not.toHaveBeenCalled()
  })

  /**
   * Clicking the page you are already on still calls onChange.
   *
   * Pinned as a deliberate non-optimisation. Suppressing it would be a
   * reasonable-looking change, and it would be the parent — not this
   * component — that should decide whether a no-op navigation is worth
   * skipping. Written down so the next person knows the current answer.
   */
  it('reports a click on the current page rather than swallowing it', async () => {
    const { onChange, user } = setup({ page: 3, totalPages: 5 })

    await user.click(screen.getByRole('button', { name: 'עמוד 3' }))

    expect(onChange).toHaveBeenCalledWith(3)
  })
})

describe('Pagination — windowing', () => {
  /* The page numbers on screen, in order. The ellipsis is aria-hidden, so a
     role query steps over it — which is the correct reading: a gap is not a
     destination and should not be announced as one. */
  const pageNumbers = () =>
    screen
      .getAllByRole('button')
      .map(btn => btn.getAttribute('aria-label'))
      .filter(Boolean)
      .map(label => Number(label.replace('עמוד ', '')))

  /**
   * Small enough to show every page: no gaps, nothing hidden.
   *
   * The baseline the other rows are measured against — without it, a broken
   * windowing function that returned every page always would still pass the
   * interesting rows below by accident.
   *
   * Note the numbers: THREE pages, not five. I first wrote this as five and it
   * failed, which is how the window turned out to be far narrower than it
   * looks — see the two tests at the bottom of this block.
   */
  it('shows every page when they all fit', () => {
    setup({ page: 1, totalPages: 3 })

    expect(pageNumbers()).toEqual([1, 2, 3])
  })

  /**
   * Twenty pages, standing on page 10. The window keeps the first, the last,
   * and one either side of the current — and collapses the two runs between
   * them.
   *
   * The requirement underneath: **page 1 and the last page are always
   * reachable in one click, from anywhere.** That is what stops a shopper on
   * page 14 of 20 having to click "previous" thirteen times to get home.
   */
  it('keeps the ends reachable and collapses the middle', () => {
    setup({ page: 10, totalPages: 20 })

    expect(pageNumbers()).toEqual([1, 9, 10, 11, 20])
    expect(screen.getAllByText('…')).toHaveLength(2)
  })

  /**
   * At the near edge there is nothing to collapse on the left, so only one
   * ellipsis appears. The version of this that renders "1 … 1 2 3" is a common
   * off-by-one and looks absurd on screen.
   */
  it('does not open a gap where there is nothing to hide', () => {
    setup({ page: 2, totalPages: 20 })

    expect(pageNumbers()).toEqual([1, 2, 3, 20])
    expect(screen.getAllByText('…')).toHaveLength(1)
  })

  it('mirrors that at the far edge', () => {
    setup({ page: 19, totalPages: 20 })

    expect(pageNumbers()).toEqual([1, 18, 19, 20])
    expect(screen.getAllByText('…')).toHaveLength(1)
  })

  /**
   * No duplicates where the window overlaps the edges.
   *
   * The source builds the list in a Set precisely for this, and on page 2 of 3
   * every rule — "always show 1", "always show the last", "show either side of
   * current" — wants an overlapping number. An array-based implementation
   * renders "1 1 2 3 3" here, which is why this row exists.
   */
  it('never repeats a page number when the ranges overlap', () => {
    setup({ page: 2, totalPages: 3 })

    const shown = pageNumbers()
    expect(shown).toEqual([1, 2, 3])
    expect(new Set(shown).size).toBe(shown.length)
  })

  /**
   * ── How wide the window actually is ─────────────────────────────────────
   * EDGE = 1 and AROUND = 1, so the most this ever shows is five numbers:
   * first, current−1, current, current+1, last. Written out, the whole range
   * looks like this:
   *
   *   page 1 of 3    →  1 2 3
   *   page 1 of 4    →  1 2 … 4
   *   page 1 of 5    →  1 2 … 5
   *   page 3 of 5    →  1 2 3 4 5
   *   page 10 of 20  →  1 … 9 10 11 … 20
   *
   * Pinned because it is not what the constants suggest at a glance, and
   * because it is the kind of thing that gets "tidied" by someone who assumes
   * the window is wider than it is.
   */
  it('shows at most five page numbers, however large the catalogue grows', () => {
    setup({ page: 500, totalPages: 1000 })

    expect(pageNumbers()).toEqual([1, 499, 500, 501, 1000])
  })

  /**
   * ── FOUND WHILE WRITING THESE TESTS ─────────────────────────────────────
   * On page 1 of 4, the ellipsis hides exactly one page: 3.
   *
   *   renders   1 2 … 4
   *   could be  1 2 3 4
   *
   * The "…" occupies the same width as the digit it replaced, so the collapse
   * saves nothing and costs the shopper a destination — page 3 becomes
   * unreachable in one click for no gain. The usual guard is to only collapse
   * a run of two or more.
   *
   * This test PASSES: it pins what the component does today, honestly, rather
   * than asserting what it should do. Per the project's bug policy the code is
   * not being changed here — see the summary for whether this earns a bug doc.
   * If it is fixed, this test failing is the correct and intended signal.
   */
  it('currently collapses a single page behind an ellipsis (see summary)', () => {
    setup({ page: 1, totalPages: 4 })

    expect(pageNumbers()).toEqual([1, 2, 4])
    expect(screen.getAllByText('…')).toHaveLength(1)
  })
})
