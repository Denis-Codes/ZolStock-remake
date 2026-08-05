import { describe, it, expect } from 'vitest'

import {
  SORT_OPTIONS,
  PAGE_SIZE,
  sortOptionFromToken,
  sortTokenFromFilter,
  pageFromSearchParams,
  searchParamsWithPage,
  filterToSearchParams,
  filterFromSearchParams,
  isSameUrlFilter,
} from '../../src/services/product-filter.service.js'

/**
 * The listing filter, and how it maps to the query string.
 *
 * ── What this module is for ───────────────────────────────────────────────
 * Filters used to live only in the Redux store. That meant a filtered shelf
 * could not be linked, bookmarked, refreshed or backed out of — the shopper
 * narrowed forty products down to two, hit reload, and got forty again.
 *
 * So the URL became the shareable copy of that state, and this module owns
 * the translation in both directions. Which creates the thing worth testing:
 * **two functions that must be exact inverses of each other.**
 *
 * ── Why that is a good target ─────────────────────────────────────────────
 * A one-directional bug here is nearly invisible in manual testing. Everything
 * looks right — you click a filter, the shelf narrows, the URL updates. The
 * failure only appears when someone reloads, or shares the link, or presses
 * back. That is exactly the class of bug automated tests are better at finding
 * than people are, because a person has to think to press reload and a test
 * just calls the other function.
 *
 * ── Round-trip testing ────────────────────────────────────────────────────
 * The strongest assertion available here is not about any single value. It is:
 *
 *   filterFromSearchParams(filterToSearchParams(x))  ==  x
 *
 * "Whatever goes in comes back out." A property like that covers combinations
 * no one wrote a case for, which is its whole appeal — you are not asserting a
 * list of examples, you are asserting a rule.
 */

/* A filter with every URL-owned field set to something non-default, so a
   round trip has something to lose. Frozen because several tests share it and
   a test that quietly mutates shared arrange data is a debugging afternoon. */
const FULL_FILTER = Object.freeze({
  txt: 'סיר',
  minPrice: '20',
  maxPrice: '150',
  inStock: 'true',
  sortField: 'price',
  sortDir: '-1',
})

/* Reads better than `new URLSearchParams('q=x&sort=y')` at each call site,
   and keeps the param spellings (q, min, max, stock) in one place. */
const params = init => new URLSearchParams(init)

describe('sort options', () => {
  /**
   * The token is what appears in the URL; the {sortField, sortDir} pair is what
   * the API understands. Every option must survive the trip in both directions
   * or a shared link silently sorts differently than the page that produced it.
   *
   * Driven off SORT_OPTIONS itself rather than a hardcoded list, so adding a
   * sort to the source automatically adds a test. A copied list would go stale
   * the first time someone adds a row and forgets this file.
   */
  it.each(SORT_OPTIONS)('round-trips the "$value" sort', option => {
    const filter = { sortField: option.sortField, sortDir: option.sortDir }

    expect(sortTokenFromFilter(filter)).toBe(option.value)
    expect(sortOptionFromToken(option.value)).toEqual(option)
  })

  /**
   * A URL is user input. Someone edits it by hand, an old link carries a token
   * that has since been renamed, a crawler makes one up.
   *
   * The requirement is that none of that throws or produces an undefined sort
   * — the shelf falls back to the default order and still renders. `?sort=` and
   * a missing param are the same case as a nonsense one, which is why all three
   * are here rather than just the interesting-looking one.
   */
  it.each([['nonsense'], [''], [undefined], [null]])(
    'falls back to the default sort for %o',
    token => {
      expect(sortOptionFromToken(token)).toBe(SORT_OPTIONS[0])
    }
  )

  it('falls back to the default when the filter carries no sort', () => {
    expect(sortTokenFromFilter({})).toBe(SORT_OPTIONS[0].value)
    expect(sortTokenFromFilter(null)).toBe(SORT_OPTIONS[0].value)
    expect(sortTokenFromFilter(undefined)).toBe(SORT_OPTIONS[0].value)
  })

  /**
   * The store holds sortDir as a number in some paths and a string in others,
   * because a <select> value is always a string and a default is written as a
   * literal. The source coerces with String() rather than picking one — this
   * pins that, because "sorting works everywhere except after you pick it from
   * the dropdown" is a real and very confusing bug.
   */
  it('matches a numeric sort direction as well as a string one', () => {
    expect(sortTokenFromFilter({ sortField: 'price', sortDir: -1 })).toBe('priceDesc')
    expect(sortTokenFromFilter({ sortField: 'price', sortDir: '-1' })).toBe('priceDesc')
  })

  /**
   * A field/direction pair that matches no option cannot be represented in the
   * URL at all, so it collapses to the default rather than writing a token the
   * page cannot read back.
   *
   * Pinned not because the behaviour is ideal but because it is *chosen* — the
   * alternative is an unshareable URL. If someone adds a sort to the API and
   * not to SORT_OPTIONS, this is the behaviour they will get, and it is better
   * that it is written down.
   */
  it('collapses an unrepresentable sort to the default', () => {
    expect(sortTokenFromFilter({ sortField: 'madeUpField', sortDir: '1' })).toBe('reco')
  })
})

describe('filter → URL', () => {
  /**
   * A shelf with nothing applied gets a clean URL. Not cosmetic: it is what
   * makes "am I filtered?" answerable at a glance, and it keeps the default
   * sort out of every link anyone shares.
   */
  it('writes nothing for an empty filter', () => {
    expect(filterToSearchParams({}).toString()).toBe('')
  })

  it('omits the default sort but writes any other', () => {
    expect(filterToSearchParams({ sortField: '', sortDir: '1' }).get('sort')).toBeNull()
    expect(filterToSearchParams({ sortField: 'price', sortDir: '1' }).get('sort')).toBe('priceAsc')
  })

  it('writes the fields it owns under their short names', () => {
    const result = filterToSearchParams(FULL_FILTER)

    // Assert the whole set of keys, not just the ones we remembered to check.
    // A field appearing in the URL that this module did not intend to own is
    // exactly as much of a bug as one going missing, and only this form of
    // assertion can see it.
    expect([...result.keys()].sort()).toEqual(['max', 'min', 'q', 'sort', 'stock'])
    expect(result.get('q')).toBe('סיר')
    expect(result.get('min')).toBe('20')
    expect(result.get('max')).toBe('150')
    expect(result.get('stock')).toBe('1')
  })

  /**
   * THE FALSY TRAP, in its natural habitat.
   *
   * `if (filterBy.minPrice)` would drop a minimum of 0 — and 0 is a value a
   * shopper can genuinely set by dragging the price slider to the left end.
   * The symptom: the slider looks right, the URL is missing the param, and
   * reloading snaps it back.
   *
   * The source guards with an explicit isSet() that tests against '', null and
   * undefined rather than truthiness. This is the test that stops someone
   * "simplifying" it back.
   */
  it('writes a price of zero, which is a value and not an absence', () => {
    const result = filterToSearchParams({ minPrice: 0, maxPrice: 0 })

    expect(result.get('min')).toBe('0')
    expect(result.get('max')).toBe('0')
  })

  it('omits a price that was cleared rather than set', () => {
    const result = filterToSearchParams({ minPrice: '', maxPrice: null, txt: undefined })

    expect(result.toString()).toBe('')
  })

  /**
   * inStock arrives as a real boolean from a checkbox and as the string 'true'
   * from the URL, and both mean checked. Everything else means unchecked —
   * asserted rather than assumed, because "false" the string is truthy and is
   * the classic way this goes wrong.
   */
  it.each([
    { inStock: true, written: '1' },
    { inStock: 'true', written: '1' },
    { inStock: false, written: null },
    { inStock: 'false', written: null },
    { inStock: '', written: null },
  ])('inStock $inStock → stock=$written', ({ inStock, written }) => {
    expect(filterToSearchParams({ inStock }).get('stock')).toBe(written)
  })
})

describe('URL → filter', () => {
  /**
   * Always every key, including the empty ones — and this is the subtle half
   * of the module.
   *
   * If the function returned only the params that were present, then clearing
   * a filter chip would produce `{}`, which merged over the old store state
   * changes nothing: the chip disappears and the shelf stays filtered. Same
   * failure on a back navigation. Returning every field means an absent param
   * actively clears its store value.
   */
  it('returns every field it owns, even when the URL is empty', () => {
    expect(filterFromSearchParams(params())).toEqual({
      txt: '',
      minPrice: '',
      maxPrice: '',
      inStock: '',
      sortField: '',
      sortDir: '1',
    })
  })

  it('reads each param back into its store field', () => {
    const result = filterFromSearchParams(params('q=סיר&min=20&max=150&stock=1&sort=priceDesc'))

    expect(result).toEqual({
      txt: 'סיר',
      minPrice: '20',
      maxPrice: '150',
      inStock: 'true',
      sortField: 'price',
      sortDir: '-1',
    })
  })

  /**
   * Only the exact string '1' means checked. Anything else — an old link with
   * stock=true, a hand-edited stock=0, a crawler's stock=yes — reads as
   * unchecked rather than as something the checkbox cannot render.
   */
  it.each([['1', 'true'], ['0', ''], ['true', ''], ['', '']])(
    'stock=%s reads as %o',
    (urlValue, expected) => {
      expect(filterFromSearchParams(params(`stock=${urlValue}`)).inStock).toBe(expected)
    }
  )

  it('ignores params it does not own', () => {
    // Category lives in the route path, not the query string, and the page
    // param belongs to pagination. Neither should leak into the filter and
    // reach the product query.
    const result = filterFromSearchParams(params('q=x&page=4&category=housewares&utm_source=x'))

    expect(Object.keys(result).sort()).toEqual([
      'inStock',
      'maxPrice',
      'minPrice',
      'sortDir',
      'sortField',
      'txt',
    ])
  })
})

describe('the round trip', () => {
  /**
   * The property this module exists to satisfy, stated once.
   *
   * Anything a shopper sets must survive being written to the URL and read
   * back — that is what makes a filtered shelf reloadable and shareable.
   */
  it('preserves a fully populated filter', () => {
    const there = filterToSearchParams(FULL_FILTER)
    const back = filterFromSearchParams(there)

    expect(back).toEqual(FULL_FILTER)
  })

  it('preserves an empty filter as an empty filter', () => {
    const back = filterFromSearchParams(filterToSearchParams({}))

    expect(back).toEqual(filterFromSearchParams(params()))
  })

  /**
   * A URL carries only strings — there is nowhere to put "this was a number".
   * So a filter that went in with numeric prices comes back with string ones,
   * and any comparison between the two has to coerce.
   *
   * isSameUrlFilter is the function that does, and it is load-bearing: the
   * listing calls it to decide whether the URL and the store have actually
   * diverged. If it compared with === it would report a difference on every
   * render, and the page would push a history entry each time — hundreds of
   * them between the shopper and the back button.
   */
  it('treats a numeric price and its string form as the same filter', () => {
    const typed = { minPrice: 20, maxPrice: 150 }
    const fromUrl = { minPrice: '20', maxPrice: '150' }

    expect(isSameUrlFilter(typed, fromUrl)).toBe(true)
  })

  it('reports a genuine difference as a difference', () => {
    expect(isSameUrlFilter({ txt: 'סיר' }, { txt: 'מגבת' })).toBe(false)
    expect(isSameUrlFilter({ inStock: true }, {})).toBe(false)
    expect(isSameUrlFilter({ sortField: 'price', sortDir: '1' }, {})).toBe(false)
  })

  it('ignores fields the URL does not own', () => {
    // Category is a route segment. Two filters differing only there are the
    // same *URL* filter, and treating them as different would make the listing
    // rewrite the query string on every category change for no reason.
    expect(isSameUrlFilter({ txt: 'x', category: 'a' }, { txt: 'x', category: 'b' })).toBe(true)
  })
})

describe('pagination', () => {
  it('exposes a page size the listing and the count line can share', () => {
    // Pinned so a change is a deliberate act. The count line reads "מתוך 37"
    // off the full response and slices locally — see the source comment.
    expect(PAGE_SIZE).toBe(24)
  })

  it('reads the page number from the URL', () => {
    expect(pageFromSearchParams(params('page=3'))).toBe(3)
  })

  /**
   * Every one of these is something a URL can actually contain, and every one
   * must land on page 1 rather than producing an empty shelf or a crash.
   *
   * `page=0` is the interesting row. `+'0'` is 0, which is falsy — a guard
   * written as `page || 1` on the number would work, but on the *string* '0'
   * it would not, because '0' is truthy. The source checks `>= 1` explicitly.
   *
   * `page=2.7` floors rather than rounding: half a page does not exist, and
   * showing page 3 for `2.7` would be a stranger answer than showing page 2.
   */
  it.each([
    ['missing', '', 1],
    ['zero', 'page=0', 1],
    ['negative', 'page=-5', 1],
    ['not a number', 'page=abc', 1],
    ['empty', 'page=', 1],
    ['fractional', 'page=2.7', 2],
  ])('%s → page %i', (_label, query, expected) => {
    expect(pageFromSearchParams(params(query))).toBe(expected)
  })

  it('writes a page number above the first', () => {
    expect(searchParamsWithPage(params('q=x'), 3).toString()).toBe('q=x&page=3')
  })

  it('drops the param entirely on the first page', () => {
    // Page 1 is the default, so ?page=1 is noise in a shared link.
    expect(searchParamsWithPage(params('q=x&page=4'), 1).toString()).toBe('q=x')
  })

  /**
   * URLSearchParams is mutable, and the object handed in belongs to the
   * router. Mutating it in place would change the current URL's params as a
   * side effect of asking what a *different* page would look like — the kind
   * of bug that shows up as the page number changing when you only hovered a
   * link.
   *
   * The source copies with `new URLSearchParams(searchParams)`. This is the
   * test that notices if that copy is ever removed.
   */
  it('does not mutate the params it was given', () => {
    const original = params('q=x')

    searchParamsWithPage(original, 5)

    expect(original.toString()).toBe('q=x')
  })
})

/**
 * ── Not covered, and why ──────────────────────────────────────────────────
 * shouldReplaceHistory decides whether a filter change earns a back-button
 * entry — typing and dragging replace, sort and the stock toggle push. It is
 * genuinely testable and genuinely worth testing; it is left out of this file
 * only because its behaviour is about *navigation*, and the assertions read
 * far better next to a rendered listing than next to two bare URLSearchParams.
 * It belongs with the ProductIndex component tests.
 *
 * Also noted while reading, not a bug: filterFromSearchParams contains
 * `min === '' ? '' : min`, where both branches return the same string. Dead
 * code, harmless, left alone — flagged rather than tidied, since this stage is
 * meant to add tests and not to edit the source.
 */
