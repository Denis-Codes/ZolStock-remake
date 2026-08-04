import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearFilters, setFilterBy } from '../store/actions/product.actions'
import { productService } from '../services/product'

const DEFAULT_BOUNDS = { min: 0, max: 1000 }

export function ProductSidebarFilters() {
  const dispatch = useDispatch()
  const filterBy = useSelector(storeState => storeState.productModule.filterBy)

  const [bounds, setBounds] = useState(DEFAULT_BOUNDS)
  const [subCategories, setSubCategories] = useState([])

  /* The taxonomy has eight departments and every one of them is subdivided, but
     the only way into a sub-category was the header dropdown — so once a
     shopper was on a listing page, the narrowest cut they could make was a
     price range. These are links, not filters: sub-category is a route segment,
     and treating it as filter state would give the page two ideas about where
     the shopper is. */
  useEffect(() => {
    let isCancelled = false
    const category = filterBy?.category || ''

    if (!category) {
      setSubCategories([])
      return
    }

    productService.getSubCategories(category).then(subs => {
      if (isCancelled) return
      setSubCategories(subs || [])
    })

    return () => {
      isCancelled = true
    }
  }, [filterBy?.category])

  // The slider's own min/max come from the category's full price range
  // (ignoring the current price filter, so the track doesn't shrink as the
  // user drags it) — refetched only when category/sub-category changes.
  useEffect(() => {
    let isCancelled = false

    productService
      .query({ category: filterBy?.category || '', subCategory: filterBy?.subCategory || '' })
      .then((products) => {
        if (isCancelled || !products.length) return
        const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n))
        if (!prices.length) return
        setBounds({ min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) })
      })

    return () => {
      isCancelled = true
    }
  }, [filterBy?.category, filterBy?.subCategory])

  const minPrice = filterBy?.minPrice === '' || filterBy?.minPrice == null
    ? bounds.min
    : +filterBy.minPrice
  const maxPrice = filterBy?.maxPrice === '' || filterBy?.maxPrice == null
    ? bounds.max
    : +filterBy.maxPrice

  function updateFilter(patch) {
    dispatch(setFilterBy({ ...(filterBy || {}), ...patch }))
  }

  function onMinSliderChange(ev) {
    const next = Math.min(+ev.target.value, maxPrice - 1)
    updateFilter({ minPrice: next })
  }

  function onMaxSliderChange(ev) {
    const next = Math.max(+ev.target.value, minPrice + 1)
    updateFilter({ maxPrice: next })
  }

  function onMinFieldChange(ev) {
    updateFilter({ minPrice: ev.target.value })
  }

  function onMaxFieldChange(ev) {
    updateFilter({ maxPrice: ev.target.value })
  }

  // ✅ שומרים הקשר (קטגוריה/תת־קטגוריה) ומאפסים רק פילטרים.
  // The body moved to clearFilters() so the empty state's נקה סינון button
  // undoes exactly what this one does — see the note on the action.
  function onClearFilters() {
    dispatch(clearFilters())
  }

  function onToggleInStock(ev) {
    updateFilter({ inStock: ev.target.checked ? 'true' : '' })
  }

  const isInStockOnly = filterBy?.inStock === 'true' || filterBy?.inStock === true

  const range = Math.max(1, bounds.max - bounds.min)
  const minPercent = ((minPrice - bounds.min) / range) * 100
  const maxPercent = ((maxPrice - bounds.min) / range) * 100

  return (
    <section className="sidebar-filters">
      <div className="sidebar-head">
        <h3>סינון</h3>
        <button type="button" className="clear-btn" onClick={onClearFilters}>
          ניקוי
        </button>
      </div>

      {subCategories.length > 1 && (
        <div className="filter-card">
          <h4>תת־מחלקה</h4>

          <ul className="subcategory-list">
            <li>
              <NavLink
                to={`/category/${filterBy.category}`}
                end
                className={({ isActive }) => `subcategory-link ${isActive ? 'is-active' : ''}`}
              >
                הכל
              </NavLink>
            </li>

            {subCategories.map(sub => (
              <li key={sub.slug}>
                <NavLink
                  to={`/category/${filterBy.category}/${sub.slug}`}
                  className={({ isActive }) => `subcategory-link ${isActive ? 'is-active' : ''}`}
                >
                  {sub.labelHe || sub.slug}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="filter-card">
        <h4>זמינות</h4>

        <label className="filter-check">
          <input
            type="checkbox"
            checked={isInStockOnly}
            onChange={onToggleInStock}
          />
          <span>הצג רק מוצרים במלאי</span>
        </label>
      </div>

      <div className="filter-card">
        <h4>טווח מחירים</h4>

        <div className="price-slider">
          <div className="price-slider-track">
            <div
              className="price-slider-range"
              style={{ right: `${minPercent}%`, left: `${100 - maxPercent}%` }}
            />
          </div>
          <input
            type="range"
            className="price-slider-input"
            min={bounds.min}
            max={bounds.max}
            value={minPrice}
            onChange={onMinSliderChange}
            aria-label="מחיר מינימלי"
          />
          <input
            type="range"
            className="price-slider-input"
            min={bounds.min}
            max={bounds.max}
            value={maxPrice}
            onChange={onMaxSliderChange}
            aria-label="מחיר מקסימלי"
          />
        </div>

        <div className="price-row">
          <label className="price-field">
            <span className="lbl">מינ׳</span>
            <input
              type="number"
              inputMode="numeric"
              value={filterBy?.minPrice ?? ''}
              onChange={onMinFieldChange}
              placeholder={String(bounds.min)}
              min="0"
            />
          </label>

          <span className="dash" aria-hidden="true">
            —
          </span>

          <label className="price-field">
            <span className="lbl">מקס׳</span>
            <input
              type="number"
              inputMode="numeric"
              value={filterBy?.maxPrice ?? ''}
              onChange={onMaxFieldChange}
              placeholder={String(bounds.max)}
              min="0"
            />
          </label>
        </div>
      </div>
    </section>
  )
}
