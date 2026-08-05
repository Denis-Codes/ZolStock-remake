import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedProducts, seedUsers, countDocuments, findProduct } from '../helpers/db.js'
import { makeProduct, makeUser, makeAdmin } from '../helpers/factories.js'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * API TESTS — start here
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHAT THESE ARE
 * A unit test calls one function directly. An API test sends a real HTTP
 * request to the real server and checks the real response. Everything in
 * between runs for real: routing, middleware, validation, the service, and
 * MongoDB.
 *
 * So this is the first layer that can catch "each piece works, but they are
 * wired together wrong" — which is where most real bugs actually live.
 *
 * THE THREE TOOLS, IN ONE LINE EACH
 *   supertest    sends the HTTP request. No port is opened; it talks to the
 *                app object directly, so tests can run in parallel.
 *   createApp()  builds the Express app without starting a server.
 *   seedProducts puts rows straight into the database, skipping the API.
 *
 * THE SHAPE EVERY TEST HAS  (learn this, it never changes)
 *
 *   ARRANGE   put the world into a known state
 *   ACT       make one request
 *   ASSERT    check the response, and sometimes the database too
 *
 * WHY SEED THE DATABASE DIRECTLY INSTEAD OF USING THE API
 * If a checkout test built its cart by calling the cart endpoint, then a bug
 * in the cart endpoint would turn the checkout test red too. You want ONE red
 * test per bug, pointing at the thing that broke. So: arrange with the
 * database, act through the API.
 *
 * WHAT GETS CLEANED UP FOR YOU
 * Every document is deleted after each test (tests/setup.js). You never have
 * to clean up, and no test can see another test's data — so tests can be
 * written in any order and still pass.
 */

// Built once for the whole file. Rate limiting is off because the limiter
// counts requests in memory and would start rejecting later tests in the run.
const app = createApp({ enableRateLimit: false })

/* ═══════════════════════════════════════════════════════════════════════
   WORKED EXAMPLES — read these four, then write the ones below
   ═══════════════════════════════════════════════════════════════════════ */

describe('GET /api/product', () => {
  it('returns the products in the catalogue', async () => {
    // ARRANGE — two products exist. The factory fills in every other field
    // with something valid, so the test only states what it cares about.
    await seedProducts(makeProduct({ name: 'Frying Pan' }), makeProduct({ name: 'Bath Towel' }))

    // ACT — one request. `await` because it is a network call.
    const res = await request(app).get('/api/product')

    // ASSERT — status first: if this is 500, everything below is noise.
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)

    // Check the names are present, not that they are in a specific order.
    // Nothing in the request asked for an order, so asserting one would make
    // the test fail on a change that broke nothing.
    expect(res.body.map(p => p.name).sort()).toEqual(['Bath Towel', 'Frying Pan'])
  })

  it('returns an empty list when the catalogue is empty', async () => {
    // Nothing seeded. Worth its own test: the difference between "no products"
    // and "the endpoint crashed" must be visible to the storefront, and an
    // empty array is a very different thing from a 500.
    const res = await request(app).get('/api/product')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('filters by search text', async () => {
    // ARRANGE — one product that should match, one that should not.
    //
    // Always seed a NON-matching row as well. With only matching data, a
    // filter that is completely ignored still returns the right answer, and
    // the test passes while the feature is broken.
    await seedProducts(
      makeProduct({ name: 'Frying Pan', searchText: 'frying pan' }),
      makeProduct({ name: 'Bath Towel', searchText: 'bath towel' })
    )

    // ACT — `.query()` builds the ?txt=frying part of the URL.
    const res = await request(app).get('/api/product').query({ txt: 'frying' })

    // ASSERT — one row back, and it is the right one.
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Frying Pan')
  })
})

describe('GET /api/product/:id', () => {
  it('finds a product by either of its two ids', async () => {
    // This endpoint accepts an ObjectId ("507f1f...") or a legacy sku
    // ("p1001"), because both are still in use out in the wild. Two ways in
    // means two tests — the second path is exactly the kind of thing that
    // breaks silently, because nobody on the team uses it day to day.
    const [product] = await seedProducts(makeProduct({ sku: 'p9001' }))

    const byId = await request(app).get(`/api/product/${product._id}`)
    const bySku = await request(app).get('/api/product/p9001')

    expect(byId.status).toBe(200)
    expect(bySku.status).toBe(200)
    expect(byId.body.sku).toBe('p9001')
    expect(bySku.body._id).toBe(String(product._id))
  })

  it('returns 404 with a JSON error for a product that does not exist', async () => {
    const res = await request(app).get('/api/product/p0000')

    // Two assertions, both load-bearing:
    //   the status, because the frontend branches on it
    //   the body shape, because the frontend reads `err` to show a message.
    // A 404 that returns an HTML error page would break the page even though
    // the status is technically right.
    expect(res.status).toBe(404)
    expect(res.body.err).toBeTruthy()
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   YOUR TURN
   ═══════════════════════════════════════════════════════════════════════

   Each of these is written as `it.todo`, which means Vitest lists it as
   unfinished but does not fail. Run `npm run test:watch` and you will see
   them sitting there.

   To do one: delete `.todo`, add `async () => { ... }` as a second argument,
   and write it. Copy the shape of the four examples above.

   Do them in order — they get harder. Two or three is a good session.
   ═══════════════════════════════════════════════════════════════════════ */

describe('YOUR TURN — filtering', () => {
  // Seed one product in 'housewares' and one in 'textiles', request
  // ?category=housewares, expect only the first one back.
  it('filters by category', async () => {
    await seedProducts(
      makeProduct({ category: 'housewares' }),
      makeProduct({ category: 'textiles' }))

    const res = await request(app).get('/api/product').query({ category: 'housewares' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].category).toBe('housewares')
  })

  // Seed products at 50, 100 and 200. Request ?minPrice=100&maxPrice=200.
  // Think about which ones should come back BEFORE you run it — the answer
  // depends on whether the ends are inclusive. Check product.service.js.
  it('filters by price range', async () => {
    await seedProducts(
      makeProduct({ price: 50 }),
      makeProduct({ price: 100 }),
      makeProduct({ price: 200 })
    )
    const res = await request(app).get('/api/product').query({ minPrice: 100, maxPrice: 200 })
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body.map(p => p.price).sort((a, b) => a - b)).toEqual([100, 200])

  })

  // Seed one product with inStock: true and one with inStock: false.
  // Request ?inStock=false and expect only the out-of-stock one.
  //
  // This is the one that was broken in real life. If your test passes on the
  // first run, prove it works: temporarily change the seeded data so the
  // wrong answer would look right, and confirm the test goes red.
  it('filters by stock status', async () => {
    await seedProducts(
      makeProduct({inStock: true}),
      makeProduct({inStock: false})
    )
    const res = await request(app).get('/api/product').query({inStock: false})
    expect(res.status).toBe(200)
    expect(res.body[0].inStock).toBe(false)
  })
})

describe('sorting', () => {
  // Seeded deliberately out of order, so a passing test cannot be explained by
  // the products simply coming back the way they went in.
  const seedThreePrices = () =>
    seedProducts(makeProduct({ price: 300 }), makeProduct({ price: 100 }), makeProduct({ price: 200 }))

  it('sorts by price ascending', async () => {
    await seedThreePrices()

    const res = await request(app).get('/api/product').query({ sortField: 'price', sortDir: 1 })

    expect(res.status).toBe(200)
    // Here the order IS what was asked for, so asserting it exactly is right —
    // the opposite of the price-range test, where order was never requested.
    expect(res.body.map(p => p.price)).toEqual([100, 200, 300])
  })

  it('sorts by price descending', async () => {
    await seedThreePrices()

    const res = await request(app).get('/api/product').query({ sortField: 'price', sortDir: -1 })

    expect(res.status).toBe(200)
    expect(res.body.map(p => p.price)).toEqual([300, 200, 100])
  })

  it('ignores a sort field that is not on the allowed list', async () => {
    /**
     * Only nine fields may be sorted on. Anything else is dropped rather than
     * rejected — a junk sort parameter should give a sensible page, not a 400.
     *
     * Why it matters: sort order leaks information about values you cannot
     * read. Sorting a public product list by an internal field would tell you
     * which documents have it and roughly how they compare, without that field
     * ever appearing in a response.
     *
     * BE HONEST ABOUT WHAT THIS PROVES. It shows the request succeeds and
     * returns everything. It does NOT prove no sorting happened — no product
     * has a `password` field, so sorting by one would be a no-op anyway.
     *
     * The precise half is covered a layer down, where _buildSort is called
     * directly and asserted to return {} (tests/unit/product-query.test.js).
     * Two tests, two different jobs: the unit test proves the rule, this one
     * proves the rule is actually wired into the live endpoint.
     */
    await seedThreePrices()

    const res = await request(app).get('/api/product').query({ sortField: 'password' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
  })
})

describe('bad input does not crash the server', () => {
  it('survives a search containing a regex character', async () => {
    // A shopper typing "(" into the search box. That character is special in a
    // regular expression, and unescaped it makes the pattern invalid — the
    // query throws inside the driver and the endpoint 500s. A keystroke should
    // not be able to do that.
    await seedProducts(makeProduct())

    const res = await request(app).get('/api/product').query({ txt: '(' })

    expect(res.status).toBe(200)
  })

  it('treats a regex character as literal text, not as a pattern', async () => {
    /**
     * The stronger version of the test above.
     *
     * Not crashing could also be achieved by throwing the search term away
     * entirely — which would pass the previous test while silently breaking
     * search. This one proves the bracket was escaped and then matched as an
     * ordinary character: the product whose text contains "(3 pack)" comes
     * back, and the one without it does not.
     */
    await seedProducts(
      makeProduct({ name: 'Bowl set', searchText: 'bowl set (3 pack)' }),
      makeProduct({ name: 'Single bowl', searchText: 'single bowl' })
    )

    const res = await request(app).get('/api/product').query({ txt: '(3 pack)' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Bowl set')
  })

  it('survives the classic catastrophic-backtracking payload', async () => {
    // "(a+)+$" against a long non-matching string is the textbook denial of
    // service: an unescaped regex engine tries exponentially many ways to
    // split the a's and pins the process. Escaped, it is six literal
    // characters and matches nothing. The 20s Vitest timeout is the real
    // assertion here — a hang fails the test.
    await seedProducts(makeProduct({ searchText: 'a'.repeat(500) }))

    const res = await request(app).get('/api/product').query({ txt: '(a+)+$' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('ignores a non-numeric price filter rather than erroring', async () => {
    /**
     * `?minPrice=abc` cannot be a number, so toNumber() returns null and the
     * price clause is never added — the request behaves as if no price filter
     * was sent at all.
     *
     * That is a design decision, not an accident, and it is worth knowing
     * which way it went: the alternative is a 400. Silently ignoring junk is
     * the friendlier choice for a public listing page, where a malformed URL
     * should still render a shop rather than an error.
     */
    await seedProducts(makeProduct({ price: 50 }), makeProduct({ price: 500 }))

    const res = await request(app).get('/api/product').query({ minPrice: 'abc' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /api/product — who is allowed to do what', () => {
  /**
   * An AUTHORIZATION MATRIX: the same request sent by each kind of caller,
   * with the expected answer for each. Write these three together, always, and
   * never write only the refusals.
   *
   *   caller           expected
   *   ─────────────────────────
   *   signed out       401
   *   normal user      403
   *   admin            200
   *
   * A completely broken endpoint refuses everybody, and would pass both
   * negative tests. Only the positive case proves the rule is a rule rather
   * than a wall.
   */
  const NEW_PRODUCT = { name: 'Sneaky Product', price: 1 }

  it('refuses to create a product when signed out', async () => {
    const res = await request(app).post('/api/product').send(NEW_PRODUCT)

    expect(res.status).toBe(401)

    // The second half, and the half people skip. A 401 response that created
    // the row anyway is a real failure mode — the status alone would never
    // show it. Check the response AND the state it was supposed to protect.
    expect(await countDocuments('products')).toBe(0)
  })

  it('refuses to create a product for a signed-in non-admin', async () => {
    /**
     * 403, not 401 — the distinction matters and is very commonly got wrong.
     *
     *   401 Unauthorized  "I do not know who you are."     → sign in
     *   403 Forbidden     "I know who you are. No."        → signing in again
     *                                                        will not help
     *
     * Returning 401 here would send the frontend to the login page for a user
     * who is already logged in: an infinite loop the shopper cannot escape.
     */
    const [user] = await seedUsers(makeUser())

    const res = await request(app)
      .post('/api/product')
      .set('Cookie', cookieFor(user))
      .send(NEW_PRODUCT)

    expect(res.status).toBe(403)
    expect(await countDocuments('products')).toBe(0)
  })

  it('lets an admin create a product', async () => {
    const [admin] = await seedUsers(makeAdmin())

    const res = await request(app)
      .post('/api/product')
      .set('Cookie', cookieFor(admin))
      .send(NEW_PRODUCT)

    expect(res.status).toBe(200)

    // Assert on the database, not just the response body. The endpoint could
    // echo back what it was sent and never write anything — the response would
    // look perfect. Only a read proves the product actually exists.
    const saved = await findProduct({ name: 'Sneaky Product' })
    expect(saved).not.toBeNull()
    expect(saved.owner._id).toBe(String(admin._id))
  })
})
