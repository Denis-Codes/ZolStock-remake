import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { loadProducts } from '../store/actions/product.actions'
import { ProductList } from '../cmps/ProductList'


export function CategoryPage() {
    const { categorySlug, subCategorySlug } = useParams()

    const products = useSelector(state => state.productModule.products)
    const isLoading = useSelector(state => state.productModule.isLoading)

    useEffect(() => {
        loadProducts({
            category: categorySlug,
            subCategory: subCategorySlug || '',
        })
    }, [categorySlug, subCategorySlug])

    if (isLoading) return <section>טוען...</section>

    return (
        <section className="category-page">
            {!products.length && <p>לא נמצאו מוצרים</p>}
            <ProductList products={products} />
        </section>
    )


}
