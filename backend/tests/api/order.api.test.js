import request from 'supertest'
import { ObjectId } from 'mongodb'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedProducts, seedUsers, seedCart, seedOrders, findProduct, findCart, findOrders } from '../helpers/db.js'
import { makeProduct, makeUser, makeAdmin, makeCart, makeCartItem, makeShippingAddress } from '../helpers/factories.js'

/**
 * Checkout and orders — where stock, money and permissions all meet.
 *
 * Two properties matter more than everything else in this file:
 *
 *   1. An order is a PRICE SNAPSHOT. It records what was charged, and stays
 *      true after the catalogue price changes.
 *   2. Stock cannot go negative, even if two shoppers check out at the same
 *      instant. That is the last test in the file and the hardest one to get
 *      right.
 */
const app = createApp({ enableRateLimit: false })

const as = (user, req) => req.set('Cookie', cookieFor(user))
const ADDRESS = makeShippingAddress()

/** A signed-in shopper with one product, and a cart holding `quantity` of it. */
async function shopperWithCart({ quantity = 1, ...productOverrides } = {}) {
  const [user] = await seedUsers(makeUser())
  const [product] = await seedProducts(makeProduct(productOverrides))
  await seedCart(makeCart(user._id, [makeCartItem(product._id, { quantity })]))
  return { user, product }
}

describe('POST /api/order — checkout', () => {
  it('is refused when signed out', async () => {
    const res = await request(app).post('/api/order').send({ shippingAddress: ADDRESS })

    expect(res.status).toBe(401)
    expect(await findOrders()).toEqual([])
  })

  it('turns the cart into an order', async () => {
    const { user } = await shopperWithCart({ price: 120, quantity: 2, stockQty: 10 })

    const res = await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    // 201 Created, not 200. The request created a new resource, and the status
    // says so — this is the one place in the API where that distinction is
    // meaningful.
    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.totals.subtotal).toBe(240)
    expect(res.body.status).toBe('paid')
  })

  it('records a price snapshot that survives a later price change', async () => {
    /**
     * The defining property of an order.
     *
     * A cart holds references and is re-priced on every read. An order must do
     * the OPPOSITE: it is a record of what was actually charged. If it were
     * re-priced from the catalogue, then a sale next week would retroactively
     * change what a shopper paid last week — and the shop's own books would
     * disagree with the customer's receipt.
     *
     * So: buy at 120, drop the catalogue price to 10, read the order back and
     * it must still say 120.
     */
    const { user, product } = await shopperWithCart({ price: 120, stockQty: 5 })

    const checkout = await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))
    expect(checkout.status).toBe(201)

    const products = await findProduct({ _id: product._id })
    expect(products).not.toBeNull()

    // The world changes underneath the order.
    const { dbService } = await import('../../services/db.service.js')
    const collection = await dbService.getCollection('products')
    await collection.updateOne({ _id: product._id }, { $set: { price: 10, salePrice: 10 } })

    const [order] = await findOrders()
    expect(order.items[0].unitPrice).toBe(120)
    expect(order.totals.subtotal).toBe(120)
  })

  it('decrements stock by the quantity ordered', async () => {
    const { user, product } = await shopperWithCart({ quantity: 3, stockQty: 10 })

    await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    const after = await findProduct({ _id: product._id })
    expect(after.stockQty).toBe(7)
  })

  it('marks a product out of stock when the last unit is sold', async () => {
    // Keeps the storefront's stock badges truthful. A product at stockQty 0
    // that still says "in stock" invites an order that cannot be fulfilled.
    const { user, product } = await shopperWithCart({ quantity: 2, stockQty: 2 })

    await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    const after = await findProduct({ _id: product._id })
    expect(after.stockQty).toBe(0)
    expect(after.inStock).toBe(false)
  })

  it('empties the cart once the order is placed', async () => {
    // Otherwise the shopper buys the same basket twice on a refresh.
    const { user } = await shopperWithCart({ stockQty: 5 })

    await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    const cart = await findCart(user._id)
    expect(cart.items).toEqual([])
  })

  it('refuses to check out an empty cart', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    expect(res.status).toBe(400)
    expect(await findOrders()).toEqual([])
  })

  it('refuses when the cart holds more than is in stock', async () => {
    // 409 Conflict, not 400. The request is well-formed and was valid when the
    // shopper built the cart — the world changed underneath them. The status
    // is what tells the frontend to re-read the cart rather than to blame the
    // input.
    const { user } = await shopperWithCart({ quantity: 5, stockQty: 2 })

    const res = await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    expect(res.status).toBe(409)
    expect(res.body.details.items[0]).toMatchObject({ requested: 5, available: 2 })
  })

  it('requires a shipping address', async () => {
    const { user } = await shopperWithCart({ stockQty: 5 })

    const res = await as(user, request(app).post('/api/order').send({}))

    expect(res.status).toBe(400)
  })

  it('ignores client-supplied items and totals', async () => {
    /**
     * The highest-stakes strip in the application. If a client could name the
     * items or the totals, checkout would be a form for choosing what to pay.
     *
     * Neither field is declared in the schema, so both are dropped before the
     * handler runs, and the order is built from the server-side cart instead.
     * The order comes back at ₪120 — the catalogue price — not the ₪0.01 that
     * was sent.
     */
    const { user } = await shopperWithCart({ price: 120, stockQty: 5 })

    const res = await as(
      user,
      request(app)
        .post('/api/order')
        .send({
          shippingAddress: ADDRESS,
          items: [{ productId: 'anything', quantity: 99, unitPrice: 0.01 }],
          totals: { subtotal: 0.01, shipping: 0, total: 0.01 },
          status: 'delivered',
        })
    )

    expect(res.status).toBe(201)
    expect(res.body.totals.total).toBe(149) // 120 + 29 delivery
    expect(res.body.items).toHaveLength(1)
    expect(res.body.status).toBe('paid')
  })

  it('releases reserved stock when a later line fails', async () => {
    /**
     * COMPENSATING ROLLBACK.
     *
     * Checkout reserves stock one line at a time. If line two fails, line one
     * has already been decremented — so the code gives it back before
     * throwing. Without that, every failed checkout would quietly destroy
     * inventory that nobody bought.
     *
     * The setup: line one is fine, line two asks for more than exists. The
     * assertion is not about the error — it is that product A's stock is
     * exactly what it started at.
     *
     * (Stage 10 replaces this hand-rolled compensation with a real database
     * transaction. The test stays valid either way, because it asserts the
     * outcome and not the mechanism.)
     */
    const [user] = await seedUsers(makeUser())
    const [ok, short] = await seedProducts(
      makeProduct({ stockQty: 10 }),
      makeProduct({ stockQty: 10 })
    )
    await seedCart(
      makeCart(user._id, [
        makeCartItem(ok._id, { quantity: 2 }),
        makeCartItem(short._id, { quantity: 2 }),
      ])
    )

    // Drop the second product's stock after the cart was built, so the
    // conditional decrement fails at reservation time rather than at the
    // earlier exceedsStock check.
    const { dbService } = await import('../../services/db.service.js')
    const products = await dbService.getCollection('products')
    await products.updateOne({ _id: short._id }, { $set: { stockQty: 0, inStock: false } })

    const res = await as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    expect(res.status).toBe(409)

    const restored = await findProduct({ _id: ok._id })
    expect(restored.stockQty).toBe(10)
    expect(await findOrders()).toEqual([])
  })
})

describe('GET /api/order — reading your own orders', () => {
  it('returns only the caller orders', async () => {
    const [alice, bob] = await seedUsers(makeUser(), makeUser())
    await seedOrders(
      { userId: String(alice._id), status: 'paid', items: [], totals: {}, createdAt: new Date() },
      { userId: String(bob._id), status: 'paid', items: [], totals: {}, createdAt: new Date() }
    )

    const res = await as(alice, request(app).get('/api/order'))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].userId).toBe(String(alice._id))
  })

  it('refuses to show one shopper another order', async () => {
    /**
     * Again an insecure-direct-object-reference check, and the most valuable
     * kind: the id is a real, existing order, just not the caller's. A server
     * that looks up by id and forgets to check ownership would return it
     * happily, and an attacker walking order ids would read every customer's
     * name, address and phone number.
     *
     * 403 rather than 404 is a deliberate choice here — the service checks
     * ownership separately from existence so that an unauthorised read is
     * distinguishable in the logs. (The stricter alternative is to return 404
     * so an attacker cannot even confirm the order exists. Worth knowing both
     * exist and that this codebase chose visibility in the logs.)
     */
    const [alice, bob] = await seedUsers(makeUser(), makeUser())
    const [order] = await seedOrders({
      _id: new ObjectId(),
      userId: String(alice._id),
      status: 'paid',
      items: [],
      totals: {},
      createdAt: new Date(),
    })

    const res = await as(bob, request(app).get(`/api/order/${order._id}`))

    expect(res.status).toBe(403)
  })

  it('lets an admin read any order', async () => {
    const [alice] = await seedUsers(makeUser())
    const [admin] = await seedUsers(makeAdmin())
    const [order] = await seedOrders({
      _id: new ObjectId(),
      userId: String(alice._id),
      status: 'paid',
      items: [],
      totals: {},
      createdAt: new Date(),
    })

    const res = await as(admin, request(app).get(`/api/order/${order._id}`))

    expect(res.status).toBe(200)
  })

  it('404s on a malformed order id instead of crashing', async () => {
    // 'not-an-id' cannot be turned into an ObjectId. Unguarded, that throws a
    // raw BSON error and surfaces as a 500 — an unhandled exception reachable
    // from any URL bar.
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).get('/api/order/not-an-id'))

    expect(res.status).toBe(404)
  })
})

describe('admin-only order routes', () => {
  /**
   * The authorization matrix again — signed out / normal user / admin — this
   * time driven from a table, because two routes need the same three checks.
   */
  const routes = [
    ['get', '/api/order/all'],
    ['put', '/api/order/000000000000000000000001/status'],
  ]

  it.each(routes)('%s %s is refused when signed out', async (method, path) => {
    const res = await request(app)[method](path).send({ status: 'shipped' })

    expect(res.status).toBe(401)
  })

  it.each(routes)('%s %s is refused for a normal shopper', async (method, path) => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app)[method](path).send({ status: 'shipped' }))

    // 403, not 401 — see the note in product.api.test.js. Sending a signed-in
    // shopper back to the login page is a loop they cannot escape.
    expect(res.status).toBe(403)
  })

  it('lets an admin list every order', async () => {
    const [shopper] = await seedUsers(makeUser())
    const [admin] = await seedUsers(makeAdmin())
    await seedOrders(
      { userId: String(shopper._id), status: 'paid', items: [], totals: {}, createdAt: new Date() },
      { userId: String(admin._id), status: 'paid', items: [], totals: {}, createdAt: new Date() }
    )

    const res = await as(admin, request(app).get('/api/order/all'))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('lets an admin advance an order status and records the history', async () => {
    // The positive case. Without it, all the tests above prove is that the
    // endpoint refuses everyone — which a completely broken route also does.
    const [admin] = await seedUsers(makeAdmin())
    const [order] = await seedOrders({
      _id: new ObjectId(),
      userId: 'someone',
      status: 'paid',
      statusHistory: [{ status: 'paid', at: new Date() }],
      items: [],
      totals: {},
      createdAt: new Date(),
    })

    const res = await as(
      admin,
      request(app).put(`/api/order/${order._id}/status`).send({ status: 'shipped' })
    )

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('shipped')
    // The history is the audit trail — "who said this order shipped, and
    // when" is the first question asked when a delivery is disputed.
    expect(res.body.statusHistory).toHaveLength(2)
  })

  it('rejects a status that is not in the allowed set', async () => {
    const [admin] = await seedUsers(makeAdmin())
    const [order] = await seedOrders({
      _id: new ObjectId(),
      userId: 'someone',
      status: 'paid',
      items: [],
      totals: {},
      createdAt: new Date(),
    })

    const res = await as(
      admin,
      request(app).put(`/api/order/${order._id}/status`).send({ status: 'refunded' })
    )

    expect(res.status).toBe(400)
  })
})

describe('two shoppers, one last unit', () => {
  it('sells the last item exactly once when two checkouts race', async () => {
    /**
     * ═══════════════════════════════════════════════════════════════════
     * THE MOST IMPORTANT TEST IN THIS FILE
     * ═══════════════════════════════════════════════════════════════════
     *
     * Every test above sends one request and waits. Real shops do not work
     * that way — on a sale morning, hundreds of people click "buy" on the same
     * item within the same second.
     *
     * THE BUG THIS GUARDS AGAINST
     * The obvious way to write checkout is read-then-write:
     *
     *     const product = await products.findOne(...)     // stockQty is 1
     *     if (product.stockQty >= qty) {                  // both callers pass
     *         await products.updateOne(..., { $inc: { stockQty: -qty } })
     *     }
     *
     * Two requests interleave between the read and the write, both see 1, both
     * decrement, and stock is now -1. Two customers are promised the same
     * item. Nothing errors. Nobody finds out until the warehouse does.
     *
     * THE FIX, WHICH THIS TEST PROVES IS IN PLACE
     * The guard lives INSIDE the update's filter, so the check and the write
     * are one indivisible database operation:
     *
     *     updateOne(
     *       { _id, stockQty: { $gte: qty }, inStock: true },
     *       { $inc: { stockQty: -qty } }
     *     )
     *
     * MongoDB guarantees a single document update is atomic. The second caller
     * matches no document, modifiedCount is 0, and checkout fails cleanly with
     * a 409.
     *
     * HOW THE TEST WORKS
     * Promise.all fires both requests without awaiting the first, so they are
     * genuinely in flight together. The assertion is on the SHAPE of the
     * outcome — exactly one 201 and exactly one 409 — rather than on which
     * shopper won, because who wins is a race and asserting it would make the
     * test flaky.
     *
     * "Exactly one of them succeeded" is the real requirement. Say that.
     */
    const [alice, bob] = await seedUsers(makeUser(), makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 1, price: 100 }))

    await seedCart(makeCart(alice._id, [makeCartItem(product._id, { itemId: 'a1', quantity: 1 })]))
    await seedCart(makeCart(bob._id, [makeCartItem(product._id, { itemId: 'b1', quantity: 1 })]))

    const checkout = user =>
      as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS }))

    // Both in flight at once — note there is no `await` on either individually.
    const [first, second] = await Promise.all([checkout(alice), checkout(bob)])

    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])

    // Stock landed at zero, never below it.
    const after = await findProduct({ _id: product._id })
    expect(after.stockQty).toBe(0)
    expect(after.inStock).toBe(false)

    // And exactly one order exists — the loser was not silently recorded.
    expect(await findOrders()).toHaveLength(1)
  })

  it('never oversells under heavier contention', async () => {
    /**
     * The same property with five shoppers and three units.
     *
     * Two racers can pass by luck: if the timing happens to separate them, a
     * broken read-then-write implementation would still produce one success
     * and one failure. Five simultaneous requests make that luck much harder
     * to come by, which makes a genuinely broken implementation much more
     * likely to be caught.
     *
     * This is the honest limitation of concurrency testing: it cannot PROVE
     * correctness, only fail to disprove it. Raising the contention raises the
     * odds of catching a real defect. The atomic-update argument in the test
     * above is what actually establishes correctness; these tests confirm the
     * code really does what that argument assumes.
     */
    const users = await seedUsers(makeUser(), makeUser(), makeUser(), makeUser(), makeUser())
    const [product] = await seedProducts(makeProduct({ stockQty: 3, price: 50 }))

    for (const user of users) {
      await seedCart(makeCart(user._id, [makeCartItem(product._id, { quantity: 1 })]))
    }

    const results = await Promise.all(
      users.map(user => as(user, request(app).post('/api/order').send({ shippingAddress: ADDRESS })))
    )

    const created = results.filter(r => r.status === 201)
    const rejected = results.filter(r => r.status === 409)

    expect(created).toHaveLength(3)
    expect(rejected).toHaveLength(2)

    const after = await findProduct({ _id: product._id })
    expect(after.stockQty).toBe(0)
    // The assertion that actually matters: stock never went negative.
    expect(after.stockQty).toBeGreaterThanOrEqual(0)
    expect(await findOrders()).toHaveLength(3)
  })
})
