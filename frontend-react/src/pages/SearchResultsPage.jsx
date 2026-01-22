import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadProducts, setFilterBy } from '../store/actions/product.actions'
import { ProductList } from '../cmps/ProductList'

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

  if (isLoading) return <section>טוען...</section>

  return (
    <section className="search-results-page">
      {!!q && <h2>תוצאות חיפוש ל- "{q}"</h2>}

      {!products.length && <p>לא נמצאו מוצרים עבור "{q}"</p>}
      <ProductList products={products} />
    </section>
  )
}
