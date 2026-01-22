import { ProductPreview } from './ProductPreview.jsx'

export function ProductList({ products = [] }) {
  if (!products.length) return <p className="empty-state">אין מוצרים להצגה</p>
  

  return (
    <section className="product-list">
      {products.map(product => (
        <ProductPreview key={product.id} product={product} />
      ))}
    </section>
  )
}
