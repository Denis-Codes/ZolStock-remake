import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadProducts, setFilterBy } from '../store/actions/product.actions'
import { ProductList } from '../cmps/ProductList'
import { EmptyState } from '../cmps/EmptyState.jsx'

export function SearchResultsPage() {
  const dispatch = useDispatch()
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()

  const products = useSelector(state => state.productModule.products)
  const isLoading = useSelector(state => state.productModule.isLoading)
  const filterBy = useSelector(state => state.productModule.filterBy)

  useEffect(() => {
    if (!q) return

    // טוענים תוצאות לפי ה-q מה-URL
    const loadFilter = {
      ...(filterBy || {}),
      txt: q,
      category: '',
      subCategory: '',
    }

    dispatch(loadProducts(loadFilter))

    // ✅ אבל שורת החיפוש בהדר מתאפסת לריקה
    dispatch(setFilterBy({ ...(filterBy || {}), txt: '' }))
  }, [q, dispatch])

  /* The loading branch used to replace the whole page with the bare word
     "טוען...", so the heading the shopper had just navigated to disappeared and
     came back. The heading stays put and the grid fills underneath it. */
  return (
    <section className="search-results-page">
      {!!q && <h2>תוצאות חיפוש ל- "{q}"</h2>}

      <ProductList
        products={products}
        isLoading={isLoading}
        empty={
          <EmptyState
            icon="search"
            title={`לא נמצאו מוצרים עבור "${q}"`}
            hint="אפשר לנסות מילה אחת ומדויקת יותר — שם מוצר או קטגוריה — או לעיין במחלקות."
            actionLabel="לכל המחלקות"
            actionTo="/"
          />
        }
      />
    </section>
  )
}
