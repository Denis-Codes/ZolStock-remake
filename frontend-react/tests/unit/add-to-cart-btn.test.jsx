import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore, combineReducers, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { AddToCartBtn } from '../../src/cmps/AddToCartBtn.jsx'
import { cartReducer } from '../../src/store/reducers/cart.reducer'

/**
 * AddToCartBtn — the first component here that needs CONTEXT to exist at all.
 *
 * ── The lesson this file exists for ───────────────────────────────────────
 * Everything tested so far took props and returned markup. This one calls
 * useDispatch(), which reads from React context — so rendering it bare throws
 * "could not find react-redux context value" before a single assertion runs.
 *
 * That error confuses people because it names Redux while the actual problem
 * is that the test rendered half a component. The rule: **a component that
 * consumes context must be rendered inside a provider, in tests exactly as in
 * the app.** Same for a Router, a theme, a query client.
 *
 * ── A real store, not a mock one ──────────────────────────────────────────
 * The store below is built from the app's REAL cart reducer. The alternative —
 * mocking useDispatch and asserting it was called — would test that a function
 * was invoked, which is a restatement of the source code rather than a claim
 * about behaviour. Rename the action or break the reducer and that test still
 * passes.
 *
 * With a real store the assertion is what a shopper would care about: after
 * clicking, is the thing in the cart? That survives any refactor that keeps
 * the behaviour.
 *
 * Only cartModule is wired up. The component touches nothing else, and a
 * smaller store means a failure cannot come from an unrelated reducer.
 */
function renderWithStore(ui) {
  const store = createStore(combineReducers({ cartModule: cartReducer }), applyMiddleware(thunk))

  return {
    store,
    // Told which clock to use, because the whole file runs on fake timers —
    // see the beforeEach below. Without this, userEvent's internal waits sit
    // on a clock it does not control.
    user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
    ...render(<Provider store={store}>{ui}</Provider>),
  }
}

const cartOf = store => store.getState().cartModule.cart

const PRODUCT = {
  _id: 'p1',
  displayNameHe: 'סיר בדיקה',
  price: 120,
  originalPrice: 120,
  inStock: true,
  stockQty: 10,
  images: ['/assets/img/pot.png'],
}

beforeEach(() => {
  /* The guest branch of addToCart persists to localStorage. Left over between
     tests it would make a later test start with a cart it never filled — the
     same shared-state trap that broke the backend rate-limit tests, in a
     different disguise. */
  localStorage.clear()
  sessionStorage.clear()

  /**
   * ── Fake timers for the whole file, and the leak that made it necessary ──
   * AddToCartBtn schedules two nested setTimeouts on every click — 300ms, then
   * 1500ms — and never clears them. Nothing cancels them when the component
   * unmounts, so a test that clicks and finishes leaves a callback armed. It
   * fires after the test environment has been torn down, and Vitest reports:
   *
   *   "This error was caught after test environment was torn down"
   *
   * The suite still passed. That is what makes it worth fixing rather than
   * ignoring — an error that appears after the summary line is exactly the
   * kind of thing that becomes an intermittent CI failure months later, and
   * the report will point at whichever test happened to be running.
   *
   * `shouldAdvanceTime` lets real time keep moving so userEvent's own waits
   * resolve, while the component's timers stay cancellable from afterEach.
   *
   * The underlying issue is in the component, not the test: a cleanup that
   * clears both timeouts on unmount would remove the leak at the source.
   * Flagged rather than changed — this stage adds tests, it does not edit
   * source.
   */
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  // Discards anything still armed, so no callback outlives its test.
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('AddToCartBtn — adding', () => {
  it('puts the product in the cart', async () => {
    const { store, user } = renderWithStore(<AddToCartBtn product={PRODUCT} />)

    await user.click(screen.getByRole('button'))

    /**
     * waitFor retries until the assertion passes or times out.
     *
     * Needed because addToCart is a thunk: the click returns before the store
     * has been updated. Asserting immediately would read the state from before
     * the dispatch landed and fail perhaps nine runs in ten — the definition of
     * a flaky test.
     *
     * This is also why an arbitrary sleep is the wrong fix. waitFor polls for a
     * CONDITION, so it finishes as soon as the work is done and fails honestly
     * if it never is.
     */
    await waitFor(() => {
      expect(cartOf(store)).toHaveLength(1)
    })

    expect(cartOf(store)[0]).toMatchObject({
      productId: 'p1',
      name: 'סיר בדיקה',
      price: 120,
      quantity: 1,
    })
  })

  /**
   * Double-click protection, discovered by writing the merge test below and
   * having it fail.
   *
   * The handler early-returns while `isAdding` is true, and that flag stays set
   * for 300ms after a click. So a shopper who double-clicks — or whose finger
   * bounces on a touchscreen, which is extremely common — adds one item, not
   * two.
   *
   * That is genuinely good behaviour and it was not obvious from reading the
   * component, because the guard reads like a spinner detail rather than a
   * protection. Pinned so it is not "simplified" away by someone who reaches
   * the same conclusion.
   */
  it('ignores a second click while the first is still in flight', async () => {
    const { store, user } = renderWithStore(<AddToCartBtn product={PRODUCT} />)

    const button = screen.getByRole('button')
    await user.click(button)
    await user.click(button)

    await waitFor(() => expect(cartOf(store)).toHaveLength(1))
    expect(cartOf(store)[0].quantity).toBe(1)
  })

  it('merges a deliberate repeat add into one line rather than duplicating it', async () => {
    // Two lines for the same product is the classic cart bug: the shopper sees
    // the item twice and cannot work out which one to remove.
    const { store, user } = renderWithStore(<AddToCartBtn product={PRODUCT} />)

    await user.click(screen.getByRole('button'))

    /**
     * Wait for the confirmation before clicking again.
     *
     * This is not padding. "נוסף!" only renders once `isAdding` has cleared,
     * so it is the observable signal that the button will accept another
     * click — a condition, not a duration. A fixed sleep would be guessing at
     * the same thing and would break the day the delay changes.
     */
    await screen.findByText('נוסף!')

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(cartOf(store)).toHaveLength(1)
      expect(cartOf(store)[0].quantity).toBe(2)
    })
  })

  it('keeps a chosen variant as its own line', async () => {
    const variant = { size: 'M', color: 'red', colorHe: 'אדום', inStock: true, stockQty: 5 }
    const { store, user } = renderWithStore(
      <AddToCartBtn product={PRODUCT} selectedVariant={variant} />
    )

    await user.click(screen.getByRole('button'))

    await waitFor(() => expect(cartOf(store)).toHaveLength(1))
    expect(cartOf(store)[0].variant).toEqual(variant)
    // Size M and size L of one product are different things to pick and ship,
    // so they must not collapse into a single line.
    expect(cartOf(store)[0].variantKey).toBe('p1-M-red')
  })

  /**
   * Was BUG-001 (fixed). The source used to hardcode it:
   *
   *     dispatch(addToCart(product, 1, selectedVariant))
   *
   * There was no quantity prop, so a caller had no way to ask for two — which
   * is exactly what ProductDetails needs, since it renders a quantity stepper
   * right beside this button. The shopper set 3, clicked add, and got 1.
   *
   * The bug was ALSO covered by a Playwright test that drives a browser, loads
   * a product page, clicks the stepper and reads the cart. That test takes
   * seconds; this one takes milliseconds and names the cause rather than the
   * symptom. Both were kept: the browser test proves ProductDetails passes the
   * value, this one proves the button honours it.
   *
   * That is the testing pyramid argument made concrete — **push every
   * assertion to the cheapest layer that can hold it** — and the reason to
   * keep two tests for one bug when they fail for different reasons.
   *
   * This began life as `it.fails()`. When the prop was added, Vitest reported
   * an unexpected pass, and the marker came out. That red was the signal, not
   * a regression. (Playwright spells the same idea `test.fail()` — two
   * runners, two dialects.)
   */
  it('respects a requested quantity', async () => {
    const { store, user } = renderWithStore(<AddToCartBtn product={PRODUCT} quantity={3} />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => expect(cartOf(store)).toHaveLength(1))
    expect(cartOf(store)[0].quantity).toBe(3)
  })

  /**
   * The other half of the fix, and the half the browser test cannot see.
   *
   * `quantity` defaults to 1 because ProductPreview — used in the listing and
   * the homepage deals band — has no stepper and passes nothing. Making the
   * prop required instead would have sent `undefined` from those call sites
   * and quietly broken every add-to-cart outside the product page.
   *
   * A default is invisible until something depends on it, which is precisely
   * when it needs a test.
   */
  it('defaults to 1 for the call sites that have no quantity control', async () => {
    const { store, user } = renderWithStore(<AddToCartBtn product={PRODUCT} />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => expect(cartOf(store)).toHaveLength(1))
    expect(cartOf(store)[0].quantity).toBe(1)
  })
})

describe('AddToCartBtn — when it refuses', () => {
  /**
   * Three ways to be unavailable, and all three must disable the control.
   *
   * The last row is the one worth having: a product that is in stock overall
   * while the SELECTED variant is not. Size L sold out does not make the
   * product sold out, and a button that reads the product flag only would stay
   * happily clickable.
   */
  it.each([
    { label: 'the product flag says no', props: { product: { ...PRODUCT, inStock: false } } },
    { label: 'the stock count is zero', props: { product: { ...PRODUCT, stockQty: 0 } } },
    {
      label: 'the chosen variant is sold out',
      props: { product: PRODUCT, selectedVariant: { size: 'L', inStock: false, stockQty: 0 } },
    },
  ])('is disabled when $label', ({ props }) => {
    renderWithStore(<AddToCartBtn {...props} />)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('title', 'אזל מהמלאי')
  })

  it('adds nothing when clicked while sold out', async () => {
    /**
     * The state assertion, not just the attribute one.
     *
     * `toBeDisabled` says how the button is marked. This says nothing reached
     * the cart — and those can differ, because the handler has its own early
     * return that a refactor could remove while the attribute stayed. Both
     * assertions, one behaviour, and this is the half that matters.
     */
    const { store, user } = renderWithStore(
      <AddToCartBtn product={{ ...PRODUCT, inStock: false }} />
    )

    await user.click(screen.getByRole('button'))

    expect(cartOf(store)).toHaveLength(0)
  })
})

describe('AddToCartBtn — feedback', () => {
  /**
   * ── Fake timers, and why they are worth the setup ───────────────────────
   * The button confirms with "נוסף!" 300ms after the click and hides it 1500ms
   * later. Testing the full cycle with real time costs nearly two seconds — in
   * a suite where every other test is under fifty milliseconds.
   *
   * vi.useFakeTimers() replaces setTimeout with a controllable version, so
   * vi.advanceTimersByTime(1500) moves time forward instantly. The test
   * becomes both faster and deterministic: it no longer depends on a machine
   * being fast enough.
   *
   * The ceremony, and it took two attempts to get right: userEvent has its own
   * internal delays, so a frozen clock leaves it waiting forever and the test
   * dies with "timed out in 5000ms" — pointing at the click, not at the clock.
   *
   * `shouldAdvanceTime: true` is the fix. Real time keeps moving so userEvent's
   * own waits resolve, while the component's setTimeout calls stay under this
   * test's control via advanceTimersByTimeAsync.
   *
   * The `Async` variant matters too: the state updates it triggers are
   * asynchronous, and the synchronous version returns before React has
   * re-rendered.
   */
  it('confirms the add, then returns to normal', async () => {
    const { user } = renderWithStore(<AddToCartBtn product={PRODUCT} />)

    await user.click(screen.getByRole('button'))

  /**
   * act() wraps the advance, and this is the third piece of ceremony.
   *
   * Moving the clock fires the component's setTimeout callbacks, which
   * call setState. React has no idea that happened, so it prints the
   * "not wrapped in act(...)" warning and — more importantly — the
   * assertion can run before the re-render lands.
   *
   * act() means "I am about to cause updates; flush everything before you
   * return." userEvent does this internally, which is why none of the
   * click-driven tests above need it and this one does.
   *
   * Worth not ignoring: that warning is the single most common piece of
   * noise in React test suites, and treating it as cosmetic is how a suite
   * ends up with assertions that read stale output.
   */
    // 300ms in: the confirmation appears.
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByText('נוסף!')).toBeInTheDocument()

    // 1500ms after that: it goes away and the button offers the action again.
    await act(() => vi.advanceTimersByTimeAsync(1500))
    expect(screen.queryByText('נוסף!')).not.toBeInTheDocument()
    expect(screen.getByText('הוסף לעגלה')).toBeInTheDocument()
  })

  it('hides its label when the caller asks for an icon only', () => {
    // Used on compact product cards, where the row has no width for text.
    renderWithStore(<AddToCartBtn product={PRODUCT} showText={false} />)

    expect(screen.queryByText('הוסף לעגלה')).not.toBeInTheDocument()
    // Still reachable and still labelled, for anyone not looking at it.
    expect(screen.getByRole('button')).toHaveAttribute('title', 'הוסף לעגלה')
  })
})
