import { Link } from 'react-router-dom'

export function ProductPreview({ product }) {
  const imgUrl = product.images?.[0] || ''

  return (
    <article className="product-preview">
      <Link to={`/product/${product.id}`} className="product-preview-link">
        {imgUrl && (
          <img
            className="product-preview-img"
            src={imgUrl}
            alt={product.displayNameHe}
            loading="lazy"
          />
        )}

        <h3 className="product-preview-title">{product.displayNameHe}</h3>

        <div className="product-preview-meta">
          <span className="product-preview-price">{product.price} ₪</span>
          {!product.inStock && <span className="product-preview-badge">אזל מהמלאי</span>}
        </div>
      </Link>
    </article>
  )
}
