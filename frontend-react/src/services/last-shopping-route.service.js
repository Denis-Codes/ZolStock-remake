/**
 * Remembers the last place the shopper was actually browsing, so "המשך בקניות"
 * returns them there instead of dumping them on the homepage.
 *
 * Only category, search and product routes count as shopping. The cart,
 * wishlist, account and info pages are explicitly not — returning to the cart
 * from the cart's own empty state would be a loop.
 *
 * sessionStorage rather than localStorage: this is "where was I just now",
 * which should not survive into a new session.
 */
const STORAGE_KEY = 'lastShoppingRoute'
const SHOPPING_ROUTE = /^\/(category|product|search)(\/|\?|$)/

export function rememberShoppingRoute(pathWithSearch) {
    if (!SHOPPING_ROUTE.test(pathWithSearch)) return
    try {
        sessionStorage.setItem(STORAGE_KEY, pathWithSearch)
    } catch {
        // Private mode or a full quota — remembering is a nicety, not a feature.
    }
}

export function getLastShoppingRoute(fallback = '/') {
    try {
        return sessionStorage.getItem(STORAGE_KEY) || fallback
    } catch {
        return fallback
    }
}
