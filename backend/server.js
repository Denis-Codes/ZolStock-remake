import './config/env.js' // must be first: populates process.env before any module reads it

import http from 'http'

import { createApp } from './app.js'
import { logger } from './services/logger.service.js'
import { dbService } from './services/db.service.js'
import { setupSocketAPI } from './services/socket.service.js'

/**
 * The process.
 *
 * Everything that makes this a running server rather than a request handler
 * lives here: the port binding, the socket server, and the signal handlers.
 * The app itself is built by createApp() in app.js, which has no side effects
 * — see the comment there for why the split matters for testing.
 */
const app = createApp()
const server = http.createServer(app)

setupSocketAPI(server)

const port = process.env.PORT || 3030

server.listen(port, () => {
  logger.info(`Server is running on port: ${port}`)
})

// Graceful shutdown: stop accepting connections, then close the DB pool.
// Without this, nodemon restarts and container redeploys can leave Mongo
// sockets dangling and drop in-flight requests mid-response.
let isShuttingDown = false

async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info(`${signal} received, shutting down`)

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out after 10s, forcing exit')
    process.exit(1)
  }, 10000).unref()

  server.close(async () => {
    try {
      await dbService.close()
    } catch (err) {
      logger.error('Error closing DB connection', err)
    }
    clearTimeout(forceExit)
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
