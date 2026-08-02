import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import { loadProducts, setFilterBy } from '../store/actions/product.actions'
import { userService } from '../services/user'
import { productService } from '../services/product/'
import { showErrorMsg } from '../services/event-bus.service'

import { ProductBreadcrumbs } from '../cmps/ProductBreadcrumbs.jsx'
import { ProductList } from '../cmps/ProductList.jsx'
import { ProductSidebarFilters } from '../cmps/ProductSidebarFilters.jsx'

export function ProductIndex() {
  const dispatch = useDispatch()

  // ✅ תואם ל-RootCmp שלך:
  // category/:categorySlug
  // category/:categorySlug/:subCategorySlug
  const { categorySlug = '', subCategorySlug = '' } = useParams()

  const products = useSelector(storeState => storeState.productModule.products)
  const filterBy = useSelector(storeState => storeState.productModule.filterBy)
  const isLoading = useSelector(storeState => storeState.productModule.isLoading)

  // ✅ Labels בעברית (כדי שגם הכותרת וגם ה-breadcrumbs יהיו בעברית)
  const [catLabel, setCatLabel] = useState('')
  const [subLabel, setSubLabel] = useState('')

  // Filters are a side panel on desktop and a sheet on mobile; one flag drives
  // both, since the sheet styling only applies below the sidebar breakpoint.
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

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
        const nextCatLabel = cat?.labelHe || categorySlug

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

  // ✅ מעדכן פילטרים לפי ה-URL (קטגוריה/תת קטגוריה)
  useEffect(() => {
    if (filterBy.category === categorySlug && filterBy.subCategory === subCategorySlug) return
    dispatch(setFilterBy({ category: categorySlug, subCategory: subCategorySlug }))
  }, [categorySlug, subCategorySlug]) // השארתי כמו שהיה אצלך

  // ✅ טוען מוצרים בכל שינוי filterBy
  useEffect(() => {
    dispatch(loadProducts()).catch(() => showErrorMsg('Cannot load products'))
  }, [filterBy]) // השארתי כמו שהיה אצלך

  // Escape closes the filter sheet, and the page underneath must not scroll
  // while it is open.
  useEffect(() => {
    if (!isFiltersOpen) return

    function onKeyDown(ev) {
      if (ev.key === 'Escape') setIsFiltersOpen(false)
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isFiltersOpen])

  // Leaving the category closes the sheet with it.
  useEffect(() => {
    setIsFiltersOpen(false)
  }, [categorySlug, subCategorySlug])

  function onChangeTxt(ev) {
    dispatch(setFilterBy({ txt: ev.target.value }))
  }

  function onChangeSort(ev) {
    const val = ev.target.value
    if (val === 'reco') return dispatch(setFilterBy({ sortField: '', sortDir: '1' }))
    if (val === 'priceAsc') return dispatch(setFilterBy({ sortField: 'price', sortDir: '1' }))
    if (val === 'priceDesc') return dispatch(setFilterBy({ sortField: 'price', sortDir: '-1' }))
    if (val === 'name') return dispatch(setFilterBy({ sortField: 'name', sortDir: '1' }))
  }

  const total = products?.length || 0
  const from = total ? 1 : 0
  const to = Math.min(total, 24)

  // ✅ כותרת בעברית (labelHe) במקום slug
  const title = useMemo(() => {
    if (!categorySlug) return 'מוצרים'
    if (categorySlug && !subCategorySlug) return `קטגוריה: ${catLabel || categorySlug}`
    return `${catLabel || categorySlug} / ${subLabel || subCategorySlug}`
  }, [categorySlug, subCategorySlug, catLabel, subLabel])

  const canAdd = !!userService.getLoggedinUser()

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
          <p className="results-line" aria-live="polite">
            {isLoading ? 'טוען מוצרים…' : `${total} מוצרים`}
          </p>
        </header>

        <div className="product-toolbar">
          <button
            className="toolbar-filters-btn"
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            aria-expanded={isFiltersOpen}
          >
            סינון
          </button>

          <select
            className="toolbar-select"
            value={mapSortToSelectValue(filterBy)}
            onChange={onChangeSort}
            aria-label="מיון"
          >
            <option value="reco">סידור ברירת מחדל</option>
            <option value="priceAsc">מחיר מהנמוך לגבוה</option>
            <option value="priceDesc">מחיר מהגבוה לנמוך</option>
            <option value="name">שם</option>
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

        <div className="products-page">
          {isFiltersOpen && (
            <div
              className="filters-scrim"
              onClick={() => setIsFiltersOpen(false)}
              role="presentation"
            />
          )}

          <aside className={`products-sidebar ${isFiltersOpen ? 'is-open' : ''}`}>
            <div className="products-sidebar__head">
              <h2>סינון</h2>
              <button
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
            <ProductList products={products} layout="grid" />
          </div>
        </div>
      </div>
    </div>
  )
}

function mapSortToSelectValue(filterBy) {
  const { sortField, sortDir } = filterBy || {}
  if (!sortField) return 'reco'
  if (sortField === 'price' && String(sortDir) === '1') return 'priceAsc'
  if (sortField === 'price' && String(sortDir) === '-1') return 'priceDesc'
  if (sortField === 'name') return 'name'
  return 'reco'
}
