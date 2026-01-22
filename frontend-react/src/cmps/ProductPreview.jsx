import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '../store/actions/wishlist.actions'
import { SaleBadge } from './SaleBadge'
import { StarRating } from './StarRating'
import { AddToCartBtn } from './AddToCartBtn'
import { StockWarning } from './StockWarning'

function formatPriceParts(price) {
  const num = Number(price) || 0
  const whole = Math.floor(num)
  const frac = Math.round((num - whole) * 100)
  return { whole, frac: String(frac).padStart(2, '0') }
}

export function ProductPreview({ product }) {
  const dispatch = useDispatch()
  const wishlist = useSelector((storeState) => storeState.wishlistModule.wishlist)
  const isWishlisted = wishlist.includes(product.id)

  // Use sale price if available, otherwise regular price
  const displayPrice = product.salePrice || product.price
  const hasDiscount = product.discountPercent > 0

  const { whole, frac } = formatPriceParts(displayPrice)
  const originalPriceParts = hasDiscount ? formatPriceParts(product.originalPrice) : null

  const title = product.displayNameHe || product.name || ''
  const to = `/product/${product.id}`
  const img = product.images?.[0] || product.imgUrl || product.image || ''

  function handleWishlistClick(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    dispatch(toggleWishlistItem(product.id))
  }

  return (
    <article className={`product-card ${!product.inStock ? 'out-of-stock' : ''}`}>
      <Link className="card-media" to={to}>
        {img ? (
          <img src={img} alt={title} loading="lazy" />
        ) : (
          <div className="media-placeholder">אין תמונה</div>
        )}
      </Link>

      {/* Sale badge */}
      <SaleBadge discountPercent={product.discountPercent} />

      {/* Wishlist button */}
      <button
        className={`wish-btn ${isWishlisted ? 'active' : ''}`}
        type="button"
        onClick={handleWishlistClick}
        aria-label={isWishlisted ? 'הסר ממועדפים' : 'הוספה למועדפים'}
      >
        {isWishlisted ? '♥' : '♡'}
      </button>

      <div className="card-body">
        <Link to={to} className="card-title-link">
          <h3 className="card-title">{title}</h3>
        </Link>

        {!!product.displaySubCategoryHe && (
          <p className="card-line">{product.displaySubCategoryHe}</p>
        )}

        {/* Star rating */}
        <StarRating
          rating={product.rating}
          reviewCount={product.reviewCount}
          size="small"
        />

        {/* Stock warning */}
        <StockWarning stockQty={product.stockQty} inStock={product.inStock} />

        {/* Price section */}
        <div className="card-price-section">
          {hasDiscount && originalPriceParts && (
            <div className="original-price" aria-label={`מחיר מקורי ${originalPriceParts.whole} שקלים`}>
              <span className="currency">₪</span>
              <span className="amount">{originalPriceParts.whole}</span>
            </div>
          )}

          <div
            className={`card-price ${hasDiscount ? 'sale' : ''}`}
            aria-label={`מחיר ${whole}.${frac} שקלים`}
          >
            <span className="ils">₪</span>
            <span className="whole">{whole}</span>
            {frac !== '00' && <span className="frac">{frac}</span>}
          </div>
        </div>

        {/* Add to cart button */}
        <AddToCartBtn product={product} size="small" showText={true} />
      </div>
    </article>
  )
}
