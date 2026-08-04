/**
 * The listing's filter state, and how it maps to the query string.
 *
 * Filters used to live only in the Redux store, which meant a filtered shelf
 * could not be linked, bookmarked, refreshed or backed out of — the shopper
 * narrowed forty products down to two, hit reload, and got forty again. The URL
 * is the shareable copy of that state; the store is the working copy. Both
 * directions of the mapping live here so they cannot drift apart.
 *
 * Category and sub-category are deliberately absent: those are route segments
 * (`/category/housewares/pots`), not query params, and duplicating them here
 * would give the page two disagreeing sources of truth for where the shopper is.
 */

/* Kept as data rather than a switch so the <select>, the token→filter mapping
   and the filter→token mapping all read from one list. Adding a sort means
   adding a row. */
export const SORT_OPTIONS = [
  { value: 'reco', labelHe: 'סידור ברירת מחדל', sortField: '', sortDir: '1' },

  /* The one sort this storefront actually needs and did not have. The whole
     proposition is the markdown, every card carries a discount badge, and
     there was no way to ask for the deepest one. */
  { value: 'discount', labelHe: 'הנחה: מהגבוהה לנמוכה', sortField: 'discountPercent', sortDir: '-1' },

  { value: 'priceAsc', labelHe: 'מחיר: מהנמוך לגבוה', sortField: 'price', sortDir: '1' },
  { value: 'priceDesc', labelHe: 'מחיר: מהגבוה לנמוך', sortField: 'price', sortDir: '-1' },

  /* displayNameHe, not name. The option says "שם" in a Hebrew interface but
     used to sort on the English field, so the order looked arbitrary. Both
     services accept either. */
  { value: 'name', labelHe: 'שם: א׳–ת׳', sortField: 'displayNameHe', sortDir: '1' },
]

const DEFAULT_SORT = SORT_OPTIONS[0]

export function sortOptionFromToken(token) {
  return SORT_OPTIONS.find(opt => opt.value === token) || DEFAULT_SORT
}

export function sortTokenFromFilter(filterBy) {
  const { sortField, sortDir } = filterBy || {}
  if (!sortField) return DEFAULT_SORT.value

  const match = SORT_OPTIONS.find(opt =>
    opt.sortField === sortField && String(opt.sortDir) === String(sortDir)
  )
  return match?.value || DEFAULT_SORT.value
}

/* Short names, because these end up in a link someone may paste into a message.
   `q` matches the search page's existing param rather than inventing a second
   spelling for the same idea. */
const PARAM = {
  txt: 'q',
  minPrice: 'min',
  maxPrice: 'max',
  inStock: 'stock',
  sort: 'sort',
  page: 'page',
}

/**
 * Which page of results is showing.
 *
 * Deliberately NOT part of the filter: it never reaches the product query. The
 * catalogue is small enough to arrive in one response, and the count line has
 * to say "מתוך 37", which a server-paginated response cannot tell it — it only
 * knows the twenty-four items it sent. So the fetch stays whole and the page
 * slices what it already has. If the catalogue outgrows one response this moves
 * to the API's existing pageIdx/pageSize, and the count line will need a total
 * alongside the rows.
 */
export const PAGE_SIZE = 24

export function pageFromSearchParams(searchParams) {
  const raw = +(searchParams.get(PARAM.page) || 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
}

export function searchParamsWithPage(searchParams, page) {
  const next = new URLSearchParams(searchParams)
  if (page > 1) next.set(PARAM.page, String(page))
  else next.delete(PARAM.page)
  return next
}

function isSet(value) {
  return value !== '' && value !== null && value !== undefined
}

/** Store → URL. Only non-default values are written, so a clean shelf has a clean URL. */
export function filterToSearchParams(filterBy = {}) {
  const params = new URLSearchParams()

  if (isSet(filterBy.txt)) params.set(PARAM.txt, filterBy.txt)
  if (isSet(filterBy.minPrice)) params.set(PARAM.minPrice, String(filterBy.minPrice))
  if (isSet(filterBy.maxPrice)) params.set(PARAM.maxPrice, String(filterBy.maxPrice))
  if (filterBy.inStock === true || filterBy.inStock === 'true') params.set(PARAM.inStock, '1')

  const sort = sortTokenFromFilter(filterBy)
  if (sort !== DEFAULT_SORT.value) params.set(PARAM.sort, sort)

  return params
}

/**
 * URL → store. Always returns every field, including the empty ones: a param
 * that has been dropped from the URL — by a back navigation, or by clearing a
 * chip — has to clear the store value too, not leave the old one behind.
 */
export function filterFromSearchParams(searchParams) {
  const get = key => searchParams.get(key) ?? ''
  const { sortField, sortDir } = sortOptionFromToken(get(PARAM.sort))

  const min = get(PARAM.minPrice)
  const max = get(PARAM.maxPrice)

  return {
    txt: get(PARAM.txt),
    minPrice: min === '' ? '' : min,
    maxPrice: max === '' ? '' : max,
    inStock: get(PARAM.inStock) === '1' ? 'true' : '',
    sortField,
    sortDir,
  }
}

/** The subset the URL owns, read off a store filter, for comparing the two. */
export function urlOwnedFields(filterBy = {}) {
  return filterFromSearchParams(filterToSearchParams(filterBy))
}

export function isSameUrlFilter(a, b) {
  const left = urlOwnedFields(a)
  const right = urlOwnedFields(b)
  return Object.keys(left).every(key => String(left[key]) === String(right[key]))
}

/**
 * Which params a filter change touched, so the page can decide whether the
 * change earns a history entry.
 *
 * The text field and the price slider emit a change per keystroke and per pixel
 * of drag; pushing those would put several hundred entries between the shopper
 * and the page they arrived from, and make the back button useless as an undo.
 * Sort and the in-stock toggle are single deliberate acts, and going back from
 * one is exactly what a shopper means by "undo that".
 */
const CONTINUOUS_PARAMS = new Set([PARAM.txt, PARAM.minPrice, PARAM.maxPrice])

export function shouldReplaceHistory(prevParams, nextParams) {
  const keys = new Set([...prevParams.keys(), ...nextParams.keys()])
  keys.delete(PARAM.page) // page moves push on their own; see below

  const changed = [...keys].filter(key => prevParams.get(key) !== nextParams.get(key))
  if (!changed.length) return true

  return changed.every(key => CONTINUOUS_PARAMS.has(key))
}
