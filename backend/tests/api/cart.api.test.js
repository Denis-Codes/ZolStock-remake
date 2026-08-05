import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedProducts, seedUsers, seedCart, findCart } from '../helpers/db.js'
import { makeProduct, makeUser, makeCart, makeCartItem } from '../helpers/factories.js'

/**
 * The cart.
 *
 * One rule dominates every test here: A CART STORES REFERENCES AND QUANTITIES,
 * NEVER PRICES. Prices are looked up from the catalogue on every read and again
 * at checkout.
 *
 * That is not tidiness — it is the difference between a shop and a donation
 * box. If the client could send a price, a shopper could post a cart line at
 * ₪0.01 and check out at it. So several tests below exist purely to prove the
 * server ignores anything money-shaped that arrives from outside.
 */
const app = createApp({ enableRateLimit: false })

/** Signs a request as the given user. Keeps every test one line shorter. */
const as = (user, req) => req.set('Cookie', cookieFor(user))

describe('cart requires a signed-in user', () => {
  /**
   * Every cart route sits behind requireAuth, and there is no :userId anywhere
   * in the paths — a cart is always "mine", so one shopper cannot even address
   * another's. Both facts are worth a test.
   *
   * Table-driven: the same expectation across every route. Adding a route to
   * the array is cheaper than writing a seventh near-identical test, and a new
   * route left off the list is visible at a glance.
   */
  it.each([
    ['get', '/api/cart'],
    ['post', '/api/cart/item'],
    ['put', '/api/cart/item/abc'],
    ['delete', '/api/cart/item/abc'],
    ['delete', '/api/cart'],
    ['post', '/api/cart/merge'],
  ])('%s %s is refused when signed out', async (method, path) => {
    const res = await request(app)[method](path).send({})

    expect(res.status).toBe(401)
  })
})

describe('GET /api/cart', () => {
  it('returns an empty cart with usable totals for a new shopper', async () => {
    /**
     * A shopper who has never added anything still loads the cart page. The
     * response must be a complete, renderable cart — not null, not a 404.
     *
     * Note freeShippingThreshold and amountToFreeShipping are present even
     * when empty: the page shows "add ₪300 more for free delivery" from these,
     * so a missing field is a broken banner rather than a broken cart.
     */
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).get('/api/cart'))

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
    expect(res.body.totals).toMatchObject({
      itemCount: 0,
      subtotal: 0,
      shipping: 0,
      total: 0,
      freeShippingThreshold: 300,
      amountToFreeShipping: 300,
      currency: 'ILS',
    })
  })

  it('prices lines from the catalogue, not from the stored cart', async () => {
    /**
     * The core guarantee, tested by changing the world underneath the cart.
     *
     * The stored line holds only a product id and a quantity. So a product
     * that goes on sale after it was added must be priced at the SALE price
     * when the cart is read — the shopper sees today's price, not the price on
     * the day they added it.
     *
     * This also proves the negative: nothing about the price was cached on the
     * line, because there was nowhere to cache it.
     */
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(
      makeProduct({ price: 200, salePrice: 150, originalPrice: 200 })
    )
    await seedCart(makeCart(user._id, [makeCartItem(product._id, { quantity: 2 })]))

    const res = await as(user, request(app).get('/api/cart'))

    expect(res.status).toBe(200)
    expect(res.body.items[0].unitPrice).toBe(150)
    expect(res.body.items[0].lineTotal).toBe(300)
    expect(res.body.totals.subtotal).toBe(300)
    // originalPrice 200 vs sale 150, twice over.
    expect(res.body.totals.savings).toBe(100)
  })

  it('drops lines whose product has been removed from the catalogue', async () => {
    // A retired product must not make the whole cart unopenable. The line
    // silently disappears rather than erroring — one discontinued item should
    // not cost the shopper the other five.
    const [user] = await seedUsers(makeUser())
    const [live] = await seedProducts(makeProduct())
    await seedCart(
      makeCart(user._id, [makeCartItem(live._id), makeCartItem('p-does-not-exist')])
    )

    const res = await as(user, request(app).get('/api/cart'))

    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
  })

  it('flags a line that exceeds available stock instead of silently fixing it', async () => {
    // The cart page needs to TELL the shopper why a quantity cannot be
    // fulfilled. Quietly reducing 5 to 2 would be a worse experience than
    // saying so, and would look like a bug to the shopper.
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 2 }))
    await seedCart(makeCart(user._id, [makeCartItem(product._id, { quantity: 5 })]))

    const res = await as(user, request(app).get('/api/cart'))

    expect(res.body.items[0].exceedsStock).toBe(true)
    expect(res.body.items[0].quantity).toBe(5)
  })

  it("never shows one shopper another shopper's cart", async () => {
    // There is no :userId in the route, so this cannot be done by URL — but
    // the service still has to scope its query by the signed-in user, and a
    // missing filter there would expose everyone's cart to everyone.
    const [alice, bob] = await seedUsers(makeUser(), makeUser())
    const [product] = await seedProducts(makeProduct())
    await seedCart(makeCart(alice._id, [makeCartItem(product._id, { quantity: 3 })]))

    const res = await as(bob, request(app).get('/api/cart'))

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })
})

describe('POST /api/cart/item', () => {
  it('adds a product to the cart', async () => {
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ price: 120 }))

    const res = await as(
      user,
      request(app).post('/api/cart/item').send({ productId: String(product._id), quantity: 2 })
    )

    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.totals.subtotal).toBe(240)
  })

  it('ignores a price sent by the client', async () => {
    /**
     * The attack this whole design exists to stop: post your own price, check
     * out at it.
     *
     * Two defences, both proven here. The schema declares no price field, so
     * it is stripped before any handler sees it — and the stored line has
     * nowhere to put one, because it only ever holds a reference. The subtotal
     * comes back as the catalogue's ₪120, not the ₪0.01 that was sent.
     */
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ price: 120 }))

    const res = await as(
      user,
      request(app).post('/api/cart/item').send({
        productId: String(product._id),
        quantity: 1,
        price: 0.01,
        salePrice: 0.01,
        lineTotal: 0.01,
      })
    )

    expect(res.status).toBe(200)
    expect(res.body.totals.subtotal).toBe(120)

    // And check the stored document too — a response that looks right while
    // the database holds the injected value would be the dangerous outcome.
    const stored = await findCart(user._id)
    expect(stored.items[0]).not.toHaveProperty('price')
  })

  it('merges a repeat add into one line rather than creating two', async () => {
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 10 }))
    const add = qty =>
      as(user, request(app).post('/api/cart/item').send({ productId: String(product._id), quantity: qty }))

    await add(2)
    const res = await add(3)

    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].quantity).toBe(5)
  })

  it('merges a product added by sku and by ObjectId into one line', async () => {
    /**
     * Was BUG-003. This is the test the unit suite could not write.
     *
     * `byIdOrSku` deliberately accepts two names for one product: the ObjectId
     * hex string that new URLs carry, and the legacy `sku` that guest carts
     * saved before the migration carry — folded in by POST /api/cart/merge at
     * sign-in. Both find the same document.
     *
     * The line key used to be built from the raw id the client sent, BEFORE
     * that resolution, so one product arriving under its two valid names
     * landed on two rows. `addItem` now keys off `product._id`.
     *
     * ── Why this could only be proved here ────────────────────────────────
     * The original pin lived in tests/unit/cart-pricing.test.js and asserted
     * that `_variantKey` returns the same key for both ids. It cannot — it is
     * a pure function with no database, so it has no way to know the two
     * strings name one product. Only a layer with the lookup can. That test
     * failed permanently for a reason unrelated to the bug; this one flips.
     *
     * The assertion is `toHaveLength(1)` AND the merged quantity. A single
     * line holding 2 is the fix; a single line holding 5 would mean the second
     * add replaced the first rather than merging.
     */
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ sku: 'p1001', stockQty: 10 }))

    const add = id =>
      as(user, request(app).post('/api/cart/item').send({ productId: id, quantity: 1 }))

    await add('p1001')
    const res = await add(String(product._id))

    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].quantity).toBe(2)

    // The stored line is normalised too, so the row and its key agree.
    const stored = await findCart(user._id)
    expect(stored.items[0].productId).toBe(String(product._id))
    expect(stored.items[0].variantKey).toBe(String(product._id))
  })

  it('keeps different variants of one product on separate lines', async () => {
    // Buying a towel in two colours is two lines, not one line of quantity 2.
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 10 }))
    const add = variant =>
      as(user, request(app).post('/api/cart/item').send({ productId: String(product._id), variant }))

    await add({ color: 'red' })
    const res = await add({ color: 'blue' })

    expect(res.body.items).toHaveLength(2)
  })

  describe('stock ceiling', () => {
    /**
     * Boundary value analysis, at the API level this time. The rule is "you
     * may not hold more than stockQty", so the interesting quantities are the
     * stock level itself and one past it.
     */
    it.each([
      ['exactly the available stock', 3, 200],
      ['one more than available', 4, 400],
    ])('%s → %s', async (_label, quantity, expected) => {
      const [user] = await seedUsers(makeUser())
      const [product] = await seedProducts(makeProduct({ stockQty: 3 }))

      const res = await as(
        user,
        request(app).post('/api/cart/item').send({ productId: String(product._id), quantity })
      )

      expect(res.status).toBe(expected)
    })

    it('counts what is already in the cart towards the ceiling', async () => {
      // Two adds of 2 against a stock of 3. Each is individually fine; the
      // second must be refused because the TOTAL would be 4. Checking only the
      // incoming quantity is the easy bug here.
      const [user] = await seedUsers(makeUser())
      const [product] = await seedProducts(makeProduct({ stockQty: 3 }))
      const add = () =>
        as(user, request(app).post('/api/cart/item').send({ productId: String(product._id), quantity: 2 }))

      expect((await add()).status).toBe(200)
      expect((await add()).status).toBe(400)
    })

    it('explains what is left, so the page can say so', async () => {
      // An error a shopper can act on. "Only 3 left in stock" beats "Bad
      // request", and the details object is what lets the UI show it.
      const [user] = await seedUsers(makeUser())
      const [product] = await seedProducts(makeProduct({ stockQty: 3 }))

      const res = await as(
        user,
        request(app).post('/api/cart/item').send({ productId: String(product._id), quantity: 9 })
      )

      expect(res.body.err).toMatch(/3/)
      expect(res.body.details).toMatchObject({ available: 3 })
    })
  })

  it('404s for a product that does not exist', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(
      user,
      request(app).post('/api/cart/item').send({ productId: 'p-nope', quantity: 1 })
    )

    expect(res.status).toBe(404)
  })

  it('accepts a legacy sku as well as an ObjectId', async () => {
    // Old carts in localStorage reference products by sku. If this path broke,
    // returning shoppers would find their saved items unaddable.
    const [user] = await seedUsers(makeUser())
    await seedProducts(makeProduct({ sku: 'p7777' }))

    const res = await as(
      user,
      request(app).post('/api/cart/item').send({ productId: 'p7777', quantity: 1 })
    )

    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
  })
})

describe('PUT /api/cart/item/:itemId', () => {
  it('changes the quantity', async () => {
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ price: 50, stockQty: 10 }))
    const item = makeCartItem(product._id, { itemId: 'line1', quantity: 1 })
    await seedCart(makeCart(user._id, [item]))

    const res = await as(user, request(app).put('/api/cart/item/line1').send({ quantity: 4 }))

    expect(res.status).toBe(200)
    expect(res.body.items[0].quantity).toBe(4)
    expect(res.body.totals.subtotal).toBe(200)
  })

  it('removes the line when the quantity is set to zero', async () => {
    // The cart stepper's minus button on the last unit. Zero means remove, not
    // "a line of nothing" — which is why the update schema allows 0 while the
    // add schema requires 1 or more.
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct())
    await seedCart(makeCart(user._id, [makeCartItem(product._id, { itemId: 'line1' })]))

    const res = await as(user, request(app).put('/api/cart/item/line1').send({ quantity: 0 }))

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  it('refuses a quantity above available stock', async () => {
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 2 }))
    await seedCart(makeCart(user._id, [makeCartItem(product._id, { itemId: 'line1' })]))

    const res = await as(user, request(app).put('/api/cart/item/line1').send({ quantity: 3 }))

    expect(res.status).toBe(400)
  })

  it('404s for a line that is not in the cart', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).put('/api/cart/item/ghost').send({ quantity: 1 }))

    expect(res.status).toBe(404)
  })

  it('cannot be used to reach into another shopper cart', async () => {
    /**
     * INSECURE DIRECT OBJECT REFERENCE — one of the most common real API
     * vulnerabilities. The item id is in the URL and is guessable, so the
     * question is whether the server checks that the line belongs to the
     * caller, or merely that the line exists.
     *
     * Here the update is scoped by { userId, 'items.itemId' } together, so
     * Bob's request matches no document and comes back 404. Alice's line is
     * untouched — asserted from the database, because a 404 response with the
     * write having happened anyway is exactly the failure worth catching.
     */
    const [alice, bob] = await seedUsers(makeUser(), makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 10 }))
    await seedCart(makeCart(alice._id, [makeCartItem(product._id, { itemId: 'alice-line', quantity: 1 })]))

    const res = await as(bob, request(app).put('/api/cart/item/alice-line').send({ quantity: 99 }))

    expect(res.status).toBe(404)

    const aliceCart = await findCart(alice._id)
    expect(aliceCart.items[0].quantity).toBe(1)
  })
})

describe('DELETE /api/cart', () => {
  it('empties the cart', async () => {
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct())
    await seedCart(makeCart(user._id, [makeCartItem(product._id)]))

    const res = await as(user, request(app).delete('/api/cart'))

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })
})

describe('POST /api/cart/merge', () => {
  it('folds a guest cart into the stored one, summing shared lines', async () => {
    // What happens at sign-in. A shopper who filled a cart as a guest must not
    // lose it, and must not end up with two rows of the same product.
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 10 }))
    await seedCart(makeCart(user._id, [makeCartItem(product._id, { quantity: 1 })]))

    const res = await as(
      user,
      request(app)
        .post('/api/cart/merge')
        .send({ items: [{ productId: String(product._id), quantity: 2 }] })
    )

    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].quantity).toBe(3)
  })

  it('keeps the rest of the guest cart when one line cannot be merged', async () => {
    /**
     * PARTIAL FAILURE, and the design decision behind it.
     *
     * One retired product or one line over its stock ceiling must not abort
     * the whole merge — losing five good items to save one bad one is the
     * wrong trade at the exact moment a shopper is signing in to buy.
     *
     * So merge() catches per line and continues. The test proves the good line
     * survived; that the bad one was dropped silently is the accepted cost,
     * and it is worth knowing that is what was chosen.
     */
    const [user] = await seedUsers(makeUser())
    const [good] = await seedProducts(makeProduct({ stockQty: 10 }))

    const res = await as(
      user,
      request(app)
        .post('/api/cart/merge')
        .send({
          items: [
            { productId: String(good._id), quantity: 1 },
            { productId: 'p-retired', quantity: 1 },
          ],
        })
    )

    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
  })

  it('accepts an empty merge', async () => {
    // Sign-in calls merge unconditionally, including for a shopper who never
    // touched a guest cart. That must not be an error.
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).post('/api/cart/merge').send({}))

    expect(res.status).toBe(200)
  })

  it('refuses an oversized merge list', async () => {
    // merge() loops, and every line is a product lookup plus a cart write. The
    // 100-item cap is what stops one request costing thousands of round-trips.
    const [user] = await seedUsers(makeUser())
    const items = Array.from({ length: 101 }, () => ({ productId: 'p1', quantity: 1 }))

    const res = await as(user, request(app).post('/api/cart/merge').send({ items }))

    expect(res.status).toBe(400)
  })
})

describe('delivery charge', () => {
  /**
   * The free-delivery threshold, exercised through the real endpoint.
   *
   * The unit test already pins calcShipping(299.99 / 300 / 300.01). This one
   * answers a different question: is that rule actually reached from a real
   * request, with a real cart, priced from real catalogue data?
   *
   * Same boundary, different claim. The unit test proves the rule is correct;
   * this proves it is connected.
   */
  it.each([
    ['just below the threshold', 299, 29, 328],
    ['exactly at the threshold', 300, 0, 300],
    ['above the threshold', 301, 0, 301],
  ])('%s: ₪%s subtotal → ₪%s delivery', async (_label, price, shipping, total) => {
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ price, salePrice: null, originalPrice: price }))
    await seedCart(makeCart(user._id, [makeCartItem(product._id, { quantity: 1 })]))

    const res = await as(user, request(app).get('/api/cart'))

    expect(res.body.totals.subtotal).toBe(price)
    expect(res.body.totals.shipping).toBe(shipping)
    expect(res.body.totals.total).toBe(total)
  })

  it('reports how much more is needed to earn free delivery', async () => {
    // Drives the "add ₪X more" nudge on the cart page.
    const [user] = await seedUsers(makeUser())
    const [product] = await seedProducts(makeProduct({ price: 250, salePrice: null, originalPrice: 250 }))
    await seedCart(makeCart(user._id, [makeCartItem(product._id)]))

    const res = await as(user, request(app).get('/api/cart'))

    expect(res.body.totals.amountToFreeShipping).toBe(50)
  })
})
