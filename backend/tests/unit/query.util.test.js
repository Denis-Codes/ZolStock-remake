import { describe, it, expect } from 'vitest'
import { ObjectId } from 'mongodb'

import {
  escapeRegex,
  isObjectIdLike,
  byIdOrSku,
  toNumber,
  toBoolean,
} from '../../services/query.util.js'

/**
 * query.util.js is the translation layer between untrusted text off the wire
 * and a MongoDB query object. Every function here takes something a stranger
 * typed and turns it into something the database will act on, which makes this
 * the highest-value file in the codebase per line of test.
 *
 * Nothing here touches the database, the network, or the clock — so the whole
 * file runs in single-digit milliseconds and can run on every keystroke.
 */

describe('escapeRegex', () => {
  /**
   * Equivalence partitioning: the input space splits into "contains regex
   * metacharacters" and "does not". Rather than pick one representative from
   * the first partition, the metacharacters are enumerated — there are only
   * twelve, and each one is a separate way the function can be wrong.
   */
  const METACHARACTERS = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']

  it.each(METACHARACTERS)('escapes %s so it matches itself literally', char => {
    const escaped = escapeRegex(char)
    const re = new RegExp(escaped)

    // The real assertion is not "a backslash appeared" — that would be testing
    // the implementation. It is "the pattern now matches the literal character
    // and nothing else", which is the behaviour callers depend on.
    expect(re.test(char)).toBe(true)
  })

  it('does not throw on input that would be an invalid regex', () => {
    // A shopper typing "(" into the search box. Before escaping, this reached
    // new RegExp() unbalanced and threw a SyntaxError inside the request —
    // a 500 caused entirely by a keystroke.
    expect(() => new RegExp(escapeRegex('('))).not.toThrow()
    expect(() => new RegExp(escapeRegex('['))).not.toThrow()
    expect(() => new RegExp(escapeRegex('a{2,'))).not.toThrow()
  })

  it('defuses the classic ReDoS payload', () => {
    // "(a+)+$" against a long non-matching string is catastrophic backtracking:
    // the engine tries exponentially many ways to split the a's. On the real
    // server that pins the event loop and every other request waits behind it.
    //
    // Escaped, the pattern is 6 literal characters. It cannot backtrack at all,
    // so the search below is linear no matter how long the haystack is.
    const payload = '(a+)+$'
    const re = new RegExp(escapeRegex(payload))

    expect(re.test('(a+)+$')).toBe(true)
    expect(re.test('a'.repeat(5000))).toBe(false)
  })

  it('stays linear on the input that would otherwise hang', () => {
    // A timing assertion, used sparingly and with a wide margin. The escaped
    // pattern takes microseconds; the unescaped one takes minutes. Any bound
    // between those two numbers proves the point, so 1000ms is chosen to be
    // impossible to fail on a slow CI runner for any reason except a genuine
    // regression back to an unescaped pattern.
    const re = new RegExp(escapeRegex('(a+)+$'))
    const haystack = 'a'.repeat(40) + '!'

    const started = performance.now()
    re.test(haystack)
    expect(performance.now() - started).toBeLessThan(1000)
  })

  it('leaves ordinary search text untouched', () => {
    // The negative half of the contract. An over-eager escaper that mangled
    // normal input would break every search while passing all the tests above.
    expect(escapeRegex('frying pan')).toBe('frying pan')
    expect(escapeRegex('מחבת')).toBe('מחבת')
    expect(escapeRegex('30-40')).toBe('30-40')
  })

  it('handles absent input without throwing', () => {
    // Reached whenever the query string omits ?txt. A function that assumed a
    // string here would 500 on the storefront's own default request.
    expect(escapeRegex()).toBe('')
    expect(escapeRegex(undefined)).toBe('')
  })

  it('does not treat null the same as undefined', () => {
    /**
     * Written expecting '' and corrected after the test failed — which is the
     * useful outcome, not a detour.
     *
     * A default parameter (`str = ''`) fires only for undefined. null is a
     * value, so it reaches String(null) and comes back as the four-character
     * word "null". Not reachable from a request today (the controller sends
     * `query.txt || ''`, which turns null into ''), and harmless if it were —
     * a search for "null" simply matches nothing.
     *
     * Recorded because "the default handles missing input" is a belief a lot
     * of JavaScript is written on, and it is only half true.
     */
    expect(escapeRegex(null)).toBe('null')
    expect(escapeRegex(0)).toBe('0')
    expect(escapeRegex(false)).toBe('false')
  })
})

describe('isObjectIdLike', () => {
  const VALID_HEX = '507f1f77bcf86cd799439011'

  it('accepts a 24-character hex string', () => {
    expect(isObjectIdLike(VALID_HEX)).toBe(true)
  })

  it('accepts uppercase hex', () => {
    // Mongo renders ids lowercase, but ids get copied out of logs and admin
    // tools that upper-case them. Rejecting these would 404 a valid product.
    expect(isObjectIdLike(VALID_HEX.toUpperCase())).toBe(true)
  })

  it('accepts an ObjectId instance via string coercion', () => {
    expect(isObjectIdLike(new ObjectId(VALID_HEX))).toBe(true)
  })

  /**
   * Boundary value analysis on length. The rule is "exactly 24", so the values
   * that matter are 23, 24 and 25 — not 5 and 100. Off-by-one is the error the
   * boundary exists to catch; a 5-character string would be rejected by almost
   * any wrong implementation too, so it proves less.
   */
  it.each([
    ['23 chars (one short)', '507f1f77bcf86cd79943901'],
    ['25 chars (one over)', '507f1f77bcf86cd7994390111'],
  ])('rejects %s', (_label, id) => {
    expect(isObjectIdLike(id)).toBe(false)
  })

  it('rejects 24 characters that are not all hex', () => {
    // Right length, wrong alphabet. ObjectId.createFromHexString() throws on
    // this, so if the guard passed it the request would 500 instead of 404.
    expect(isObjectIdLike('507f1f77bcf86cd79943901z')).toBe(false)
    expect(isObjectIdLike('gggggggggggggggggggggggg')).toBe(false)
  })

  it('rejects the legacy sku format', () => {
    expect(isObjectIdLike('p1001')).toBe(false)
  })

  it.each([undefined, null, '', 0, false])('rejects %s', value => {
    expect(isObjectIdLike(value)).toBe(false)
  })
})

describe('byIdOrSku', () => {
  const VALID_HEX = '507f1f77bcf86cd799439011'

  it('builds an _id criteria for an ObjectId hex string', () => {
    const criteria = byIdOrSku(VALID_HEX)

    expect(criteria).toHaveProperty('_id')
    expect(criteria._id).toBeInstanceOf(ObjectId)
    // Assert the round trip, not just the type. A criteria holding the *wrong*
    // ObjectId is the failure that would silently return someone else's data.
    expect(criteria._id.toHexString()).toBe(VALID_HEX)
    expect(criteria).not.toHaveProperty('sku')
  })

  it('builds a sku criteria for a legacy product id', () => {
    // Why this branch exists at all: product URLs already shared, and carts
    // already sitting in shoppers' localStorage, reference "p1001". Dropping
    // the fallback would 404 every one of them.
    expect(byIdOrSku('p1001')).toEqual({ sku: 'p1001' })
  })

  it('coerces a non-string id to a string sku', () => {
    expect(byIdOrSku(1001)).toEqual({ sku: '1001' })
  })

  it('never lets a Mongo operator through as a criteria value', () => {
    /**
     * NoSQL injection. Express parses `?id[$ne]=null` into an *object*, and if
     * that object reached the query unchanged the criteria would become
     * { sku: { $ne: null } } — "any product whose sku is not null", i.e. the
     * whole catalogue, from an endpoint meant to return exactly one document.
     *
     * String(...) collapses it to the harmless literal '[object Object]'.
     * This test exists to make sure a future refactor that drops the String()
     * call fails loudly instead of quietly opening the hole.
     */
    const criteria = byIdOrSku({ $ne: null })

    expect(typeof criteria.sku).toBe('string')
    expect(criteria.sku).toBe('[object Object]')
  })

  it('documents that a missing id becomes an unmatchable sku', () => {
    // GET /api/product/undefined resolves to { sku: 'undefined' }, which
    // matches nothing and 404s. That is the right outcome, but it happens by
    // accident rather than by a guard — pinned here so that if someone later
    // adds an explicit check, this test tells them what they are changing.
    expect(byIdOrSku(undefined)).toEqual({ sku: 'undefined' })
    expect(byIdOrSku(null)).toEqual({ sku: 'null' })
  })
})

describe('toNumber', () => {
  /**
   * Query strings are always text. Every one of these cases is a URL a real
   * client can produce, and the function's whole job is deciding which of them
   * mean "the caller supplied a number" and which mean "the caller supplied
   * nothing usable".
   */
  it.each([
    ['10', 10],
    ['0', 0],
    ['-5', -5],
    ['29.99', 29.99],
    ['1e3', 1000],
    [42, 42],
  ])('reads %s as %s', (input, expected) => {
    expect(toNumber(input)).toBe(expected)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['non-numeric text', 'abc'],
    ['a number with a suffix', '12abc'],
    ['Infinity', 'Infinity'],
    ['NaN', 'NaN'],
  ])('reads %s as null', (_label, input) => {
    expect(toNumber(input)).toBeNull()
  })

  it('distinguishes zero from absent', () => {
    // The single most important assertion in this describe block. `?minPrice=0`
    // is a legitimate filter, and any implementation using a plain falsy check
    // (`if (num)`) would treat it as absent and drop the filter. Zero is a
    // value; null means the caller said nothing.
    expect(toNumber('0')).toBe(0)
    expect(toNumber('')).toBeNull()
    expect(toNumber('0')).not.toBeNull()
  })

  it('documents that whitespace reads as zero', () => {
    // `?minPrice=%20` is not the empty string, so the early return misses it,
    // and +' ' is 0 in JavaScript. Harmless today — a ₪0 floor filters nothing.
    // Recorded so the behaviour is a known quantity rather than a surprise.
    expect(toNumber(' ')).toBe(0)
  })
})

describe('toBoolean', () => {
  it.each([
    ['true', true],
    ['false', false],
    [true, true],
    [false, false],
  ])('reads %s as %s', (input, expected) => {
    expect(toBoolean(input)).toBe(expected)
  })

  it('reads the string "false" as false, not as a truthy string', () => {
    // The bug this function exists to prevent. Every non-empty string is truthy
    // in JavaScript, so `Boolean(query.inStock)` turns ?inStock=false into
    // *true* — the in-stock filter would then be impossible to switch off, and
    // out-of-stock products would never be shown.
    expect(toBoolean('false')).toBe(false)
    expect(Boolean('false')).toBe(true)
  })

  it.each([undefined, null, ''])('reads %s as null (filter not applied)', value => {
    // null is meaningfully different from false here: false means "show me
    // out-of-stock items", null means "do not filter on stock at all".
    expect(toBoolean(value)).toBeNull()
  })

  it.each(['TRUE', 'True', '1', '0', 'yes', 'on'])(
    'rejects %s rather than guessing',
    value => {
      // Deliberately strict. HTML checkboxes and older clients send some of
      // these, so if the storefront ever starts sending "1" the filter will
      // silently stop working — worth knowing that now rather than debugging
      // a "the toggle does nothing" report later.
      expect(toBoolean(value)).toBeNull()
    }
  )
})
