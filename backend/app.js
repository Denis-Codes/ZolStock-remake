import './config/env.js' // must be first: populates process.env before any module reads it

import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import express from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'

import { authRoutes } from './api/auth/auth.routes.js'
import { userRoutes } from './api/user/user.routes.js'
import { cartRoutes } from './api/cart/cart.routes.js'
import { orderRoutes } from './api/order/order.routes.js'
import { reviewRoutes } from './api/review/review.routes.js'
import { productRoutes } from './api/product/product.routes.js'
import { wishlistRoutes } from './api/wishlist/wishlist.routes.js'

import { isProduction } from './config/index.js'
import { dbService } from './services/db.service.js'
import { apiLimiter } from './middlewares/rateLimit.middleware.js'
import { setupAsyncLocalStorage } from './middlewares/setupAls.middleware.js'
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js'

/**
 * Builds the Express application, with no side effects on the outside world.
 *
 * This is split out from server.js so the app can be constructed without
 * binding a port. server.js is the process — it listens, wires up sockets and
 * handles shutdown signals. This module is just the request handler.
 *
 * That separation is what makes the API testable: supertest drives this object
 * directly, in-process, with no port, no sockets and no shutdown hooks. Every
 * test file can build its own instance without them fighting over :3030.
 *
 * @param {object} [options]
 * @param {boolean} [options.enableRateLimit] - Off in tests by default: the
 *   limiter keeps its counters in module scope, so state would leak between
 *   test files and make unrelated tests fail once they crossed the threshold.
 *   The limiter's own tests turn it back on deliberately.
 */
export function createApp({ enableRateLimit = true } = {}) {
  const app = express()

  app.disable('x-powered-by')

  // contentSecurityPolicy is disabled because this server also serves the built
  // SPA from /public, whose inline Vite bootstrap a default CSP would block.
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(compression())
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))

  // Credentialed CORS needs an explicit origin allowlist — '*' is rejected by
  // browsers when withCredentials is set, which the frontend's axios uses.
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  // Static assets are served in BOTH environments. Mounting this only in
  // production meant that in dev every /assets/... request fell through to the
  // SPA catch-all and returned index.html with a 200 and Content-Type
  // text/html — so a product image could never load, and did not even fail
  // honestly with a 404.
  //
  // crossOriginResourcePolicy is relaxed to cross-origin for these files
  // specifically: helmet's default of same-origin blocks the Vite dev server on
  // :5173 from loading an image served by this origin on :3030. The API's own
  // responses keep the stricter default.
  app.use(
    express.static(path.resolve('public'), {
      setHeaders: res => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    })
  )

  if (isProduction) {
    // In production the SPA is served from this same origin, so CORS is only
    // needed if a separately-hosted frontend was configured.
    if (corsOrigins.length) app.use(cors({ origin: corsOrigins, credentials: true }))
  } else {
    app.use(cors({ origin: corsOrigins, credentials: true }))
  }

  app.all('*', setupAsyncLocalStorage)

  app.get('/api/health', async (req, res) => {
    const dbOk = await dbService.ping()
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'up' : 'down',
      uptimeSec: Math.round(process.uptime()),
    })
  })

  if (enableRateLimit) app.use('/api', apiLimiter)

  app.use('/api/auth', authRoutes)
  app.use('/api/user', userRoutes)
  app.use('/api/cart', cartRoutes)
  app.use('/api/order', orderRoutes)
  app.use('/api/review', reviewRoutes)
  app.use('/api/product', productRoutes)
  app.use('/api/wishlist', wishlistRoutes)

  // Unmatched /api routes must 404 as JSON. Without this they fall through to
  // the SPA catch-all below and the client receives an HTML page where it is
  // parsing JSON, which surfaces as a confusing parse error instead of a 404.
  app.use('/api', notFoundHandler)

  // A missing static asset must 404 rather than fall through to the catch-all.
  // Without this, a mistyped image path returns index.html with a 200, and the
  // browser reports an image-decode failure instead of a missing file.
  app.use('/assets', (req, res) => {
    res.status(404).send('Asset not found')
  })

  // Every other route serves the SPA shell so react-router can handle it.
  app.get('/**', (req, res) => {
    res.sendFile(path.resolve('public/index.html'))
  })

  app.use(errorHandler)

  return app
}
