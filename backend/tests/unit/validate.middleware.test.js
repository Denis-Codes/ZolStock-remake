import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'

import { validate } from '../../middlewares/validate.middleware.js'
import { BadRequestError } from '../../middlewares/error.middleware.js'
import { signupSchema } from '../../api/auth/auth.schema.js'
import { checkoutSchema } from '../../api/order/order.schema.js'

/**
 * The validate middleware.
 *
 * The schemas are tested separately; this file tests the piece that *applies*
 * them. That split matters — a perfect schema is worthless if the middleware
 * checks the body and then hands the original, unstripped object to the
 * controller anyway. "Validated" and "sanitised" are different guarantees, and
 * only the second one stops mass assignment.
 *
 * Express middleware is just a function of (req, res, next), so none of this
 * needs a server, a port, or supertest. The fakes below are the whole harness.
 */

// Minimal stand-ins. Deliberately not a mocking library: a plain object is
// easier to read, and anything the middleware touches that is not here would
// throw loudly rather than silently return undefined.
const fakeReq = (overrides = {}) => ({ body: {}, query: {}, params: {}, ...overrides })
const fakeRes = () => ({})

/** Runs the middleware and returns whatever it passed to next(). */
function run(middleware, req) {
  const next = vi.fn()
  middleware(req, fakeRes(), next)
  return { next, error: next.mock.calls[0]?.[0] }
}

describe('on a valid request', () => {
  const schema = z.object({ name: z.string().min(1) })

  it('calls next with no argument', () => {
    // Express treats next(anything) as an error. Passing even a truthy
    // placeholder here would route every valid request to the error handler.
    const { next } = run(validate(schema), fakeReq({ body: { name: 'Dana' } }))

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  it('replaces the body with the parsed result', () => {
    /**
     * The core behaviour, and the reason this middleware is a security control
     * rather than a convenience.
     *
     * safeParse returns a NEW object containing only the schema's declared
     * keys. Assigning it over req.body is what makes the stripping real — a
     * version that only *checked* the body and left it in place would pass
     * every schema test in this repo and still let `isAdmin: true` through to
     * the database.
     */
    const req = fakeReq({ body: { name: 'Dana', isAdmin: true, score: 999 } })
    run(validate(schema), req)

    expect(req.body).toEqual({ name: 'Dana' })
    expect(req.body).not.toHaveProperty('isAdmin')
  })

  it('writes schema defaults into the body', () => {
    // Not just subtraction — a schema also adds. Downstream code can rely on
    // quantity or paymentMethod existing because the middleware put it there.
    const withDefault = z.object({ quantity: z.number().default(1) })
    const req = fakeReq({ body: {} })

    run(validate(withDefault), req)

    expect(req.body.quantity).toBe(1)
  })

  it('applies transforms such as trim', () => {
    const req = fakeReq({ body: { name: '  Dana  ' } })

    run(validate(z.object({ name: z.string().trim() })), req)

    expect(req.body.name).toBe('Dana')
  })
})

describe('on an invalid request', () => {
  const schema = z.object({ name: z.string().min(3) })

  it('passes a BadRequestError to next rather than throwing', () => {
    /**
     * Throwing synchronously from a middleware happens to work in Express 4,
     * but calling next(err) is the contract — and it is the only form that
     * behaves the same once the middleware is ever awaited. Everything else in
     * the app funnels through the same error handler, which is what makes
     * every failure response the same JSON shape.
     */
    const { error } = run(validate(schema), fakeReq({ body: { name: 'ab' } }))

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.status).toBe(400)
  })

  it('marks the error as operational so no stack trace reaches the client', () => {
    // errorHandler only echoes err.message when isOperational is set; anything
    // else becomes a generic "Internal server error". A validation failure is
    // the client's fault and safe to describe, so it must carry the flag.
    const { error } = run(validate(schema), fakeReq({ body: { name: 'ab' } }))

    expect(error.isOperational).toBe(true)
  })

  it('reports every failing field, each with its own message', () => {
    // The shape the frontend renders next to each input. Asserting the whole
    // array rather than its length pins the contract the form depends on.
    const { error } = run(
      validate(signupSchema),
      fakeReq({ body: { username: 'a', password: 'b', fullname: 'c' } })
    )

    expect(error.details).toHaveLength(3)
    expect(error.details).toEqual(
      expect.arrayContaining([
        { field: 'username', message: 'Username must be at least 3 characters' },
        { field: 'password', message: 'Password must be at least 8 characters' },
        { field: 'fullname', message: 'Full name must be at least 2 characters' },
      ])
    )
  })

  it('flattens a nested path into a dotted field name', () => {
    // Zod reports paths as arrays: ['shippingAddress', 'phone']. The frontend
    // needs a key it can match against an input name, so the middleware joins
    // them. Without the join, `details[0].field` would be the string
    // "shippingAddress,phone" and no field would ever highlight.
    const { error } = run(
      validate(checkoutSchema),
      fakeReq({
        body: {
          shippingAddress: { fullname: 'Dana Levi', phone: 'abc', city: 'תל אביב', street: 'דיזנגוף' },
        },
      })
    )

    expect(error.details[0].field).toBe('shippingAddress.phone')
  })

  it('names the source when the failure is not attached to a field', () => {
    // `path` is empty when the whole body is the wrong type — e.g. a JSON
    // array posted where an object is expected. `|| source` keeps the details
    // entry from carrying an empty string the UI cannot place.
    const { error } = run(validate(z.object({ name: z.string() })), fakeReq({ body: [] }))

    expect(error.details[0].field).toBe('body')
  })

  it('leaves the request body untouched when validation fails', () => {
    // Nothing downstream should see a half-parsed body. The handler chain
    // stops here anyway, but error-logging middleware further along still
    // reads req.body — and it should see what the client actually sent.
    const req = fakeReq({ body: { name: 'ab' } })
    run(validate(schema), req)

    expect(req.body).toEqual({ name: 'ab' })
  })

  it('does not call next twice', () => {
    // A double next() in Express produces "Cannot set headers after they are
    // sent" — an error that surfaces far from its cause and is miserable to
    // trace. Cheap to rule out here.
    const { next } = run(validate(schema), fakeReq({ body: { name: 'ab' } }))

    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('validating other parts of the request', () => {
  const schema = z.object({ status: z.enum(['pending', 'paid']) })

  it('writes a parsed query to validatedQuery instead of overwriting req.query', () => {
    /**
     * A framework quirk with real consequences.
     *
     * On newer Express versions req.query is a getter with no setter, so
     * `req.query = parsed` throws a TypeError — inside a middleware, on every
     * request, at whatever moment the dependency is upgraded. Writing to a
     * separate property sidesteps it entirely.
     *
     * The trade-off is that handlers must read req.validatedQuery, not
     * req.query. That is a footgun, so it is asserted in both directions: the
     * parsed value lands where handlers look, and req.query is left alone so a
     * handler that forgets gets the raw value rather than a crash.
     */
    const req = fakeReq({ query: { status: 'paid', extra: 'dropped' } })

    run(validate(schema, 'query'), req)

    expect(req.validatedQuery).toEqual({ status: 'paid' })
    expect(req.query).toEqual({ status: 'paid', extra: 'dropped' })
  })

  it('reports query failures against the query source', () => {
    const req = fakeReq({ query: { status: 'refunded' } })
    const { error } = run(validate(schema, 'query'), req)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.details[0].field).toBe('status')
    expect(req.validatedQuery).toBeUndefined()
  })

  it('replaces params in place, since params has no getter problem', () => {
    const req = fakeReq({ params: { id: 'p1001', injected: 'x' } })

    run(validate(z.object({ id: z.string() }), 'params'), req)

    expect(req.params).toEqual({ id: 'p1001' })
  })

  it('defaults to the body when no source is given', () => {
    const req = fakeReq({ body: { status: 'paid' }, query: { status: 'pending' } })

    run(validate(schema), req)

    expect(req.body).toEqual({ status: 'paid' })
    expect(req.validatedQuery).toBeUndefined()
  })
})

describe('the middleware is reusable', () => {
  it('returns a fresh function per call, holding no state between requests', () => {
    /**
     * validate() is called once at route-definition time and the function it
     * returns handles every request for that route, forever. If it closed over
     * anything mutable, one shopper's data would leak into another's request —
     * the worst class of bug in a server, and one that only appears under
     * concurrency where it is nearly impossible to reproduce.
     *
     * The check is simple: run the same middleware instance twice with
     * different input and confirm the second result owes nothing to the first.
     */
    const middleware = validate(z.object({ name: z.string().min(1) }))

    const first = fakeReq({ body: { name: 'Dana', secret: 'a' } })
    const second = fakeReq({ body: { name: 'Yossi', secret: 'b' } })

    run(middleware, first)
    run(middleware, second)

    expect(first.body).toEqual({ name: 'Dana' })
    expect(second.body).toEqual({ name: 'Yossi' })
  })
})
