import { logger } from '../services/logger.service.js'
import { isProduction } from '../config/index.js'

/**
 * Base class for errors that are safe to show a client. Anything thrown that
 * is *not* an AppError is treated as an unexpected bug: it gets logged in
 * full but the response body is generic, so internal details and stack
 * traces never leak to the browser.
 */
export class AppError extends Error {
  constructor(message, status = 500, details = null) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.details = details
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details = null) {
    super(message, 409, details)
  }
}

/**
 * Wraps an async route handler so a rejected promise reaches the error
 * middleware. Express 4 does not await handlers, so without this an async
 * throw becomes an unhandled rejection and the request hangs until timeout.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

export function notFoundHandler(req, res) {
  res.status(404).json({ err: `Route not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars -- Express identifies the error
// handler by its four-parameter arity; dropping `next` silently disables it.
export function errorHandler(err, req, res, next) {
  const status = err.status || 500

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed`, err)
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`)
  }

  if (res.headersSent) return next(err)

  const body = { err: err.isOperational ? err.message : 'Internal server error' }
  if (err.details) body.details = err.details
  if (!isProduction && !err.isOperational) body.stack = err.stack

  res.status(status).json(body)
}
