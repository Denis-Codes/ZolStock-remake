import { test, expect } from '@playwright/test'

import { AuthPage, uniqueUsername } from '../pages/auth.page'
import { CartPage } from '../pages/cart.page'
import { ProductDetailsPage } from '../pages/product-details.page'

/**
 * The signed-in shopper, end to end: real bundle, real server, real database.
 *
 * ── What only this layer can prove ────────────────────────────────────────
 * Every test below asserts something that is true only when the whole chain
 * works. None of them can be written against the local-mode suite, because in
 * local mode there is no server to have a session with and no database for a
 * cart to live in.
 *
 * The most valuable one is the cart test. A cart that survives a reload proves
 * almost nothing on its own — localStorage would do that. A cart that survives
 * having localStorage DELETED can only have come from the server, and that is
 * the actual product requirement: sign in on your phone, see the cart you
 * filled on your laptop.
 *
 * ── The fixtures ──────────────────────────────────────────────────────────
 * Seeded by backend/scripts/test-server.js. Referenced by sku because
 * ObjectIds are regenerated on every boot while a sku is stable, and because
 * `e2e-last-one` says what the fixture is FOR at the call site.
 */
const PRODUCT = {
  plenty: { sku: 'e2e-plenty', nameHe: 'סיר בדיקה', price: 120 },
  lastOne: { sku: 'e2e-last-one', nameHe: 'מגבת בדיקה', price: 80 },
}

test.describe('a signed-in shopper', () => {
  test('stays signed in across a full page reload @smoke', async ({ page }) => {
    /**
     * A page reload throws away every scrap of in-memory state: the Redux
     * store, React's tree, module-level variables. What remains is the
     * httpOnly session cookie, which JavaScript cannot even read.
     *
     * So if the app still knows who you are afterwards, it is because the
     * cookie went back to the server and the server verified it. That is the
     * entire authentication mechanism proved in one navigation, and it is a
     * genuinely common thing to get wrong — a cookie set with the wrong
     * SameSite or Path works perfectly in Postman and silently fails in a
     * browser.
     */
    const auth = new AuthPage(page)

    await auth.signup(uniqueUsername('reload'))

    await page.reload()

    /**
     * Asked of the server, through the browser's own cookie jar.
     *
     * /api/cart requires authentication, so a 200 here means the cookie was
     * sent, accepted and verified after everything in memory was discarded.
     * A 401 would mean the session did not survive.
     */
    const session = await page.request.get('/api/cart')
    expect(session.status()).toBe(200)

    // And the app itself still renders rather than bouncing to /login.
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByRole('heading', { name: 'העגלה ריקה' })).toBeVisible()
  })

  test('keeps the cart on the server, not in the browser @smoke', async ({ page }) => {
    const auth = new AuthPage(page)
    const pdp = new ProductDetailsPage(page)
    const cart = new CartPage(page)

    await auth.signup(uniqueUsername('cart'))

    await pdp.goto(PRODUCT.plenty.sku)
    await expect(pdp.title).toBeVisible()
    await pdp.addToCart()

    await cart.goto()
    await expect(cart.item(PRODUCT.plenty.nameHe)).toBeVisible()

    /**
     * THE assertion.
     *
     * Delete the GUEST cart — localStorage — and reload. A cart that still has
     * the item cannot have read it from there, because there is nothing left
     * to read. The only remaining source is the server.
     *
     * Without this step the test would pass just as happily against a purely
     * local cart, and would prove nothing about the feature it claims to
     * cover.
     *
     * Only localStorage is cleared, because only localStorage holds a cart.
     * sessionStorage caches who is signed in for the first paint, and since
     * the BUG-005 fix that cache is no longer load-bearing — the app asks the
     * server on start regardless, so clearing it here would change nothing.
     * The test below is the one that proves that.
     */
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await expect(cart.item(PRODUCT.plenty.nameHe)).toBeVisible()
  })

  /**
   * The session follows you into a new tab. Regression test for BUG-005.
   *
   * The server-side session is an httpOnly cookie, shared across every tab of
   * a browser profile. The CLIENT's record of who is signed in used to live in
   * sessionStorage, which is scoped PER TAB — so "open link in new tab" (middle
   * click, ctrl+click, a link from WhatsApp) produced a tab where the server
   * still knew exactly who you were and the app had decided you were a guest.
   *
   * The visible symptom was the cart: cart.actions.js checks isLoggedIn() to
   * pick between the server cart and the localStorage one, so the new tab
   * showed an empty guest cart while the real cart sat on the server. The
   * shopper watched their cart vanish, and it came back if they returned to
   * the original tab.
   *
   * The fix makes the server the source of truth: `restoreSession()` asks
   * `GET /api/auth/me` at app start and is awaited before the cart and
   * wishlist load, since both branch on who is signed in. sessionStorage is
   * kept only as a first-paint cache.
   *
   * This test is the guard on that. It fails again the moment login state is
   * read from per-tab storage without asking the server first — which is why
   * it deliberately does NOT clear sessionStorage: a new tab starting empty is
   * precisely the condition being tested.
   */
  test('keeps the shopper signed in when a link opens in a new tab @regression', async ({
    page,
  }) => {
    const auth = new AuthPage(page)
    const pdp = new ProductDetailsPage(page)

    await auth.signup(uniqueUsername('newtab'))

    await pdp.goto(PRODUCT.plenty.sku)
    await pdp.addToCart()

    // A second tab in the SAME browser context: same profile, same cookies —
    // exactly what opening a link in a new tab does. Only sessionStorage is
    // not carried over.
    const newTab = await page.context().newPage()
    try {
      await newTab.goto('/cart')

      await expect(new CartPage(newTab).item(PRODUCT.plenty.nameHe)).toBeVisible()
    } finally {
      await newTab.close()
    }
  })
})

test.describe('the deployed bundle itself', () => {
  /**
   * A deep link, loaded cold.
   *
   * Navigating to /product/x from inside the app is handled by react-router in
   * the browser and never touches the server. Typing that URL in — or opening
   * a link someone shared, or hitting refresh — asks the SERVER for
   * /product/x, which is not a file on disk.
   *
   * The server has to answer with index.html so the SPA can boot and route
   * itself. When that catch-all is missing or mis-ordered, every shared
   * product link 404s and refresh breaks the site, while the app feels
   * completely fine to whoever is clicking around inside it.
   *
   * This is a server configuration bug that only a full-stack browser test can
   * see, and it is impossible to hit in the local-mode suite, where the Vite
   * dev server handles the fallback itself.
   */
  test('serves a deep link on a cold load @smoke', async ({ page }) => {
    const res = await page.goto(`/product/${PRODUCT.plenty.sku}`)

    expect(res.status()).toBe(200)
    await expect(new ProductDetailsPage(page).title).toBeVisible()
  })

  /**
   * The counterpart, and the reason the assertion above is not enough on its
   * own: a catch-all that returns index.html for EVERYTHING would satisfy it
   * while quietly breaking error handling.
   *
   * An unknown /api path must answer JSON, not the SPA shell — otherwise the
   * client parses HTML as JSON and reports a syntax error instead of a 404,
   * which is a genuinely miserable thing to debug from a bug report.
   */
  test('404s an unknown API path as JSON, not as the app shell @regression', async ({ request }) => {
    const res = await request.get('/api/no-such-endpoint')

    expect(res.status()).toBe(404)
    expect(res.headers()['content-type']).toContain('application/json')
  })

  /**
   * Built assets load and are not silently replaced by the SPA shell.
   *
   * The failure this catches is specific and was already hit once in this
   * codebase: when static serving is mounted after the catch-all, a request
   * for a missing image returns index.html with a 200 and Content-Type
   * text/html. The browser then reports an image *decode* failure, which sends
   * you looking at the image file instead of at the routing.
   */
  test('serves built assets with their real content type @regression', async ({ page, request }) => {
    await page.goto('/')

    const scriptSrc = await page
      .locator('script[src*="/assets/"]')
      .first()
      .getAttribute('src')

    expect(scriptSrc, 'the built page should load a hashed bundle from /assets').toBeTruthy()

    const res = await request.get(scriptSrc)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('javascript')
  })
})

test.describe('the last unit', () => {
  /**
   * A product with stockQty 1, bought through the UI, then looked at again.
   *
   * The backend tests already prove the atomic decrement under concurrency —
   * two shoppers, one unit, exactly one 201 and one 409. That is the hard
   * part and it does not need a browser.
   *
   * What this adds is the other half: that the storefront actually TELLS the
   * next shopper. A perfect backend guard is worth very little if the product
   * page still shows an enabled "add to cart" button, because the shopper only
   * discovers the truth at checkout.
   *
   * Kept last in the file, because it consumes the fixture: `e2e-last-one` has
   * exactly one unit and there is no second run of this within a session.
   */
  test('is sold out on the storefront once bought @regression', async ({ page }) => {
    const auth = new AuthPage(page)
    const pdp = new ProductDetailsPage(page)
    const cart = new CartPage(page)

    await auth.signup(uniqueUsername('laststock'))

    await pdp.goto(PRODUCT.lastOne.sku)
    await expect(pdp.title).toBeVisible()
    await pdp.addToCart()

    await cart.goto()
    await expect(cart.item(PRODUCT.lastOne.nameHe)).toBeVisible()

    // Checkout happens through the API rather than the UI: this test is about
    // what the storefront shows AFTER stock runs out, and driving a whole
    // address form to get there would make it a test of the checkout form too.
    // One test, one reason to fail.
    const checkout = await page.request.post('/api/order', {
      data: {
        shippingAddress: {
          fullname: 'E2E Recipient',
          phone: '0501234567',
          city: 'תל אביב',
          street: 'דיזנגוף 100',
        },
      },
    })
    expect(checkout.status()).toBe(201)

    /**
     * Now a second shopper looks at the same product. The stock is gone, and
     * the page must say so.
     *
     * A fresh context rather than the same page, so this genuinely is someone
     * else — no session, no cart, nothing cached.
     */
    const other = await page.context().browser().newContext()
    try {
      const otherPage = await other.newPage()
      await otherPage.goto(`http://localhost:3031/product/${PRODUCT.lastOne.sku}`)

      await expect(otherPage.getByText('אזל מהמלאי').first()).toBeVisible()
    } finally {
      await other.close()
    }
  })
})
