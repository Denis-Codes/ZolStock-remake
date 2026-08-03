import { BadRequestError } from './error.middleware.js'

/**
 * Builds a middleware that validates one part of the request against a Zod
 * schema and *replaces* it with the parsed result.
 *
 * Replacing rather than merely checking is the point: the parsed object
 * contains only the keys the schema declares, so extra fields a client tacks
 * on are dropped before any handler sees them. That is what stops mass
 * assignment — e.g. posting `isAdmin: true` to the signup endpoint.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }))
      return next(new BadRequestError('Validation failed', details))
    }

    // req.query is a getter on newer Express versions, so assigning to it can
    // throw. Stash the parsed value where handlers can reach it either way.
    if (source === 'query') {
      req.validatedQuery = result.data
    } else {
      req[source] = result.data
    }
    next()
  }
}
