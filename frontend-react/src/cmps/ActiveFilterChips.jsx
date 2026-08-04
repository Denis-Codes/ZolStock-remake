import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clearFilters, setFilterBy } from '../store/actions/product.actions'

/**
 * What is currently narrowing the shelf, and how to undo each piece of it.
 *
 * Three of these filters live somewhere the shopper cannot see while looking at
 * the results: the price slider is inside a drawer on anything under 1200px,
 * the in-stock toggle with it, and the sub-category is only visible as a
 * breadcrumb. A shelf showing two products out of forty gave no on-screen
 * account of why. Each chip states one filter and removes exactly that one.
 *
 * The sub-category chip navigates rather than dispatching, because the
 * sub-category is a route segment — removing it means going up to the parent
 * category, not editing filter state.
 */
export function ActiveFilterChips({ filterBy, categorySlug, subCategorySlug, subLabel }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const chips = []

  if (subCategorySlug) {
    chips.push({
      key: 'sub',
      label: subLabel || subCategorySlug,
      onRemove: () => navigate(`/category/${categorySlug}`),
    })
  }

  if (filterBy?.txt) {
    chips.push({
      key: 'txt',
      label: `חיפוש: ${filterBy.txt}`,
      onRemove: () => dispatch(setFilterBy({ txt: '' })),
    })
  }

  const hasMin = filterBy?.minPrice !== '' && filterBy?.minPrice != null
  const hasMax = filterBy?.maxPrice !== '' && filterBy?.maxPrice != null
  if (hasMin || hasMax) {
    let label
    if (hasMin && hasMax) label = `מחיר: ${filterBy.minPrice}–${filterBy.maxPrice} ₪`
    else if (hasMin) label = `מחיר: מ־${filterBy.minPrice} ₪`
    else label = `מחיר: עד ${filterBy.maxPrice} ₪`

    /* One chip, both bounds. Two chips would let a shopper remove the floor and
       leave a ceiling they never set, which is not a state they built. */
    chips.push({
      key: 'price',
      label,
      onRemove: () => dispatch(setFilterBy({ minPrice: '', maxPrice: '' })),
    })
  }

  if (filterBy?.inStock === 'true' || filterBy?.inStock === true) {
    chips.push({
      key: 'inStock',
      label: 'במלאי בלבד',
      onRemove: () => dispatch(setFilterBy({ inStock: '' })),
    })
  }

  if (!chips.length) return null

  return (
    <div className="active-filters">
      <span className="active-filters__label">מסננים פעילים:</span>

      <ul className="active-filters__list">
        {chips.map(chip => (
          <li key={chip.key}>
            <button
              className="filter-chip"
              type="button"
              onClick={chip.onRemove}
              aria-label={`הסר ${chip.label}`}
            >
              <span className="filter-chip__label">{chip.label}</span>
              <svg
                className="filter-chip__x"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {/* Only worth its own control once undoing them one at a time is a chore. */}
      {chips.length > 1 && (
        <button
          className="active-filters__clear"
          type="button"
          onClick={() => {
            if (subCategorySlug) navigate(`/category/${categorySlug}`)
            dispatch(clearFilters())
          }}
        >
          נקה הכל
        </button>
      )}
    </div>
  )
}
