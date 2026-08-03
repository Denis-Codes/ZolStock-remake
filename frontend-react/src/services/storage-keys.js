/**
 * Every localStorage key the shop writes, in one place.
 *
 * These used to be private constants inside cart.actions, wishlist.actions and
 * util.service. Reconciling persisted state after a catalogue change needs to
 * know all of them at once, and a second hand-copied list of key strings is
 * exactly the kind of thing that goes stale silently.
 *
 * This module deliberately imports nothing: util.service reads a key from here
 * and catalogue-version.service reads util.service, so any import of its own
 * would close that loop.
 */

export const CART_STORAGE_KEY = 'zolstock_cart'
export const WISHLIST_STORAGE_KEY = 'zolstock_wishlist'
export const RECENTLY_VIEWED_KEY = 'zolstock_recently_viewed'

/** Where the catalogue stamp below is recorded. */
export const CATALOGUE_VERSION_KEY = 'zolstock_catalogue_version'

/**
 * Bump whenever product ids stop meaning what they used to mean.
 *
 * 1 - implicit; the original invented catalogue (furniture / clothing /
 *     electronics / kitchen / pets), ids banded p1001-p5004.
 * 2 - the chain's eight real departments, ids p1001-p1040.
 * 3 - the shop moved onto the API. Products are keyed by their Mongo ObjectId
 *     now; the p1001-style id survives as `sku` and is what the מק״ט line
 *     shows. Stored p-ids therefore resolve to nothing, which would leave
 *     every heart unfilled and every saved cart row orphaned.
 */
export const CATALOGUE_VERSION = 3

/** Keys holding catalogue-derived data, cleared when the stamp changes. */
export const CATALOGUE_DERIVED_KEYS = [
  CART_STORAGE_KEY,
  WISHLIST_STORAGE_KEY,
  RECENTLY_VIEWED_KEY,
]
