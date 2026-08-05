import { test, expect } from '@playwright/test'

/**
 * The API, driven by Playwright over a real socket.
 *
 * ── What this file is and is not ──────────────────────────────────────────
 * There are already 92 API tests in backend/tests/api, and this is not a
 * second copy of them. Those run in-process with supertest: no port, no
 * network, milliseconds each. That is the right tool for exhaustive coverage
 * and it stays the place to add the ninety-third negative case.
 *
 * This file exists for the things in-process testing cannot reach, and there
 * are three:
 *
 *   1. A real HTTP server. supertest hands the request to an Express app
 *      object; nothing binds a port, so nothing proves the server actually
 *      starts and serves. Here it does.
 *
 *   2. A real cookie jar. Playwright's request context stores Set-Cookie and
 *      replays it, exactly as a browser does. So "log in, then do something
 *      as that user" is tested the way it happens in production rather than
 *      by attaching a header by hand.
 *
 *   3. Real response headers, including the security ones helmet sets. Those
 *      are invisible to a test that never looks at a wire format.
 *
 * ── Why Playwright rather than a second Vitest project ────────────────────
 * Job postings ask for Playwright. Most people read that as "browser
 * automation", and it does that — but the `request` fixture speaks plain HTTP
 * with no browser involved, so an API suite can live in the same runner and
 * the same report as the E2E suite. Knowing that is worth saying out loud in
 * an interview, because most candidates do not.
 *
 * ── Where the server comes from ───────────────────────────────────────────
 * backend/scripts/test-server.js, started automatically by the webServer block
 * in playwright.api.config.js. It runs on port 3031 against an in-memory
 * MongoDB that vanishes when the process exits — deliberately NOT 3030, which
 * is the dev server's port and is connected to Atlas.
 */

/* Matches the fixtures seeded in backend/scripts/test-server.js. Referenced by
   sku rather than _id because ObjectIds are generated per boot, while a sku is
   stable and says what the fixture is FOR at every call site. */
const SKU = {
  plenty: 'e2e-plenty',
  lastOne: 'e2e-last-one',
  soldOut: 'e2e-sold-out',
}

const ADMIN = { username: 'e2e-admin', password: 'Passw0rd!' }
const SHOPPER = { username: 'e2e-shopper', password: 'Passw0rd!' }

const ADDRESS = {
  fullname: 'Test Recipient',
  phone: '0501234567',
  city: 'תל אביב',
  street: 'דיזנגוף 100',
}

/* Unique per call, so a test that registers an account can never collide with
   another test's account or with a previous run's leftovers. */
const uniqueUsername = prefix => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`

const bySku = (products, sku) => products.find(p => p.sku === sku)

test.describe('catalogue', () => {
  test('serves the catalogue over real HTTP @smoke', async ({ request }) => {
    const res = await request.get('/api/product')

    expect(res.status()).toBe(200)

    const products = await res.json()
    expect(bySku(products, SKU.plenty)).toBeTruthy()
    expect(bySku(products, SKU.lastOne)).toBeTruthy()
  })

  /**
   * Something a supertest run cannot see, because nothing ever becomes a real
   * response on a real socket.
   *
   * helmet sets these, and they are the kind of protection that gets silently
   * dropped by a middleware reorder — no test fails, no page looks different,
   * and the app quietly stops declaring that it should never be framed or
   * MIME-sniffed. Worth one assertion.
   */
  test('sends its security headers @regression', async ({ request }) => {
    const res = await request.get('/api/product')
    const headers = res.headers()

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(headers['strict-transport-security']).toContain('max-age=')
  })

  test('answers 404 for a product that does not exist @regression', async ({ request }) => {
    const res = await request.get('/api/product/no-such-product')

    expect(res.status()).toBe(404)
    expect((await res.json()).err).toBeTruthy()
  })
})

test.describe('authentication', () => {
  /**
   * THE test that justifies this file existing.
   *
   * Signup returns a Set-Cookie header. Playwright's request context stores it
   * and replays it on the next call, with no help from the test — precisely
   * what a browser does. So the second request proves the whole session
   * mechanism works end to end: the cookie was set with attributes a client
   * accepts, sent back to the right path, and read and verified by the server.
   *
   * A supertest test attaches the cookie by hand, which quietly assumes the
   * first two of those three. This one assumes none of them.
   */
  test('issues a session that works on the next request @smoke', async ({ request }) => {
    const username = uniqueUsername('e2e-signup')

    const signup = await request.post('/api/auth/signup', {
      data: { username, password: 'Passw0rd!', fullname: 'E2E Signup' },
    })
    expect(signup.status()).toBe(200)

    // No cookie attached by the test. If the session does not survive the
    // round trip on its own, this is a 401.
    const cart = await request.get('/api/cart')

    expect(cart.status()).toBe(200)
  })

  test('refuses a request for administrator rights @regression', async ({ request }) => {
    /**
     * Mass assignment, over the wire. Signup used to spread the request body
     * into the new user document, so this exact request created an admin.
     *
     * The Vitest version of this asserts on the database, which is stronger.
     * Here there is no database access, so it is asserted through the API
     * instead: the new account is refused the admin-only endpoint. Different
     * evidence for the same fact, and it is the evidence an outside attacker
     * would actually be able to gather.
     */
    const username = uniqueUsername('e2e-sneaky')

    const signup = await request.post('/api/auth/signup', {
      data: { username, password: 'Passw0rd!', fullname: 'Sneaky', isAdmin: true },
    })
    expect(signup.status()).toBe(200)

    const adminOnly = await request.get('/api/order/all')

    expect(adminOnly.status()).toBe(403)
  })

  /**
   * The NoSQL authentication bypass. `{"username": {"$ne": null}}` would mean
   * "any user whose username is not null" if it reached the query — matching
   * the first account in the collection and signing the attacker in as them.
   *
   * 400, not 401: the request is malformed, not merely wrong. And it is a
   * validation rejection rather than a failed login, which matters for the
   * next comment.
   */
  test('rejects a Mongo operator where a username belongs @regression', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { username: { $ne: null }, password: { $ne: null } },
    })

    expect(res.status()).toBe(400)
  })

  /**
   * ── Careful with failed logins in this file ─────────────────────────────
   * Unlike the Vitest suite, rate limiting is ON here — the server runs the
   * same configuration production does. The credential limiter allows ten
   * FAILED attempts per IP per fifteen minutes, and every test in this file
   * comes from the same address.
   *
   * That budget is not per test and it does not reset between them. One
   * genuinely-failing login is spent below; the rest of the file avoids them,
   * and anything added later should count. A suite that exhausts its own rate
   * limit fails with 429s that look like application bugs.
   */
  test('gives nothing away when the password is wrong @regression', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { username: SHOPPER.username, password: 'NotThePassword!' },
    })

    expect(res.status()).toBe(401)
    expect(res.headers()['set-cookie']).toBeUndefined()
  })
})

test.describe('authorization', () => {
  /**
   * The authorization matrix, over real HTTP: one request, three callers,
   * three different answers.
   *
   *   signed out    → 401  "I don't know who you are"
   *   normal user   → 403  "I know exactly who you are, and no"
   *   administrator → 200
   *
   * All three rows are needed. An endpoint that is completely broken — 500 for
   * everybody, or commented out — passes both refusals, so the refusals alone
   * prove nothing. Only the third row proves the endpoint still works, and
   * only the first two prove it works for the right people.
   *
   * Each test gets its own `request` fixture and therefore its own empty
   * cookie jar, so identities cannot leak between them.
   */
  const NEW_PRODUCT = { name: 'Sneaky Product', price: 1 }

  test('refuses an anonymous product creation @smoke', async ({ request }) => {
    const res = await request.post('/api/product', { data: NEW_PRODUCT })

    expect(res.status()).toBe(401)
  })

  test('refuses a normal shopper @smoke', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: SHOPPER })
    expect(login.status()).toBe(200)

    const res = await request.post('/api/product', { data: NEW_PRODUCT })

    expect(res.status()).toBe(403)
  })

  test('allows an administrator @regression', async ({ request }) => {
    const login = await request.post('/api/auth/login', { data: ADMIN })
    expect(login.status()).toBe(200)

    const name = `Admin Product ${Date.now()}`
    const res = await request.post('/api/product', { data: { ...NEW_PRODUCT, name, price: 99 } })

    expect(res.status()).toBe(200)

    // Verified by reading it back rather than by trusting the response body —
    // and in this case that distinction is the whole point. See BUG-004 below:
    // the response cannot be trusted to identify what it just created, but the
    // product really is in the catalogue.
    const catalogue = await (await request.get('/api/product')).json()
    expect(catalogue.find(p => p.name === name)).toBeTruthy()
  })

  /**
   * 🐛 KNOWN BUG (BUG-004): a creation endpoint that will not tell you what it
   * created.
   *
   * productService.add() builds a NEW object to insert:
   *
   *     await collection.insertOne({ ...product, searchText, createdAt })
   *     return product
   *
   * The MongoDB driver assigns the generated _id by mutating the object it was
   * handed — which is the spread copy, not `product`. So the copy in the
   * database has an _id and the object returned to the client never does.
   *
   * Why it matters: an admin UI that creates a product cannot then open it,
   * edit it or link to it, because updateProduct is keyed on _id and the
   * client was never told one. The workaround is to re-fetch the whole
   * catalogue and search for it by name — which is what the test above has to
   * do, and which breaks outright the moment two products share a name.
   *
   * The fix is one line: return the object that was inserted.
   *
   * `test.fail()` is Playwright's expected-failure marker. The test runs, it
   * fails, and that is reported as a pass — so the gap is visible in the suite
   * rather than hidden behind a skip. When the bug is fixed this test starts
   * passing and Playwright reports "expected to fail but passed", which is the
   * signal to delete this line.
   *
   * (Vitest spells the same idea `it.fails()`. Two runners in one repo, two
   * dialects — this is the second time that has cost time here.)
   */
  test('🐛 BUG-004: returns the id of the product it created @regression', async ({ request }) => {
    test.fail(true, 'BUG-004: productService.add returns the pre-insert object, which has no _id')

    await request.post('/api/auth/login', { data: ADMIN })

    const res = await request.post('/api/product', {
      data: { ...NEW_PRODUCT, name: `Admin Product ${Date.now()}`, price: 99 },
    })

    expect((await res.json())._id).toBeTruthy()
  })
})

test.describe('a complete purchase', () => {
  /**
   * One test, five steps, one session — the journey a real shopper takes.
   *
   * Written as a single test rather than five, because every step depends on
   * the one before it. Split across separate tests they would need shared
   * state to pass the session and the cart along, and shared state between
   * tests is what makes a suite order-dependent — the exact trap the backend
   * rate-limit tests fell into.
   *
   * `test.step()` gives the readability back. Each step is named in the report
   * and timed separately, so a failure says "checkout" rather than "line 240"
   * — which is most of what splitting into separate tests would have bought.
   *
   * The account is created fresh with a unique name, so this test can run any
   * number of times against the same server without tripping over its own
   * previous cart.
   */
  test('signs up, fills a cart, checks out and sees the order @smoke', async ({ request }) => {
    const username = uniqueUsername('e2e-buyer')
    let productId

    await test.step('register and get a session', async () => {
      const res = await request.post('/api/auth/signup', {
        data: { username, password: 'Passw0rd!', fullname: 'E2E Buyer' },
      })

      expect(res.status()).toBe(200)
      expect((await res.json()).username).toBe(username)
    })

    await test.step('find the product to buy', async () => {
      const res = await request.get('/api/product')
      const product = bySku(await res.json(), SKU.plenty)

      expect(product, `fixture ${SKU.plenty} should be seeded`).toBeTruthy()
      productId = product._id
    })

    await test.step('add it to the cart', async () => {
      const res = await request.post('/api/cart/item', {
        data: { productId, quantity: 1 },
      })

      expect(res.status()).toBe(200)

      /**
       * ₪120 of goods, under the ₪300 threshold, so ₪29 delivery → ₪149.
       *
       * These are the same numbers the frontend's getCartTotals tests pin, and
       * that is the point: the two implementations of one pricing rule are
       * asserted against identical figures, so a change to either side turns
       * something red.
       */
      const { totals } = await res.json()
      expect(totals.subtotal).toBe(120)
      expect(totals.shipping).toBe(29)
      expect(totals.total).toBe(149)
    })

    await test.step('check out', async () => {
      const res = await request.post('/api/order', {
        data: { shippingAddress: ADDRESS },
      })

      // 201 Created, not 200. The request made a new resource, and the status
      // code is part of the API's contract with anyone building against it.
      expect(res.status()).toBe(201)

      const order = await res.json()
      expect(order.totals.total).toBe(149)
      expect(order.items).toHaveLength(1)

      /**
       * The price snapshot. The order line records what was actually charged
       * — ₪120 — rather than pointing at the catalogue.
       *
       * Cart and order are opposites in this respect and it is worth keeping
       * straight: a cart RE-PRICES from the catalogue on every read, so a sale
       * applies to what is already in it. An order is FROZEN, so changing the
       * price next week does not rewrite what someone paid last week.
       */
      expect(order.items[0].unitPrice).toBe(120)
      expect(order.status).toBe('paid')
    })

    await test.step('the cart is empty and the order is listed', async () => {
      const { items } = await (await request.get('/api/cart')).json()
      expect(items).toHaveLength(0)

      const orders = await (await request.get('/api/order')).json()
      expect(orders).toHaveLength(1)
      expect(orders[0].totals.total).toBe(149)
    })
  })

  /**
   * A shopper may only read their own orders.
   *
   * IDOR — insecure direct object reference — is asking for a real id that
   * belongs to someone else, and it is behind a large share of real data
   * breaches because it needs no tooling at all: change a number in a URL.
   *
   * Two separate request contexts, so the two shoppers genuinely have separate
   * sessions rather than a shared one with a swapped header.
   */
  test('will not show one shopper another shopper\'s order @regression', async ({ playwright }) => {
    const alice = await playwright.request.newContext({ baseURL: 'http://localhost:3031' })
    const bob = await playwright.request.newContext({ baseURL: 'http://localhost:3031' })

    try {
      await alice.post('/api/auth/signup', {
        data: { username: uniqueUsername('e2e-alice'), password: 'Passw0rd!', fullname: 'Alice' },
      })
      await bob.post('/api/auth/signup', {
        data: { username: uniqueUsername('e2e-bob'), password: 'Passw0rd!', fullname: 'Bob' },
      })

      const products = await (await alice.get('/api/product')).json()
      const productId = bySku(products, SKU.plenty)._id

      await alice.post('/api/cart/item', { data: { productId, quantity: 1 } })
      const order = await (
        await alice.post('/api/order', { data: { shippingAddress: ADDRESS } })
      ).json()

      // A real order id, a real session — just the wrong owner.
      const res = await bob.get(`/api/order/${order._id}`)

      expect(res.status()).toBe(403)
    } finally {
      // Contexts created by hand are not cleaned up by the runner, and a
      // leaked one keeps a socket open past the end of the run.
      await alice.dispose()
      await bob.dispose()
    }
  })
})
