import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import { loadProducts, setFilterBy } from '../store/actions/product.actions'
import { userService } from '../services/user'
import { productService } from '../services/product/'
import { showErrorMsg } from '../services/event-bus.service'

import { ProductBreadcrumbs } from '../cmps/ProductBreadcrumbs.jsx'
import { ProductList } from '../cmps/ProductList.jsx'

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

  function onOpenFilters() {
    // בשלב הבא: Sidebar / Modal
    console.log('open filters')
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
    <main className="product-page full">
      <div className="product-page__container">
        <div className="product-page__top">
          <ProductBreadcrumbs
            categorySlug={categorySlug}
            subCategorySlug={subCategorySlug}
            catLabel={catLabel}
            subLabel={subLabel}
          />
          {/* 
        <button className="filters-btn" type="button" onClick={onOpenFilters} aria-label="סינון">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M4 6h10M18 6h2M4 12h2M8 12h12M4 18h12M18 18h2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button> */}
        </div>

        <header className="product-page__header">
          <h2 className="product-title">{title}</h2>
          {canAdd && <button className="btn" type="button">הוסף מוצר</button>}
        </header>

        <div className="product-controls">
          <div className="sort-wrap">
            <select value={mapSortToSelectValue(filterBy)} onChange={onChangeSort} aria-label="מיון">
              <option value="reco">סידור ברירת מחדל</option>
              <option value="priceAsc">מחיר מהנמוך לגבוה</option>
              <option value="priceDesc">מחיר מהגבוה לנמוך</option>
              <option value="name">שם</option>
            </select>
          </div>

          <div className="search-wrap">
            <input
              value={filterBy.txt || ''}
              onChange={onChangeTxt}
              type="search"
              placeholder="חיפוש מוצר..."
              aria-label="חיפוש"
            />
          </div>
        </div>

        <p className="results-line">
          {isLoading ? 'טוען...' : `מציג ${to}–${from} מתוך ${total} תוצאות`}
        </p>

        <ProductList products={products} layout="grid" />
      </div>
    </main>
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
