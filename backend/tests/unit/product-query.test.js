import { describe, it, expect } from 'vitest'

import { _buildCriteria, _buildSort, _buildSearchText } from '../../api/product/product.service.js'
import { buildFilter } from '../../api/product/product.controller.js'

/**
 * The product search pipeline, tested at its three pure stages:
 *
 *   query string  →  buildFilter      →  filterBy object
 *   filterBy      →  _buildCriteria   →  Mongo find() criteria
 *   filterBy      →  _buildSort       →  Mongo sort spec
 *
 * Testing the stages separately rather than through a live query is a
 * deliberate choice. A failing end-to-end search tells you "the sidebar
 * returns nothing"; a failing unit tells you which of the three translations
 * dropped the value. Both have their place — stage 4 asserts the query really
 * returns the right products — but the cheap test should be the precise one.
 */

describe('buildFilter — reading the query string', () => {
  it('produces a complete filter from an empty query', () => {
    // The storefront's default request. Every key must be present with a
    // defined value so downstream code never has to distinguish "absent" from
    // "empty" a second time.
    expect(buildFilter({})).toEqual({
      txt: '',
      category: '',
      subCategory: '',
      minPrice: null,
      maxPrice: null,
      inStock: null,
      sortField: '',
      sortDir: 1,
      pageIdx: null,
      pageSize: null,
    })
  })

  it('leaves pageIdx null when the caller does not ask for a page', () => {
    /**
     * A regression guard for a real bug.
     *
     * pageIdx used to default to 0, and _buildCriteria's caller reads "not
     * null" as "paginate". So every request — including the storefront's, which
     * sends no pageIdx and expects the whole catalogue — was silently capped at
     * the first 20 of 40 products. Nothing errored; half the shop just did not
     * exist.
     *
     * This is the shape of bug that unit tests are unusually good at: the code
     * did exactly what it said, and the defect was in what the default meant.
     */
    expect(buildFilter({}).pageIdx).toBeNull()
  })

  it('reads page zero as a real page, not as absent', () => {
    // The other half of the same rule, and the reason `toNumber` returns null
    // rather than 0 for a missing value. `?pageIdx=0` must paginate.
    expect(buildFilter({ pageIdx: '0' }).pageIdx).toBe(0)
    expect(buildFilter({ pageIdx: '2', pageSize: '10' })).toMatchObject({
      pageIdx: 2,
      pageSize: 10,
    })
  })

  it('coerces every numeric parameter off the query string', () => {
    expect(buildFilter({ minPrice: '50', maxPrice: '150.5' })).toMatchObject({
      minPrice: 50,
      maxPrice: 150.5,
    })
  })

  it('reads the in-stock toggle in both directions', () => {
    // ?inStock=false means "include out-of-stock items", which is different
    // from omitting the parameter. Three states, not two.
    expect(buildFilter({ inStock: 'true' }).inStock).toBe(true)
    expect(buildFilter({ inStock: 'false' }).inStock).toBe(false)
    expect(buildFilter({}).inStock).toBeNull()
  })

  it('defaults sortDir to ascending', () => {
    expect(buildFilter({}).sortDir).toBe(1)
    expect(buildFilter({ sortDir: '-1' }).sortDir).toBe(-1)
  })

  it('falls back to ascending when sortDir is unparseable', () => {
    // toNumber returns null for junk, and `?? 1` catches it. Without the
    // nullish fallback the sort spec would carry null and Mongo would reject
    // the whole query — a 500 from a malformed URL.
    expect(buildFilter({ sortDir: 'sideways' }).sortDir).toBe(1)
  })

  it('tolerates being called with no query at all', () => {
    expect(() => buildFilter()).not.toThrow()
  })
})

describe('_buildCriteria — turning a filter into a Mongo query', () => {
  it('returns an empty criteria when nothing is filtered', () => {
    // An empty object means "every product". Any stray key here silently
    // narrows the whole catalogue.
    expect(_buildCriteria({})).toEqual({})
    expect(_buildCriteria(buildFilter({}))).toEqual({})
  })

  describe('text search', () => {
    it('searches the denormalised haystack, lowercased and trimmed', () => {
      /**
       * searchText, not name. The previous version regexed `name` and a
       * `vendor` field this schema does not have, so every Hebrew search
       * returned nothing — the field it searched held English only.
       *
       * The haystack is built lowercase by _buildSearchText, so the needle is
       * lowercased to match. Case handling that lives in two places is exactly
       * where a search quietly stops working.
       */
      expect(_buildCriteria({ txt: '  Frying Pan  ' })).toEqual({
        searchText: { $regex: 'frying pan' },
      })
    })

    it('searches Hebrew text', () => {
      // The storefront is Hebrew. A partial word must match, which is why this
      // is a regex rather than Mongo's $text operator: $text matches whole
      // words, so search-as-you-type would find nothing until the last letter.
      expect(_buildCriteria({ txt: 'מחבת' })).toEqual({ searchText: { $regex: 'מחבת' } })
    })

    it('escapes the needle before it reaches Mongo', () => {
      // The link between the search box and query.util. A shopper typing "("
      // produced an invalid regex and a 500; the payload below produced
      // catastrophic backtracking inside the database driver.
      expect(_buildCriteria({ txt: '(a+)+$' }).searchText.$regex).toBe('\\(a\\+\\)\\+\\$')
    })

    it('omits the criteria entirely for an empty search', () => {
      // `{ $regex: '' }` matches everything, so it would be harmless — but it
      // also forces a full scan with a regex evaluated per document. Leaving
      // the key out lets the query planner do its job.
      expect(_buildCriteria({ txt: '' })).toEqual({})
      expect(_buildCriteria({ txt: undefined })).toEqual({})
    })
  })

  describe('price range', () => {
    it.each([
      ['minimum only', { minPrice: 50 }, { price: { $gte: 50 } }],
      ['maximum only', { maxPrice: 150 }, { price: { $lte: 150 } }],
      ['both ends', { minPrice: 50, maxPrice: 150 }, { price: { $gte: 50, $lte: 150 } }],
    ])('builds %s', (_label, filterBy, expected) => {
      expect(_buildCriteria(filterBy)).toEqual(expected)
    })

    it('keeps a minimum of zero', () => {
      /**
       * The falsy-value trap, and the single most valuable assertion in this
       * block. `if (filterBy.minPrice)` reads 0 as absent, so a slider dragged
       * to its left end would silently drop the whole price filter — and the
       * maximum along with it, if written as one combined check.
       *
       * The code guards with `!== null && !== undefined` instead. This test is
       * what stops someone "simplifying" that back.
       */
      expect(_buildCriteria({ minPrice: 0 })).toEqual({ price: { $gte: 0 } })
      expect(_buildCriteria({ minPrice: 0, maxPrice: 100 })).toEqual({
        price: { $gte: 0, $lte: 100 },
      })
    })

    it('omits the price criteria when neither end is set', () => {
      expect(_buildCriteria({ minPrice: null, maxPrice: null })).toEqual({})
    })

    it('passes an inverted range through unchanged', () => {
      // minPrice above maxPrice matches nothing. Documented, not corrected:
      // the sidebar cannot produce it, and inventing a silent swap here would
      // hide a genuine client bug behind plausible-looking results.
      expect(_buildCriteria({ minPrice: 200, maxPrice: 100 })).toEqual({
        price: { $gte: 200, $lte: 100 },
      })
    })
  })

  describe('category and stock', () => {
    it('filters by category and sub-category', () => {
      expect(_buildCriteria({ category: 'housewares', subCategory: 'kitchen' })).toEqual({
        category: 'housewares',
        subCategory: 'kitchen',
      })
    })

    it('ignores empty category strings', () => {
      // buildFilter defaults these to '' rather than undefined, so the guard
      // has to handle the empty string specifically or every unfiltered
      // request would ask for `category: ''` and return nothing.
      expect(_buildCriteria({ category: '', subCategory: '' })).toEqual({})
    })

    it('keeps inStock: false', () => {
      /**
       * Same falsy trap as minPrice: 0, and it had already bitten once. The
       * criteria was built here correctly, but the controller never read
       * inStock off the query string — so the sidebar's in-stock toggle did
       * nothing at all. Both halves are now covered, here and in buildFilter.
       */
      expect(_buildCriteria({ inStock: false })).toEqual({ inStock: false })
      expect(_buildCriteria({ inStock: true })).toEqual({ inStock: true })
      expect(_buildCriteria({ inStock: null })).toEqual({})
    })
  })

  it('does not pass unknown filter keys through to the query', () => {
    // The criteria is built key by key from a known list, never spread from
    // the input. So a caller inventing `?isAdmin=true` or `?owner._id=…`
    // cannot add a clause — the field is simply not read.
    expect(_buildCriteria({ isAdmin: true, 'owner._id': 'u1', $where: 'true' })).toEqual({})
  })
})

describe('_buildSort — the sortable-field allowlist', () => {
  it.each([
    'price',
    'salePrice',
    'originalPrice',
    'discountPercent',
    'rating',
    'reviewCount',
    'stockQty',
    'displayNameHe',
    'name',
  ])('sorts by %s', field => {
    expect(_buildSort({ sortField: field })).toEqual({ [field]: 1 })
  })

  it('sorts descending when asked', () => {
    expect(_buildSort({ sortField: 'price', sortDir: -1 })).toEqual({ price: -1 })
    expect(_buildSort({ sortField: 'price', sortDir: '-1' })).toEqual({ price: -1 })
  })

  it('treats any direction other than -1 as ascending', () => {
    // `+sortDir === -1 ? -1 : 1`. Deliberately not a validation error: a
    // malformed sort direction should give a sensible order, not a 400.
    expect(_buildSort({ sortField: 'price', sortDir: 0 })).toEqual({ price: 1 })
    expect(_buildSort({ sortField: 'price', sortDir: 'desc' })).toEqual({ price: 1 })
    expect(_buildSort({ sortField: 'price', sortDir: undefined })).toEqual({ price: 1 })
  })

  it('returns no sort at all when none is requested', () => {
    // An empty sort spec leaves Mongo's natural order, which is what the
    // storefront's default listing relies on.
    expect(_buildSort({})).toEqual({})
    expect(_buildSort({ sortField: '' })).toEqual({})
  })

  describe('rejecting fields that are not on the list', () => {
    /**
     * An allowlist, not a denylist — the distinction that matters.
     *
     * A denylist blocks the fields you thought of. An allowlist blocks
     * everything you did not, which includes fields added to the schema next
     * year by someone who never read this file.
     *
     * Why sorting on an arbitrary field is a problem at all: sort order leaks
     * information about values you cannot read. Sorting a public product list
     * by an internal field tells you which documents have it and roughly how
     * they compare, without the field ever appearing in a response.
     */
    it.each([
      ['an internal field', 'owner._id'],
      ['a field from another collection', 'password'],
      ['a nested path', 'msgs.0.txt'],
      ['a Mongo operator', '$natural'],
      ['a dotted traversal', 'owner.password'],
    ])('ignores %s', (_label, sortField) => {
      expect(_buildSort({ sortField })).toEqual({})
    })

    it('ignores a non-string sort field', () => {
      // Set.has() on an object is false, so this falls through safely — but it
      // falls through by luck rather than by a type check, so it is pinned.
      expect(_buildSort({ sortField: { $ne: null } })).toEqual({})
      expect(_buildSort({ sortField: ['price'] })).toEqual({})
    })

    it('is case-sensitive', () => {
      // 'Price' is not 'price'. Field names in Mongo are case-sensitive too, so
      // accepting the wrong case would build a sort on a field that does not
      // exist and quietly return unsorted results.
      expect(_buildSort({ sortField: 'Price' })).toEqual({})
    })
  })
})

describe('_buildSearchText — the haystack every search reads', () => {
  const PRODUCT = {
    name: 'Frying Pan',
    displayNameHe: 'מחבת',
    brand: 'Zol',
    displayCategoryHe: 'כלי בית',
    displaySubCategoryHe: 'מטבח',
    tags: ['kitchen', 'cookware'],
    displayTagsHe: ['מטבח', 'בישול'],
  }

  it('includes every field a shopper might search by', () => {
    const haystack = _buildSearchText(PRODUCT)

    // Asserted field by field rather than against one long expected string:
    // a whole-string comparison would break on a harmless reordering and tell
    // you nothing about which field went missing.
    expect(haystack).toContain('frying pan')
    expect(haystack).toContain('מחבת')
    expect(haystack).toContain('zol')
    expect(haystack).toContain('כלי בית')
    expect(haystack).toContain('cookware')
    expect(haystack).toContain('בישול')
  })

  it('lowercases the haystack to match the lowercased needle', () => {
    // The other end of the case contract asserted in _buildCriteria. Both
    // sides lowercase, so a search for "FRYING" finds "Frying Pan". If either
    // side stopped, search would half-work in a way nobody would attribute to
    // casing.
    expect(_buildSearchText({ name: 'Frying Pan' })).toBe('frying pan')
  })

  it('skips missing fields instead of writing "undefined" into the haystack', () => {
    // Without the .filter(Boolean), a product with no brand would carry the
    // literal text "undefined" — and a search for "undefined" would return
    // every incomplete product in the catalogue.
    const haystack = _buildSearchText({ name: 'Towel' })

    expect(haystack).toBe('towel')
    expect(haystack).not.toContain('undefined')
  })

  it('handles a product with no searchable fields', () => {
    expect(_buildSearchText({})).toBe('')
    expect(_buildSearchText()).toBe('')
  })

  it('survives tag lists being absent', () => {
    // `...(product.tags || [])` — spreading undefined throws. Reached by any
    // product added through the admin form without tags.
    expect(() => _buildSearchText({ name: 'Towel', tags: undefined })).not.toThrow()
  })

  it('produces a haystack the search criteria can actually match', () => {
    /**
     * The integration point between the two functions, checked without a
     * database. Testing them in isolation proves each is self-consistent;
     * this proves they agree with each other.
     *
     * This is the assertion that would have caught the original bug, where the
     * haystack was built from one set of fields and searched on another.
     */
    const haystack = _buildSearchText(PRODUCT)
    const { searchText } = _buildCriteria({ txt: 'Frying' })

    expect(new RegExp(searchText.$regex).test(haystack)).toBe(true)
  })

  it('matches a partial Hebrew word, as search-as-you-type requires', () => {
    const haystack = _buildSearchText(PRODUCT)
    const { searchText } = _buildCriteria({ txt: 'מחב' })

    expect(new RegExp(searchText.$regex).test(haystack)).toBe(true)
  })
})
