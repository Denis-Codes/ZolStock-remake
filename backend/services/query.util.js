import { ObjectId } from 'mongodb'

const HEX_24 = /^[0-9a-fA-F]{24}$/

/**
 * Escapes regex metacharacters in user-supplied search text.
 *
 * Without this, a shopper typing "(" into the search box throws an invalid
 * regex and 500s the request, and a crafted input like "(a+)+$" is a ReDoS
 * vector that pins the event loop.
 */
export function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True when a string is shaped like a Mongo ObjectId. */
export function isObjectIdLike(id) {
  return HEX_24.test(String(id || ''))
}

/**
 * Builds a lookup criteria that accepts either an ObjectId hex string or a
 * legacy "p1001" sku.
 *
 * Products migrated from string ids to ObjectIds, but product URLs already in
 * the wild — and carts sitting in shoppers' localStorage — still reference the
 * sku. Resolving both keeps those working.
 */
export function byIdOrSku(id) {
  return isObjectIdLike(id)
    ? { _id: ObjectId.createFromHexString(id) }
    : { sku: String(id) }
}

/** Coerces a query-string value to a number, or null when absent/invalid. */
export function toNumber(val) {
  if (val === undefined || val === null || val === '') return null
  const num = +val
  return Number.isFinite(num) ? num : null
}

/**
 * Coerces a query-string value to a boolean, or null when absent.
 * Query strings carry "true"/"false" as text, so a bare Boolean() cast would
 * read "false" as true.
 */
export function toBoolean(val) {
  if (val === undefined || val === null || val === '') return null
  if (val === true || val === 'true') return true
  if (val === false || val === 'false') return false
  return null
}
