import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'

import { clearFilters, hasActiveFilters, loadProducts, setFilterBy } from '../store/actions/product.actions'
import { userService } from '../services/user'
import { productService } from '../services/product/'
import { showErrorMsg } from '../services/event-bus.service'
import { departmentLabel } from '../services/taxonomy.service'
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  filterFromSearchParams,
  filterToSearchParams,
  isSameUrlFilter,
  pageFromSearchParams,
  searchParamsWithPage,
  shouldReplaceHistory,
  sortOptionFromToken,
  sortTokenFromFilter,
} from '../services/product-filter.service'

import { ProductBreadcrumbs } from '../cmps/ProductBreadcrumbs.jsx'
import { ProductList } from '../cmps/ProductList.jsx'
import { Pagination } from '../cmps/Pagination.jsx'
import { ProductSidebarFilters } from '../cmps/ProductSidebarFilters.jsx'
import { ActiveFilterChips } from '../cmps/ActiveFilterChips.jsx'
import { EmptyState } from '../cmps/EmptyState.jsx'

export function ProductIndex() {
  const dispatch = useDispatch()

  // ✅ תואם ל-RootCmp שלך:
  // category/:categorySlug
  // category/:categorySlug/:subCategorySlug
  const { categorySlug = '', subCategorySlug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const products = useSelector(storeState => storeState.productModule.products)
  const filterBy = useSelector(storeState => storeState.productModule.filterBy)
  const isLoading = useSelector(storeState => storeState.productModule.isLoading)

  // ✅ Labels בעברית (כדי שגם הכותרת וגם ה-breadcrumbs יהיו בעברית)
  const [catLabel, setCatLabel] = useState('')
  const [subLabel, setSubLabel] = useState('')

  // Filters are a side panel on desktop and a sheet on mobile; one flag drives
  // both, since the sheet styling only applies below the sidebar breakpoint.
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const sheetRef = useRef(null)
  const closeBtnRef = useRef(null)
  const filtersBtnRef = useRef(null)

  useEffect(() => {
    let isCancelled = false

      ; (async () => {
        if (!categorySlug) {
          if (!isCancelled) {
            setCatLabel('')
            setSubLabel('')
          }
          return
        }

        const cats = await productService.getCategories()
        const cat = cats.find(c => c.slug === categorySlug)
        // getCategories() is derived from products, so a department with no
        // products in stock returns nothing here. Fall back to the taxonomy's
        // Hebrew label rather than showing an English slug in a Hebrew UI;
        // departmentLabel() still yields the slug for a genuinely unknown one.
        const nextCatLabel = cat?.labelHe || departmentLabel(categorySlug)

        let nextSubLabel = ''
        if (subCategorySlug) {
          const subs = await productService.getSubCategories(categorySlug)
          const sub = subs.find(s => s.slug === subCategorySlug)
          nextSubLabel = sub?.labelHe || subCategorySlug
        }

        if (!isCancelled) {
          setCatLabel(nextCatLabel)
          setSubLabel(nextSubLabel)
        }
      })()

    return () => { isCancelled = true }
  }, [categorySlug, subCategorySlug])

  /* ── URL ⇄ store ─────────────────────────────────────────────────────────
     The store is the working copy of the filter and the query string is the
     shareable one. Two effects keep them in step, and both start with an
     equality check so neither can trigger the other into a loop: URL → store
     dispatches nothing when the store already says the same thing, and
     store → URL navigates nowhere when the address bar already reads that way.

     Direction matters at a category change. The route effect below fires with
     the new slug while the store still holds the previous department's filters,
     so store → URL additionally refuses to write until the store has caught up
     with the route — otherwise a search from one department would be copied
     onto the next department's address as the shopper walked into it. */

  // ✅ מעדכן פילטרים לפי ה-URL (קטגוריה/תת קטגוריה + query params)
  useEffect(() => {
    const fromUrl = filterFromSearchParams(searchParams)

    const isSameRoute =
      filterBy.category === categorySlug && filterBy.subCategory === subCategorySlug

    if (isSameRoute && isSameUrlFilter(fromUrl, filterBy)) return

    dispatch(setFilterBy({
      category: categorySlug,
      subCategory: subCategorySlug,
      ...fromUrl,
    }))
  }, [categorySlug, subCategorySlug, searchParams])

  useEffect(() => {
    if (filterBy.category !== categorySlug) return
    if (filterBy.subCategory !== subCategorySlug) return

    /* Compare only the params the filter owns. Comparing the whole query string
       would see `?page=2` as a difference, rewrite the URL without it, and make
       paging impossible — every page move would be undone on the next render.
       A genuine filter change *does* drop the page, which is correct: page 3 of
       a result set that no longer exists is not where the shopper wants to be. */
    const next = filterToSearchParams(filterBy)
    const current = filterToSearchParams(filterFromSearchParams(searchParams))
    if (next.toString() === current.toString()) return

    /* Deliberate single acts — a sort, the in-stock toggle — push, so back
       undoes them. Typing and slider drags replace, because pushing those
       would stack a history entry per keystroke and per pixel and bury the
       page the shopper arrived from. */
    setSearchParams(next, { replace: shouldReplaceHistory(searchParams, next) })
  }, [filterBy, categorySlug, subCategorySlug])

  // ✅ טוען מוצרים בכל שינוי filterBy
  useEffect(() => {
    dispatch(loadProducts()).catch(() => showErrorMsg('Cannot load products'))
  }, [filterBy]) // השארתי כמו שהיה אצלך

  /* The open sheet is a modal dialog, so it has to behave like one: Escape
     closes it, the page underneath must not scroll, and Tab must not walk out
     of it into a page the shopper cannot see. Without the trap, tabbing from
     the price field landed on the product links behind the scrim — focus
     invisible, and Enter navigating away from a page that still looked open. */
  useEffect(() => {
    if (!isFiltersOpen) return

    const sheet = sheetRef.current

    function focusables() {
      if (!sheet) return []
      return [...sheet.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter(el => el.offsetParent !== null || el === document.activeElement)
    }

    function onKeyDown(ev) {
      if (ev.key === 'Escape') return setIsFiltersOpen(false)
      if (ev.key !== 'Tab') return

      const items = focusables()
      if (!items.length) return

      const first = items[0]
      const last = items[items.length - 1]

      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault()
        first.focus()
      } else if (!sheet.contains(document.activeElement)) {
        ev.preventDefault()
        first.focus()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    // The close button, not the first filter: opening a panel should not look
    // like it has already changed something.
    closeBtnRef.current?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)

      /* Focus goes back where it came from. Leaving it on a node that has just
         become `visibility: hidden` drops it to <body>, and the next Tab starts
         over from the top of the page. */
      filtersBtnRef.current?.focus()
    }
  }, [isFiltersOpen])

  /* Above $bp-lg the same element is a static sidebar column, not a drawer —
     so a sheet left open while the window grows would keep the page scroll
     locked and a focus trap running around an ordinary column. Must track
     $bp-lg (75rem) in setup/_breakpoints.scss; it is the one place a
     breakpoint is written twice. */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 75rem)')

    function onChange(ev) {
      if (ev.matches) setIsFiltersOpen(false)
    }

    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Leaving the category closes the sheet with it.
  useEffect(() => {
    setIsFiltersOpen(false)
  }, [categorySlug, subCategorySlug])

  function onChangeTxt(ev) {
    dispatch(setFilterBy({ txt: ev.target.value }))
  }

  function onChangeSort(ev) {
    const { sortField, sortDir } = sortOptionFromToken(ev.target.value)
    dispatch(setFilterBy({ sortField, sortDir }))
  }

  /* Client-side paging. The query returns the whole match set — forty products
     at present — so slicing here costs nothing and keeps the count line able to
     say "מתוך 37", which a server-paginated response could not: it only knows
     the twenty-four rows it sent. `from` and `to` have been computed on this
     page since before the refactor and rendered nowhere; they render now. */
  const total = products?.length || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  /* A page number left over from a wider result set — a bookmark to page 3, or
     a filter that just narrowed the shelf — is clamped rather than shown as an
     empty page with no way back. */
  const page = Math.min(pageFromSearchParams(searchParams), totalPages)

  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(total, page * PAGE_SIZE)

  const pageProducts = useMemo(
    () => (products || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [products, page]
  )

  function onChangePage(nextPage) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages)
    if (clamped === page) return

    /* Push, not replace: paging is a deliberate act and back should undo it.
       The shelf also has to start at the top — landing mid-grid on page two
       looks like the page simply reshuffled under the shopper. */
    setSearchParams(searchParamsWithPage(searchParams, clamped))
    document.querySelector('.products-main')?.scrollIntoView({ block: 'start' })
  }

  /* The heading is the place, not a label for the place. It read
     "קטגוריה: כלי בית" — the noun "category" prefixed to a category name, on a
     page that already carries breadcrumbs saying exactly that. And on a
     sub-category it printed the full path a second time, so "כלי בית" appeared
     twice within 40px of itself. The heading now names the narrowest thing the
     shopper is looking at and lets the breadcrumbs carry the path. */
  const title = useMemo(() => {
    if (!categorySlug) return 'מוצרים'
    if (subCategorySlug) return subLabel || subCategorySlug
    return catLabel || departmentLabel(categorySlug)
  }, [categorySlug, subCategorySlug, catLabel, subLabel])

  /* isAdmin, not merely signed in. Any shopper who created an account saw an
     "add product" control on the storefront. It is still inert — see the
     summary; gating it is the half that is unambiguously a fix. */
  const canAdd = !!userService.getLoggedinUser()?.isAdmin

  const isFiltered = hasActiveFilters(filterBy)

  /* An empty grid has to say which of the shopper's own choices emptied it —
     "no results" alone leaves them guessing between the search box, the price
     slider and a genuinely bare department. */
  const activeFilterSummary = useMemo(() => {
    const parts = []
    if (filterBy?.txt) parts.push(`חיפוש: "${filterBy.txt}"`)

    const hasMin = filterBy?.minPrice !== '' && filterBy?.minPrice != null
    const hasMax = filterBy?.maxPrice !== '' && filterBy?.maxPrice != null
    if (hasMin && hasMax) parts.push(`מחיר: ${filterBy.minPrice}–${filterBy.maxPrice} ₪`)
    else if (hasMin) parts.push(`מחיר: מ־${filterBy.minPrice} ₪`)
    else if (hasMax) parts.push(`מחיר: עד ${filterBy.maxPrice} ₪`)

    if (filterBy?.inStock) parts.push('במלאי בלבד')

    return parts.join(' · ')
  }, [filterBy])

  const emptyState = isFiltered ? (
    <EmptyState
      icon="search"
      title="אין מוצרים שתואמים את הסינון"
      hint={activeFilterSummary}
      actionLabel="נקה סינון"
      onAction={() => dispatch(clearFilters())}
    />
  ) : (
    <EmptyState
      title={`אין כרגע מוצרים ב${catLabel || 'מחלקה הזו'}`}
      hint="המלאי משתנה בין המחלקות. אפשר לעבור למחלקה אחרת מהתפריט."
      actionLabel="לכל המחלקות"
      actionTo="/"
    />
  )

  return (
    <div className="product-page full">
      <div className="product-page__container">
        <ProductBreadcrumbs
          categorySlug={categorySlug}
          subCategorySlug={subCategorySlug}
          catLabel={catLabel}
          subLabel={subLabel}
        />

        {/* Title, count and controls used to live in three separate bordered
            panels stacked on top of each other, which on a phone pushed the
            first product roughly 800px down the page. One head, one bar. */}
        <header className="product-head">
          <h1 className="product-title">{title}</h1>
          {/* The range only appears when there is a range to state. On a single
              page "מציג 1–5 מתוך 5" is three numbers saying one thing. */}
          <p className="results-line" aria-live="polite">
            {isLoading
              ? 'טוען מוצרים…'
              : totalPages > 1
                ? `מציג ${from}–${to} מתוך ${total} מוצרים`
                : `${total} מוצרים`}
          </p>
        </header>

        <div className="product-toolbar">
          <button
            ref={filtersBtnRef}
            className="toolbar-filters-btn"
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            aria-expanded={isFiltersOpen}
            aria-haspopup="dialog"
            aria-controls="filters-sheet"
          >
            סינון
          </button>

          <select
            className="toolbar-select"
            value={sortTokenFromFilter(filterBy)}
            onChange={onChangeSort}
            aria-label="מיון"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.labelHe}</option>
            ))}
          </select>

          {/* Narrows the products already on screen. The header's magnifier
              searches the whole catalogue and navigates away — different job,
              which is why both exist. */}
          <input
            className="toolbar-search"
            value={filterBy.txt || ''}
            onChange={onChangeTxt}
            type="search"
            placeholder="סינון בתוך הקטגוריה…"
            aria-label="סינון בתוך הקטגוריה"
          />

          {canAdd && <button className="btn" type="button">הוסף מוצר</button>}
        </div>

        <ActiveFilterChips
          filterBy={filterBy}
          categorySlug={categorySlug}
          subCategorySlug={subCategorySlug}
          subLabel={subLabel}
        />

        <div className="products-page">
          {isFiltersOpen && (
            <div
              className="filters-scrim"
              onClick={() => setIsFiltersOpen(false)}
              role="presentation"
            />
          )}

          {/* Dialog semantics only while open. The same element is a plain
              sidebar column from $bp-lg up, where the filter button that opens
              it does not render — so it can only ever be open below that width,
              and announcing a static column as a modal would be a lie. */}
          <aside
            ref={sheetRef}
            id="filters-sheet"
            className={`products-sidebar ${isFiltersOpen ? 'is-open' : ''}`}
            {...(isFiltersOpen
              ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'filters-sheet-title' }
              : {})}
          >
            <div className="products-sidebar__head">
              <h2 id="filters-sheet-title">סינון</h2>
              <button
                ref={closeBtnRef}
                className="products-sidebar__close"
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                aria-label="סגור סינון"
              >
                ✕
              </button>
            </div>

            <ProductSidebarFilters />
          </aside>

          <div className="products-main">
            {/* Skeletons only when there is genuinely nothing on screen yet.
                Every keystroke in the in-category filter refetches, so keying
                them off isLoading alone would blank the whole shelf and rebuild
                it on each letter typed. While results are already showing, the
                aria-live count line carries the loading state instead. */}
            <ProductList
              products={pageProducts}
              isLoading={isLoading && !products.length}
              empty={emptyState}
            />

            {!isLoading && (
              <Pagination page={page} totalPages={totalPages} onChange={onChangePage} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* mapSortToSelectValue() used to live here, hard-coding the same four sorts a
   second time. It is now sortTokenFromFilter() in product-filter.service.js,
   derived from the SORT_OPTIONS list that also builds the <select> — one place
   to add a sort instead of three that had to agree. */
