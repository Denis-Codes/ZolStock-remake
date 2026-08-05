import bcrypt from 'bcrypt'
import request from 'supertest'
import { ObjectId } from 'mongodb'
import { describe, it, expect } from 'vitest'

import { createApp } from '../app.js'
import { dbService } from '../services/db.service.js'
import { cookieFor, invalidCookie } from './helpers/auth.js'
import { seedProducts, seedUsers, findProduct, countDocuments } from './helpers/db.js'
import { makeProduct, makeUser, makeAdmin, TEST_PASSWORD, TEST_PASSWORD_HASH } from './helpers/factories.js'

/**
 * Tests for the test harness.
 *
 * This file asserts nothing about the product. It exists because everything in
 * stages 3-6 is built on these pieces, and a harness that is subtly broken
 * produces false results across the whole suite — tests that pass while the app
 * is broken, or fail while it is fine. Both are worse than having no tests.
 *
 * Rule of thumb: if other tests depend on it, it is production code, and it
 * gets tested like production code.
 */

const app = createApp({ enableRateLimit: false })

describe('harness: database', () => {
  it('connects to an ephemeral database, not a real one', async () => {
    const db = await dbService.getDb()

    // The setup file generates this name per test file. Seeing it here proves
    // the env-before-import ordering actually worked.
    expect(db.databaseName).toMatch(/^test_[0-9a-f]{32}$/)
    expect(process.env.MONGO_URL).not.toContain('27017')
  })

  it('supports transactions, which requires a replica set', async () => {
    // The reason global-setup uses MongoMemoryReplSet rather than
    // MongoMemoryServer. Stage 10 replaces checkout()'s compensating rollback
    // with a real transaction; if this ever fails, that plan is blocked.
    const client = await dbService.getClient()
    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        const products = await dbService.getCollection('products')
        await products.insertOne(makeProduct({ sku: 'tx-test' }), { session })
      })

      expect(await findProduct({ sku: 'tx-test' })).not.toBeNull()
    } finally {
      await session.endSession()
    }
  })

  it('rolls a transaction back on throw', async () => {
    const client = await dbService.getClient()
    const session = client.startSession()

    try {
      await expect(
        session.withTransaction(async () => {
          const products = await dbService.getCollection('products')
          await products.insertOne(makeProduct({ sku: 'rollback-me' }), { session })
          throw new Error('abort')
        })
      ).rejects.toThrow('abort')

      // If this row survived, the "transaction" is not atomic and every
      // conclusion stage 10 draws from it would be wrong.
      expect(await findProduct({ sku: 'rollback-me' })).toBeNull()
    } finally {
      await session.endSession()
    }
  })
})

describe('harness: isolation between tests', () => {
  // These two run in order in the same file. If afterEach did not clear the
  // database, the second would see the first one's product. That is the whole
  // guarantee the suite rests on, so it is asserted rather than assumed.
  it('writes a product', async () => {
    await seedProducts(makeProduct({ sku: 'leak-check' }))
    expect(await countDocuments('products')).toBe(1)
  })

  it('does not see the previous test\'s product', async () => {
    expect(await countDocuments('products')).toBe(0)
  })
})

describe('harness: factories', () => {
  it('produces a valid product by default', () => {
    const product = makeProduct()

    expect(product.inStock).toBe(true)
    expect(product.stockQty).toBeGreaterThan(0)
    expect(product.price).toBeGreaterThan(0)
    expect(ObjectId.isValid(product._id)).toBe(true)
  })

  it('gives every product a unique sku', () => {
    const skus = Array.from({ length: 50 }, () => makeProduct().sku)
    expect(new Set(skus).size).toBe(50)
  })

  it('lets a test override only what it cares about', () => {
    const product = makeProduct({ stockQty: 1 })

    expect(product.stockQty).toBe(1)
    expect(product.inStock).toBe(true) // default preserved
  })

  it('TEST_PASSWORD_HASH really is the hash of TEST_PASSWORD', async () => {
    // The hash is hardcoded for speed. If it drifts from the password, every
    // login test fails with nothing pointing at the fixture — so it is pinned
    // here, where the failure names the cause.
    expect(await bcrypt.compare(TEST_PASSWORD, TEST_PASSWORD_HASH)).toBe(true)
    expect(makeUser().password).toBe(TEST_PASSWORD_HASH)
  })

  it('makes non-admins by default and admins only on request', () => {
    expect(makeUser().isAdmin).toBe(false)
    expect(makeAdmin().isAdmin).toBe(true)
  })
})

describe('harness: app + supertest', () => {
  it('serves requests without binding a port', async () => {
    // Proves the createApp() split works: no listen(), no :3030, no sockets.
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' })
  })

  it('404s an unknown API route as JSON, not as the SPA shell', async () => {
    const res = await request(app).get('/api/nope')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body.err).toBeTruthy()
  })
})

describe('harness: auth cookies', () => {
  it('authenticates a request without going through login', async () => {
    const user = makeUser()
    await seedUsers(user)

    const res = await request(app).get('/api/order').set('Cookie', cookieFor(user))

    // 200 (their empty order list) proves requireAuth accepted the cookie.
    expect(res.status).toBe(200)
  })

  it('is rejected when the token cannot be decrypted', async () => {
    const res = await request(app).get('/api/order').set('Cookie', invalidCookie())

    expect(res.status).toBe(401)
  })

  it('carries admin rights only when the user has them', async () => {
    const user = makeUser()
    const admin = makeAdmin()
    await seedUsers(user, admin)

    const asUser = await request(app).get('/api/order/all').set('Cookie', cookieFor(user))
    const asAdmin = await request(app).get('/api/order/all').set('Cookie', cookieFor(admin))

    expect(asUser.status).toBe(403)
    expect(asAdmin.status).toBe(200)
  })
})
