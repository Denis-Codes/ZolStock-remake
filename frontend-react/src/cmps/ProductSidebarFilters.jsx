import { useDispatch, useSelector } from 'react-redux'
import { setFilterBy } from '../store/actions/product.actions'

export function ProductSidebarFilters() {
  const dispatch = useDispatch()
  const filterBy = useSelector(storeState => storeState.productModule.filterBy)

  function updateFilter(patch) {
    dispatch(setFilterBy({ ...(filterBy || {}), ...patch }))
  }

  function onMinPriceChange(ev) {
    updateFilter({ minPrice: ev.target.value })
  }

  function onMaxPriceChange(ev) {
    updateFilter({ maxPrice: ev.target.value })
  }

  function onClearFilters() {
    // ✅ שומרים הקשר (קטגוריה/תת־קטגוריה) ומאפסים רק פילטרים
    dispatch(
      setFilterBy({
        ...(filterBy || {}),
        // keep context:
        category: filterBy?.category || '',
        subCategory: filterBy?.subCategory || '',

        // reset filters:
        txt: '',
        minPrice: '',
        maxPrice: '',
        inStock: '',
        sortField: '',
        sortDir: '1',
      })
    )
  }

  return (
    <section className="sidebar-filters">
      <div className="sidebar-head">
        <h3>סינון</h3>
        <button type="button" className="clear-btn" onClick={onClearFilters}>
          ניקוי
        </button>
      </div>

      <div className="filter-card">
        <h4>טווח מחירים</h4>

        <div className="price-row">
          <label className="price-field">
            <span className="lbl">מינ׳</span>
            <input
              type="number"
              inputMode="numeric"
              value={filterBy?.minPrice || ''}
              onChange={onMinPriceChange}
              placeholder="0"
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
              value={filterBy?.maxPrice || ''}
              onChange={onMaxPriceChange}
              placeholder="600"
              min="0"
            />
          </label>
        </div>
      </div>
    </section>
  )
}
