import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'

import { ProductList } from '../cmps/ProductList'
import { ProductSidebarFilters } from '../cmps/ProductSidebarFilters'
import { loadProducts, setFilterBy } from '../store/actions/product.actions'

export function CategoryPage() {
  const dispatch = useDispatch()
  const { categorySlug, subCategorySlug } = useParams()
  const [searchParams] = useSearchParams()

  const products = useSelector(s => s.productModule.products)
  const filterBy = useSelector(s => s.productModule.filterBy)

  const subFromQuery = searchParams.get('sub') || ''

  // 1) לסנכרן URL -> filterBy
  useEffect(() => {
    const nextFilter = {
      ...filterBy,
      category: categorySlug || '',
      subCategory: subFromQuery || subCategorySlug || '',
    }

    // למנוע לופים מיותרים
    const changed =
      nextFilter.category !== filterBy.category ||
      nextFilter.subCategory !== filterBy.subCategory

    if (changed) dispatch(setFilterBy(nextFilter))
  }, [categorySlug, subCategorySlug, subFromQuery]) // בכוונה בלי filterBy כדי לא ליצור לופ

  // 2) כל שינוי בפילטר -> טען מוצרים
  useEffect(() => {
    dispatch(loadProducts())
  }, [dispatch, filterBy])

  return (
    <>
      <div className="products.grid">
        <section className="products-page full">
          <aside className="products-sidebar">
            <ProductSidebarFilters />
          </aside>

          <main className="products-main">
            <ProductList products={products} />
          </main>
        </section>
      </div>
    </>
  )
}
