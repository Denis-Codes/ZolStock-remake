import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { createApp } from '../../app.js'
import { cookieFor } from '../helpers/auth.js'
import { seedProducts, seedUsers } from '../helpers/db.js'
import { makeProduct, makeUser } from '../helpers/factories.js'

/**
 * The wishlist.
 *
 * Lower stakes than the cart — nothing here charges anyone — but the same two
 * questions apply, and they are the two that matter for any per-user
 * collection:
 *
 *   1. Can one shopper see or change another's?
 *   2. Does repeating an action repeat its effect?
 *
 * The second one is why `$addToSet` is used rather than `$push`: tapping a
 * heart icon twice on a slow connection must not produce two entries. That is
 * called IDEMPOTENCE, and it is worth knowing the word — an operation is
 * idempotent when doing it twice leaves the same state as doing it once.
 * Anything a user can trigger by double-tapping should be.
 */
const app = createApp({ enableRateLimit: false })

const as = (user, req) => req.set('Cookie', cookieFor(user))

/* Seeds a signed-in shopper and a product to want. Returns both, so each test
   reads as its own premise rather than depending on a shared beforeEach whose
   contents you have to scroll up to find. */
async function shopperWithProduct(productOverrides = {}) {
  const [user] = await seedUsers(makeUser())
  const [product] = await seedProducts(makeProduct(productOverrides))
  return { user, product }
}

describe('wishlist — authentication', () => {
  /**
   * Every route, in one table.
   *
   * A wishlist is a record of what a specific person wants, which is more
   * personal than it first appears — it is a list of things someone has
   * decided they cannot currently afford or have not decided on. It should
   * never be readable without a session.
   *
   * Table-driven because the interesting failure is a route that was added
   * later and missed the `router.use(requireAuth)` line. Enumerating every
   * method+path means a new unprotected route shows up as a red test rather
   * than as nothing at all.
   */
  it.each([
    ['get', '/api/wishlist'],
    ['post', '/api/wishlist/p1'],
    ['post', '/api/wishlist/merge'],
    ['delete', '/api/wishlist/p1'],
    ['delete', '/api/wishlist'],
  ])('%s %s requires a session', async (method, path) => {
    const res = await request(app)[method](path)

    expect(res.status).toBe(401)
  })
})

describe('GET /api/wishlist', () => {
  it('returns an empty wishlist for someone who has never used one', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).get('/api/wishlist'))

    expect(res.status).toBe(200)
    // Empty arrays, not null and not a 404. A shopper who has wished for
    // nothing has an empty wishlist; the page should render its empty state,
    // not an error.
    expect(res.body.products).toEqual([])
    expect(res.body.productIds).toEqual([])
  })

  /**
   * Full product documents, not just ids.
   *
   * The service resolves them server-side so the wishlist page can render in
   * one round trip instead of one request per item. Worth a test because it is
   * the sort of thing an innocent-looking refactor removes — returning ids is
   * "simpler", and the page then makes twenty requests.
   */
  it('resolves ids into full products so the page can render in one call', async () => {
    const { user, product } = await shopperWithProduct({ displayNameHe: 'סיר יפה' })

    await as(user, request(app).post(`/api/wishlist/${product._id}`))
    const res = await as(user, request(app).get('/api/wishlist'))

    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].displayNameHe).toBe('סיר יפה')
    expect(res.body.products[0].price).toBe(product.price)
  })

  it('never shows one shopper another shopper\'s wishlist', async () => {
    const { user: alice, product } = await shopperWithProduct()
    const [bob] = await seedUsers(makeUser({ username: 'bob' }))

    await as(alice, request(app).post(`/api/wishlist/${product._id}`))

    const res = await as(bob, request(app).get('/api/wishlist'))

    expect(res.body.productIds).toEqual([])
  })
})

describe('POST /api/wishlist/:productId', () => {
  it('adds a product', async () => {
    const { user, product } = await shopperWithProduct()

    const res = await as(user, request(app).post(`/api/wishlist/${product._id}`))

    expect(res.status).toBe(200)
    expect(res.body.productIds).toEqual([String(product._id)])
    // The response is the whole updated wishlist, so the client never has to
    // re-fetch to know the new state.
    expect(res.body.products).toHaveLength(1)
  })

  /**
   * IDEMPOTENCE — the property this endpoint is built around.
   *
   * `$addToSet` rather than `$push`. Double-tapping a heart on a slow
   * connection, or a client retrying a request it never saw a response to,
   * must leave exactly one entry.
   *
   * Without this the wishlist page renders the same product twice and removing
   * it once leaves the duplicate behind — which looks to the shopper like the
   * remove button is broken.
   */
  it('is idempotent: adding twice leaves one entry', async () => {
    const { user, product } = await shopperWithProduct()

    await as(user, request(app).post(`/api/wishlist/${product._id}`))
    const res = await as(user, request(app).post(`/api/wishlist/${product._id}`))

    expect(res.body.productIds).toHaveLength(1)
    expect(res.body.products).toHaveLength(1)
  })

  it('404s a product that does not exist', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).post('/api/wishlist/no-such-product'))

    expect(res.status).toBe(404)
  })

  it('holds several different products', async () => {
    const [user] = await seedUsers(makeUser())
    const [a, b] = await seedProducts(makeProduct(), makeProduct())

    await as(user, request(app).post(`/api/wishlist/${a._id}`))
    const res = await as(user, request(app).post(`/api/wishlist/${b._id}`))

    expect(res.body.productIds).toHaveLength(2)
  })
})

describe('DELETE /api/wishlist', () => {
  it('removes a single product and leaves the rest', async () => {
    const [user] = await seedUsers(makeUser())
    const [a, b] = await seedProducts(makeProduct(), makeProduct())

    await as(user, request(app).post(`/api/wishlist/${a._id}`))
    await as(user, request(app).post(`/api/wishlist/${b._id}`))

    const res = await as(user, request(app).delete(`/api/wishlist/${a._id}`))

    // Both halves: the right one went, and the other one stayed. Asserting
    // only the length would pass on an endpoint that removed the wrong item.
    expect(res.body.productIds).toEqual([String(b._id)])
  })

  it('accepts removing something that was never there', async () => {
    const { user, product } = await shopperWithProduct()

    const res = await as(user, request(app).delete(`/api/wishlist/${product._id}`))

    // Not a 404. The end state the caller asked for — "this is not in my
    // wishlist" — is already true, so the request succeeded. This is the same
    // idempotence argument as adding, in the other direction.
    expect(res.status).toBe(200)
    expect(res.body.productIds).toEqual([])
  })

  it('empties the whole wishlist', async () => {
    const [user] = await seedUsers(makeUser())
    const [a, b] = await seedProducts(makeProduct(), makeProduct())

    await as(user, request(app).post(`/api/wishlist/${a._id}`))
    await as(user, request(app).post(`/api/wishlist/${b._id}`))

    const res = await as(user, request(app).delete('/api/wishlist'))

    expect(res.body.productIds).toEqual([])
    expect(res.body.products).toEqual([])
  })

  it('cannot reach into another shopper\'s wishlist', async () => {
    const { user: alice, product } = await shopperWithProduct()
    const [bob] = await seedUsers(makeUser({ username: 'bob' }))

    await as(alice, request(app).post(`/api/wishlist/${product._id}`))

    // Bob asks to remove a real product id — one that is genuinely in a
    // wishlist, just not his. Every route is scoped by the session's user id,
    // so this can only ever touch Bob's own (empty) list.
    await as(bob, request(app).delete(`/api/wishlist/${product._id}`))

    const alicesList = await as(alice, request(app).get('/api/wishlist'))
    expect(alicesList.body.productIds).toHaveLength(1)
  })
})

describe('POST /api/wishlist/merge', () => {
  /**
   * Folds a guest wishlist into the stored one at sign-in — the same problem
   * the cart solves, and the same requirement: signing in must never discard
   * what the shopper collected beforehand.
   */
  it('folds a guest list into the stored one', async () => {
    const [user] = await seedUsers(makeUser())
    const [a, b] = await seedProducts(makeProduct(), makeProduct())

    await as(user, request(app).post(`/api/wishlist/${a._id}`))

    const res = await as(
      user,
      request(app).post('/api/wishlist/merge').send({ productIds: [String(b._id)] })
    )

    expect(res.body.productIds).toHaveLength(2)
  })

  it('does not duplicate something already wished for', async () => {
    const { user, product } = await shopperWithProduct()

    await as(user, request(app).post(`/api/wishlist/${product._id}`))

    const res = await as(
      user,
      request(app).post('/api/wishlist/merge').send({ productIds: [String(product._id)] })
    )

    expect(res.body.productIds).toHaveLength(1)
  })

  it('accepts an empty merge', async () => {
    // Happens on every sign-in by someone who was not browsing as a guest.
    // A 400 here would make logging in fail for the most ordinary case there
    // is.
    const [user] = await seedUsers(makeUser())

    const res = await as(user, request(app).post('/api/wishlist/merge').send({}))

    expect(res.status).toBe(200)
    expect(res.body.productIds).toEqual([])
  })

  it('refuses an oversized list', async () => {
    // The schema caps it at 200. Without a ceiling, a crafted request could
    // push an arbitrarily large array into one document — a cheap way to
    // exhaust storage or blow past MongoDB's 16MB document limit.
    const [user] = await seedUsers(makeUser())
    const productIds = Array.from({ length: 201 }, (_, i) => `p${i}`)

    const res = await as(user, request(app).post('/api/wishlist/merge').send({ productIds }))

    expect(res.status).toBe(400)
  })

  /**
   * Merge does NOT check that the ids are real products, unlike the add
   * endpoint which 404s.
   *
   * Defensible: a guest list can contain something retired since, and failing
   * the whole merge over one dead id would lose the other nineteen. The dead
   * id is simply never resolved into a product on read.
   *
   * Pinned because it is an asymmetry between two endpoints that otherwise
   * look alike, and asymmetries get "corrected" by whoever notices them next.
   */
  it('accepts ids that no longer match a product, rather than losing the whole merge', async () => {
    const [user] = await seedUsers(makeUser())

    const res = await as(
      user,
      request(app).post('/api/wishlist/merge').send({ productIds: ['retired-product'] })
    )

    expect(res.status).toBe(200)
    expect(res.body.productIds).toEqual(['retired-product'])
    expect(res.body.products).toEqual([])
  })
})

describe('wishlist — the retired product gap', () => {
  /**
   * FOUND WHILE WRITING THESE TESTS.
   *
   * `getByUserId` resolves ids into products and silently skips any that no
   * longer exist — but it returns `productIds` untouched. So the two fields
   * disagree:
   *
   *   productIds: ['live-id', 'retired-id']   ← 2
   *   products:   [{ live }]                  ← 1
   *
   * Any UI that counts one and renders the other shows "2 items" above a list
   * of one. The heart icon on a product page checks `productIds`, so it also
   * stays filled for a product that no longer renders anywhere.
   *
   * Not filed as a bug: it is arguably correct to keep the id, since a product
   * can come back and the shopper's intent has not changed. But the two fields
   * must not be used interchangeably, and nothing currently says so. This test
   * is where that gets written down.
   */
  it('keeps a retired id in productIds while dropping it from products', async () => {
    const { user, product } = await shopperWithProduct()

    await as(user, request(app).post(`/api/wishlist/${product._id}`))
    await as(user, request(app).post('/api/wishlist/merge').send({ productIds: ['retired'] }))

    const res = await as(user, request(app).get('/api/wishlist'))

    expect(res.body.productIds).toHaveLength(2)
    expect(res.body.products).toHaveLength(1)
  })
})
