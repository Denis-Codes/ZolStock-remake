import { loadFromStorage, saveToStorage } from './util.service'
import {
  CATALOGUE_VERSION,
  CATALOGUE_VERSION_KEY,
  CATALOGUE_DERIVED_KEYS,
} from './storage-keys'

/**
 * Drops persisted shopping state that belongs to a previous catalogue.
 *
 * The cart, the wishlist and the recently-viewed list all outlive a page load
 * by design. They also all key off product ids, which means they quietly
 * outlive the catalogue those ids came from.
 *
 * When the eight real departments replaced the invented five, ids changed
 * meaning rather than merely disappearing: the old catalogue banded them
 * p1001-p5004, the new one runs p1001-p1040. That produced two distinct
 * failures from one cause.
 *
 *   - Ids in the p2xxx-p5xxx range stopped resolving. WishlistPage filters
 *     unresolved products out, so the page showed its empty state while the
 *     header badge — which counts stored ids, not resolvable products — still
 *     read 12.
 *   - Ids in p1001-p1040 still resolve, to an entirely different product. A
 *     saved sofa silently became a storage box.
 *
 * Pruning ids that no longer resolve would only fix the first. It cannot see
 * the second, because a collided id looks perfectly valid, and it cannot check
 * the cart at all — cart rows store a name/price/image snapshot rather than a
 * live reference, so a stale row keeps rendering a deleted product at its old
 * price and would happily reach checkout.
 *
 * So this compares a stored stamp against CATALOGUE_VERSION and clears the lot
 * on a mismatch. A visitor whose favourites predate the change loses them,
 * which is the correct outcome: those products no longer exist in the shop.
 *
 * Absent stamp counts as a mismatch, which is what makes this fix the visitors
 * who are already carrying stale state rather than only future ones.
 *
 * Safe to call on every boot; it writes only when the stamp actually differs.
 */
export function reconcilePersistedCatalogueState() {
  let stored
  try {
    stored = loadFromStorage(CATALOGUE_VERSION_KEY)
  } catch {
    // Corrupt JSON in the stamp itself — treat exactly like a mismatch.
    stored = undefined
  }

  if (stored === CATALOGUE_VERSION) return false

  for (const key of CATALOGUE_DERIVED_KEYS) {
    saveToStorage(key, [])
  }
  saveToStorage(CATALOGUE_VERSION_KEY, CATALOGUE_VERSION)

  return true
}
