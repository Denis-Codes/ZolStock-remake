import { ProductPreview } from './ProductPreview'

export function ProductList({ products }) {
  if (!products?.length) return null

  return (
    <div className="product-list">
      {products.map(product => (
        <ProductPreview key={product.id} product={product} />
      ))}
    </div>
  )
}
