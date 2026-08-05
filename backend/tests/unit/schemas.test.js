import { describe, it, expect } from 'vitest'

import { signupSchema, loginSchema } from '../../api/auth/auth.schema.js'
import { addItemSchema, updateQtySchema, mergeCartSchema } from '../../api/cart/cart.schema.js'
import { checkoutSchema, updateStatusSchema } from '../../api/order/order.schema.js'
import { updateUserSchema } from '../../api/user/user.schema.js'
import { ORDER_STATUSES } from '../../api/order/order.service.js'

/**
 * The validation schemas.
 *
 * These are the app's front door: the validate middleware replaces the request
 * body with whatever a schema returns, so anything a schema does not declare
 * never reaches a controller, a service, or the database. That makes them a
 * security boundary as much as a data-quality one, and there are two questions
 * to ask of each:
 *
 *   1. Does it accept everything legitimate? (a false rejection is a shopper
 *      who cannot sign up)
 *   2. Does it reject — or strip — everything else? (a false acceptance is a
 *      shopper who made themselves an administrator)
 *
 * Question 2 is the one that gets skipped, so it is tested first in each block.
 */

// A small readability helper. Reads better than digging into result.success at
// every call site, and keeps the intent of each assertion in one line.
const accepts = schema => input => schema.safeParse(input).success
const errorFields = (schema, input) => {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map(issue => issue.path.join('.'))
}

describe('signupSchema', () => {
  const VALID = {
    username: 'shopper1',
    password: 'Passw0rd!',
    fullname: 'Dana Levi',
  }

  it('accepts a legitimate signup', () => {
    // Always assert the happy path first. A schema that rejects everything
    // would pass every negative test in this file.
    expect(accepts(signupSchema)(VALID)).toBe(true)
  })

  describe('privilege escalation', () => {
    /**
     * The reason this schema exists. The old signup handler spread req.body
     * straight into the new user document, so `POST /api/auth/signup` with
     * `{"isAdmin": true}` created an administrator — no exploit needed, just
     * an extra JSON field.
     *
     * Zod strips undeclared keys by default, and the middleware assigns the
     * *parsed* object back over req.body, so the field is gone before any
     * handler runs. These tests assert the strip, not the rejection: the
     * request still succeeds, it just cannot carry the field.
     */
    it('strips isAdmin from the parsed body', () => {
      const { success, data } = signupSchema.safeParse({ ...VALID, isAdmin: true })

      expect(success).toBe(true)
      expect(data).not.toHaveProperty('isAdmin')
    })

    it('strips score, which is server-assigned', () => {
      // The frontend really does send score: 10000 on signup. Honouring it
      // would let anyone set their own balance by editing one request.
      const { data } = signupSchema.safeParse({ ...VALID, score: 999999 })

      expect(data).not.toHaveProperty('score')
    })

    it('strips a client-chosen _id', () => {
      const { data } = signupSchema.safeParse({ ...VALID, _id: 'chosen-by-client' })

      expect(data).not.toHaveProperty('_id')
    })

    it('keeps exactly the declared fields and nothing else', () => {
      // A stronger form of the three tests above: instead of naming the fields
      // an attacker might try, assert the whole allowlist. This one catches
      // fields nobody thought to name.
      const { data } = signupSchema.safeParse({
        ...VALID,
        isAdmin: true,
        score: 999999,
        _id: 'x',
        createdAt: '1999-01-01',
        anything: 'at all',
      })

      expect(Object.keys(data).sort()).toEqual(['fullname', 'password', 'username'])
    })
  })

  describe('username boundaries', () => {
    /**
     * Boundary value analysis on min(3) / max(40): test 2/3 and 40/41. The
     * value in the middle proves nothing that the endpoints do not.
     */
    it.each([
      ['2 characters (one short)', 'ab', false],
      ['3 characters (the minimum)', 'abc', true],
      ['40 characters (the maximum)', 'a'.repeat(40), true],
      ['41 characters (one over)', 'a'.repeat(41), false],
    ])('%s → accepted: %s', (_label, username, expected) => {
      expect(accepts(signupSchema)({ ...VALID, username })).toBe(expected)
    })

    it('trims before measuring length', () => {
      // Order matters. If length were checked before trimming, "  ab  " would
      // pass as 6 characters and then be stored as a 2-character username —
      // shorter than the rule the database and the UI both assume.
      const { success, data } = signupSchema.safeParse({ ...VALID, username: '  shopper1  ' })

      expect(success).toBe(true)
      expect(data.username).toBe('shopper1')
      expect(accepts(signupSchema)({ ...VALID, username: '  ab  ' })).toBe(false)
    })

    it('rejects a non-string username', () => {
      // JSON can carry any type. Without a type check, a number or an object
      // would reach the Mongo query as-is — the same shape of hole as the
      // operator injection guarded against in query.util.
      expect(accepts(signupSchema)({ ...VALID, username: 12345 })).toBe(false)
      expect(accepts(signupSchema)({ ...VALID, username: { $ne: null } })).toBe(false)
      expect(accepts(signupSchema)({ ...VALID, username: null })).toBe(false)
    })
  })

  describe('password boundaries', () => {
    it.each([
      ['7 characters (one short)', 'a'.repeat(7), false],
      ['8 characters (the minimum)', 'a'.repeat(8), true],
      ['200 characters (the maximum)', 'a'.repeat(200), true],
      ['201 characters (one over)', 'a'.repeat(201), false],
    ])('%s → accepted: %s', (_label, password, expected) => {
      expect(accepts(signupSchema)({ ...VALID, password })).toBe(expected)
    })

    it('does not trim the password', () => {
      // Deliberately different from username. Spaces are legal password
      // characters, and silently trimming them means a password that works at
      // signup and fails at login. Note the absence of .trim() in the schema.
      const { data } = signupSchema.safeParse({ ...VALID, password: '  spaced  ' })

      expect(data.password).toBe('  spaced  ')
    })

    it('has an upper bound at all', () => {
      // Not a style rule — a denial-of-service guard. bcrypt cost scales with
      // input, so an unbounded password field is a way to make the server burn
      // CPU on demand. 200 characters is the ceiling; a megabyte is refused
      // before it ever reaches the hashing call.
      expect(accepts(signupSchema)({ ...VALID, password: 'a'.repeat(100_000) })).toBe(false)
    })
  })

  describe('optional fields', () => {
    it('accepts a signup with no imgUrl', () => {
      expect(accepts(signupSchema)(VALID)).toBe(true)
    })

    it('accepts a valid imgUrl', () => {
      expect(accepts(signupSchema)({ ...VALID, imgUrl: 'https://example.com/a.png' })).toBe(true)
    })

    it('rejects an imgUrl that is not a URL', () => {
      // This value is rendered into an <img src> for every other shopper who
      // sees the user, so "any string" is not good enough.
      expect(accepts(signupSchema)({ ...VALID, imgUrl: 'not-a-url' })).toBe(false)
    })
  })

  it('reports every invalid field at once, not just the first', () => {
    // A form that surfaces one error per submission makes a shopper submit
    // four times to learn four rules. Zod collects all issues, and the
    // middleware maps them into a details array — asserted here so that
    // behaviour is not lost in a future refactor of the error path.
    const fields = errorFields(signupSchema, { username: 'a', password: 'b', fullname: 'c' })

    expect(fields).toEqual(expect.arrayContaining(['username', 'password', 'fullname']))
    expect(fields).toHaveLength(3)
  })
})

describe('loginSchema', () => {
  it('accepts a username and password', () => {
    expect(accepts(loginSchema)({ username: 'shopper1', password: 'Passw0rd!' })).toBe(true)
  })

  it('does not apply the signup length rules', () => {
    /**
     * Deliberately looser than signupSchema, and the reason is worth knowing.
     *
     * If login enforced "password must be 8+ characters", then a 7-character
     * attempt would be rejected before any lookup — and the difference between
     * that response and a normal wrong-password response tells an attacker
     * something about the password rules. It also breaks every account created
     * before the rule tightened. Login's only job is "is this the right pair",
     * so it checks presence and nothing more.
     */
    expect(accepts(loginSchema)({ username: 'ab', password: 'short' })).toBe(true)
  })

  it.each([
    ['missing password', { username: 'shopper1' }],
    ['missing username', { password: 'Passw0rd!' }],
    ['empty username', { username: '', password: 'Passw0rd!' }],
    ['empty password', { username: 'shopper1', password: '' }],
    ['whitespace-only username', { username: '   ', password: 'Passw0rd!' }],
  ])('rejects %s', (_label, input) => {
    expect(accepts(loginSchema)(input)).toBe(false)
  })

  it('rejects an object where a username string is expected', () => {
    // The textbook NoSQL auth bypass: `{"username": {"$ne": null}}` matches the
    // first user in the collection. The type check is what stops it.
    expect(accepts(loginSchema)({ username: { $ne: null }, password: 'x' })).toBe(false)
  })
})

describe('addItemSchema', () => {
  const VALID = { productId: 'p1001' }

  it('accepts a bare productId and defaults the quantity to 1', () => {
    // "Add to cart" with no quantity control is the common case, so the
    // default is load-bearing rather than cosmetic.
    const { success, data } = addItemSchema.safeParse(VALID)

    expect(success).toBe(true)
    expect(data.quantity).toBe(1)
  })

  it('ignores a client-supplied price', () => {
    /**
     * The classic storefront vulnerability: POST a cart line with your own
     * price and check out at it. The schema declares no price field, so it is
     * stripped here; cart.service then resolves the real price from the
     * catalogue on every read and again at checkout.
     *
     * Two independent defences, and this asserts the first one.
     */
    const { data } = addItemSchema.safeParse({ ...VALID, price: 0.01, salePrice: 0.01 })

    expect(data).not.toHaveProperty('price')
    expect(data).not.toHaveProperty('salePrice')
  })

  describe('quantity boundaries', () => {
    it.each([
      ['0', 0, false],
      ['1 (the minimum)', 1, true],
      ['99 (the maximum)', 99, true],
      ['100 (one over)', 100, false],
      ['negative', -1, false],
    ])('%s → accepted: %s', (_label, quantity, expected) => {
      expect(accepts(addItemSchema)({ ...VALID, quantity })).toBe(expected)
    })

    it('rejects a fractional quantity', () => {
      // You cannot buy 1.5 frying pans. Without .int() this would reach the
      // line total as a float and produce a price nobody can reconcile.
      expect(accepts(addItemSchema)({ ...VALID, quantity: 1.5 })).toBe(false)
    })

    it('rejects a numeric string', () => {
      /**
       * Strict on purpose, and worth knowing about: `{"quantity": "2"}` is
       * refused rather than coerced. A JSON body can carry a real number, so
       * requiring one is reasonable — but React inputs hand back strings, so
       * any component that forwards an input value straight to the API will
       * get a 400. The contract is documented here so that failure is
       * recognisable when it happens.
       */
      expect(accepts(addItemSchema)({ ...VALID, quantity: '2' })).toBe(false)
    })
  })

  describe('productId', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
      ['missing', undefined],
      ['an object', { $ne: null }],
      ['a number', 1001],
    ])('rejects %s', (_label, productId) => {
      expect(accepts(addItemSchema)({ productId })).toBe(false)
    })

    it('accepts both live id forms', () => {
      // Mirrors byIdOrSku. If the schema accepted only one form, the fallback
      // in the service would be unreachable and old carts would 400.
      expect(accepts(addItemSchema)({ productId: 'p1001' })).toBe(true)
      expect(accepts(addItemSchema)({ productId: '507f1f77bcf86cd799439011' })).toBe(true)
    })
  })

  describe('variant', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['size only', { size: 'M' }],
      ['colour only', { color: 'red' }],
      ['both', { size: 'M', color: 'red' }],
      ['empty object', {}],
    ])('accepts %s', (_label, variant) => {
      expect(accepts(addItemSchema)({ ...VALID, variant })).toBe(true)
    })

    it('strips unknown variant fields', () => {
      // Closes off the variant object as an escape hatch. Without this, an
      // undeclared key inside `variant` would ride past the top-level
      // allowlist and reach the stored cart line.
      const { data } = addItemSchema.safeParse({
        ...VALID,
        variant: { size: 'M', price: 0.01, isAdmin: true },
      })

      expect(data.variant).toEqual({ size: 'M' })
    })

    it('bounds the length of variant values', () => {
      // Variant values are stored on the cart line and echoed back on the
      // order. Unbounded, they are free storage and a place to park a payload.
      expect(accepts(addItemSchema)({ ...VALID, variant: { size: 'a'.repeat(40) } })).toBe(true)
      expect(accepts(addItemSchema)({ ...VALID, variant: { size: 'a'.repeat(41) } })).toBe(false)
    })
  })
})

describe('updateQtySchema', () => {
  it.each([
    ['0 (means remove the line)', 0, true],
    ['1', 1, true],
    ['99 (the maximum)', 99, true],
    ['100 (one over)', 100, false],
    ['negative', -1, false],
  ])('%s → accepted: %s', (_label, quantity, expected) => {
    expect(accepts(updateQtySchema)({ quantity })).toBe(expected)
  })

  it('allows zero here but not on add', () => {
    /**
     * The asymmetry is intentional and easy to "correct" by accident.
     *
     * Adding zero of something is meaningless, so addItemSchema requires 1+.
     * Updating to zero is how the cart's stepper removes a line — updateItemQty
     * forwards to removeItem when quantity <= 0. Aligning the two schemas
     * would break the minus button on the last unit.
     */
    expect(accepts(updateQtySchema)({ quantity: 0 })).toBe(true)
    expect(accepts(addItemSchema)({ productId: 'p1001', quantity: 0 })).toBe(false)
  })

  it('requires the quantity, with no default', () => {
    // Unlike addItem, there is no sensible default for "set it to …".
    expect(accepts(updateQtySchema)({})).toBe(false)
  })
})

describe('mergeCartSchema', () => {
  const line = { productId: 'p1001', quantity: 1 }

  it('defaults to an empty list', () => {
    // Sign-in calls merge unconditionally, including for a shopper who never
    // put anything in a guest cart. That must not be a 400.
    const { success, data } = mergeCartSchema.safeParse({})

    expect(success).toBe(true)
    expect(data.items).toEqual([])
  })

  it.each([
    ['100 items (the maximum)', 100, true],
    ['101 items (one over)', 101, false],
  ])('%s → accepted: %s', (_label, count, expected) => {
    const items = Array.from({ length: count }, () => ({ ...line }))

    expect(accepts(mergeCartSchema)({ items })).toBe(expected)
  })

  it('caps the list to bound the work one request can cause', () => {
    /**
     * The cap is the point. merge() loops over the list calling addItem, and
     * every addItem is a product lookup plus a cart write. Without a ceiling,
     * one request with 100,000 lines is 200,000 database round-trips — a
     * denial of service that needs no special tooling, just a big JSON body.
     *
     * Rate limiting alone would not help: this is one request.
     */
    const items = Array.from({ length: 5000 }, () => ({ ...line }))

    expect(accepts(mergeCartSchema)({ items })).toBe(false)
  })

  it('validates each line, not just the list', () => {
    // A malformed line in position 40 must fail the request rather than be
    // skipped — otherwise the shopper silently loses that pick at sign-in.
    expect(accepts(mergeCartSchema)({ items: [line, { productId: '' }] })).toBe(false)
    expect(accepts(mergeCartSchema)({ items: [line, { productId: 'p2', quantity: 0 }] })).toBe(false)
  })

  it('points at the offending line in the error path', () => {
    // Zod paths carry the array index, which is what makes a merge failure
    // debuggable at all when a shopper reports "sign-in broke my cart".
    const fields = errorFields(mergeCartSchema, { items: [line, { productId: '' }] })

    expect(fields).toContain('items.1.productId')
  })
})

describe('checkoutSchema', () => {
  const VALID = {
    shippingAddress: {
      fullname: 'Dana Levi',
      phone: '050-1234567',
      city: 'תל אביב',
      street: 'דיזנגוף',
      houseNumber: '12',
    },
  }

  it('accepts a complete address', () => {
    expect(accepts(checkoutSchema)(VALID)).toBe(true)
  })

  it('ignores client-supplied items and totals', () => {
    /**
     * The highest-stakes strip in the codebase. The order is built from the
     * server-side cart and priced from the catalogue; if a client could name
     * the items or the totals, checkout would be a form for choosing what to
     * pay. Neither field is declared, so both disappear here.
     */
    const { success, data } = checkoutSchema.safeParse({
      ...VALID,
      items: [{ productId: 'p1001', quantity: 100, unitPrice: 0.01 }],
      totals: { total: 0.01, shipping: 0 },
      status: 'delivered',
    })

    expect(success).toBe(true)
    expect(Object.keys(data).sort()).toEqual([
      'notes',
      'paymentMethod',
      'shippingAddress',
    ])
  })

  describe('phone number', () => {
    it.each([
      ['Israeli mobile with hyphens', '050-1234567'],
      ['international with spaces', '+972 50 123 4567'],
      ['with parentheses', '(050) 1234567'],
      ['plain digits', '0501234567'],
    ])('accepts %s', (_label, phone) => {
      // Equivalence partitioning on format rather than on validity: these are
      // the shapes real people type. A stricter pattern would reject paying
      // customers, which costs more than a slightly loose field.
      expect(accepts(checkoutSchema)({ ...VALID, shippingAddress: { ...VALID.shippingAddress, phone } })).toBe(true)
    })

    it.each([
      ['letters', '050-CALL-ME'],
      ['a script tag', '<script>alert(1)</script>'],
      ['8 characters (one under the minimum)', '05012345'],
      ['21 characters (one over the maximum)', '0'.repeat(21)],
      ['empty', ''],
    ])('rejects %s', (_label, phone) => {
      expect(accepts(checkoutSchema)({ ...VALID, shippingAddress: { ...VALID.shippingAddress, phone } })).toBe(false)
    })

    it('is the field a courier has to be able to dial', () => {
      // Framing the rule in terms of its purpose: 9 characters is the shortest
      // dialable Israeli number, so shorter is not "strict validation", it is
      // an undeliverable order.
      expect(accepts(checkoutSchema)({ ...VALID, shippingAddress: { ...VALID.shippingAddress, phone: '021234567' } })).toBe(true)
    })
  })

  describe('required address fields', () => {
    it.each(['fullname', 'phone', 'city', 'street'])('requires %s', field => {
      const shippingAddress = { ...VALID.shippingAddress }
      delete shippingAddress[field]

      expect(accepts(checkoutSchema)({ ...VALID, shippingAddress })).toBe(false)
    })

    it.each(['houseNumber', 'floor', 'apartment', 'zip'])('allows %s to be absent', field => {
      const shippingAddress = { ...VALID.shippingAddress }
      delete shippingAddress[field]

      expect(accepts(checkoutSchema)({ ...VALID, shippingAddress })).toBe(true)
    })

    it('rejects a missing address entirely', () => {
      expect(accepts(checkoutSchema)({})).toBe(false)
    })

    it('accepts Hebrew city and street names', () => {
      // Worth an explicit test rather than an assumption: a length rule written
      // against ASCII, or a regex anchored to [a-z], would reject the entire
      // customer base of a Hebrew storefront.
      expect(accepts(checkoutSchema)(VALID)).toBe(true)
    })
  })

  describe('paymentMethod', () => {
    it('defaults to simulated', () => {
      const { data } = checkoutSchema.safeParse(VALID)

      expect(data.paymentMethod).toBe('simulated')
    })

    it.each(['simulated', 'card', 'cash'])('accepts %s', paymentMethod => {
      expect(accepts(checkoutSchema)({ ...VALID, paymentMethod })).toBe(true)
    })

    it('rejects an unknown method', () => {
      // An allowlist, not a string field. Anything outside it would reach the
      // stored order's payment record and mean nothing to whoever reads it.
      expect(accepts(checkoutSchema)({ ...VALID, paymentMethod: 'bitcoin' })).toBe(false)
      expect(accepts(checkoutSchema)({ ...VALID, paymentMethod: 'free' })).toBe(false)
    })
  })

  describe('notes', () => {
    it('defaults to an empty string', () => {
      const { data } = checkoutSchema.safeParse(VALID)

      expect(data.notes).toBe('')
    })

    it.each([
      ['500 characters (the maximum)', 500, true],
      ['501 characters (one over)', 501, false],
    ])('%s → accepted: %s', (_label, length, expected) => {
      expect(accepts(checkoutSchema)({ ...VALID, notes: 'a'.repeat(length) })).toBe(expected)
    })
  })
})

describe('updateStatusSchema', () => {
  it.each(ORDER_STATUSES)('accepts the %s status', status => {
    // Driven off the exported constant rather than a copied list. If a status
    // is added to the service, this test covers it automatically — a hardcoded
    // list here would go stale silently.
    expect(accepts(updateStatusSchema)({ status })).toBe(true)
  })

  it.each([
    ['a status that does not exist', 'refunded'],
    ['the wrong case', 'PAID'],
    ['empty', ''],
    ['an object', { $ne: null }],
  ])('rejects %s', (_label, status) => {
    expect(accepts(updateStatusSchema)({ status })).toBe(false)
  })

  it('requires a status', () => {
    expect(accepts(updateStatusSchema)({})).toBe(false)
  })

  it('does not enforce which transitions are legal', () => {
    /**
     * A gap, recorded rather than hidden. The schema checks that a status is
     * one of the five; it does not check that the move makes sense — a
     * delivered order can be set back to pending, and a cancelled one can be
     * marked shipped.
     *
     * That is stage 11's order state machine. Writing the test now means the
     * gap is visible in the suite instead of living only in a plan document.
     */
    expect(accepts(updateStatusSchema)({ status: 'pending' })).toBe(true)
  })
})

describe('updateUserSchema', () => {
  it('accepts a profile edit', () => {
    expect(accepts(updateUserSchema)({ fullname: 'Dana Levi-Cohen' })).toBe(true)
  })

  it.each(['isAdmin', 'password', 'username'])('strips %s', field => {
    /**
     * Three separate escalations through one endpoint:
     *   isAdmin  — become an administrator
     *   password — change your password without proving the old one, which
     *              also means an account-takeover finishes the job silently
     *   username — take over an identity, and sidestep the unique index check
     *              that only runs on the signup path
     *
     * None are declared, so all three are dropped.
     */
    const { success, data } = updateUserSchema.safeParse({
      fullname: 'Dana Levi',
      [field]: field === 'isAdmin' ? true : 'attacker-value',
    })

    expect(success).toBe(true)
    expect(data).not.toHaveProperty(field)
  })

  it('declares score, which the controller gates on admin', () => {
    /**
     * The one field that is accepted by the schema but must still be refused
     * for most callers. A schema cannot make this call — it sees the body, not
     * who sent it — so the authorisation check lives in the controller.
     *
     * This test only proves the schema's half. That an ordinary shopper cannot
     * actually raise their own score is a question about the running endpoint,
     * and it gets an API test in stage 4. Worth being explicit about which
     * half of a rule a given test covers.
     */
    const { data } = updateUserSchema.safeParse({ score: 5000 })

    expect(data.score).toBe(5000)
  })

  it('bounds score to a sane range even for an admin', () => {
    expect(accepts(updateUserSchema)({ score: -1 })).toBe(false)
    expect(accepts(updateUserSchema)({ score: 0 })).toBe(true)
    expect(accepts(updateUserSchema)({ score: 1_000_000 })).toBe(true)
    expect(accepts(updateUserSchema)({ score: 1_000_001 })).toBe(false)
    expect(accepts(updateUserSchema)({ score: 10.5 })).toBe(false)
  })

  it('accepts an empty update', () => {
    // Every field is optional, so `{}` parses. Harmless — the service writes
    // nothing — but stated so nobody assumes a guard exists here.
    expect(accepts(updateUserSchema)({})).toBe(true)
  })
})
