import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistItem } from '../store/actions/wishlist.actions'
import { getVariantColorValue, onProductImageError } from '../services/util.service'
import imageFit from '../data/product-image-fit.json'
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

const MAX_VISIBLE_SWATCHES = 5

/**
 * The product shots are all 1024×1024, but each subject fills a different
 * share of its frame (75%–97%), so identical tiles still rendered products at
 * noticeably different sizes. `product-image-fit.json` holds a per-file scale
 * and centring offset, measured from each image's actual subject bounding box,
 * that normalises every product's longest side to the same share of the tile.
 *
 * Unknown files fall through to `scale(1)` — the map is an enhancement, not a
 * requirement, so a newly added photo still renders correctly.
 */
function getImageFitStyle(src) {
  if (!src) return undefined
  const file = src.split('/').pop()
  const fit = imageFit[file]
  if (!fit) return undefined
  return {
    '--fit-scale': fit.s,
    '--fit-x': `${fit.x}%`,
    '--fit-y': `${fit.y}%`,
  }
}

function getSwatchColors(variants) {
  if (!variants?.length) return []
  const seen = new Set()
  const colors = []

  for (const v of variants) {
    if (!v.color || seen.has(v.color)) continue
    seen.add(v.color)
    colors.push({ color: v.color, colorHe: v.colorHe || v.color })
  }

  return colors
}

function ProductPreview({ product }) {
  const dispatch = useDispatch()
  const wishlist = useSelector((storeState) => storeState.wishlistModule.wishlist)
  const isWishlisted = wishlist.includes(product._id)

  // Use sale price if available, otherwise regular price
  const displayPrice = product.salePrice || product.price
  const hasDiscount = product.discountPercent > 0

  const { whole, frac } = formatPriceParts(displayPrice)
  const originalPriceParts = hasDiscount ? formatPriceParts(product.originalPrice) : null

  const title = product.displayNameHe || product.name || ''
  const to = `/product/${product._id}`
  const img = product.images?.[0] || product.imgUrl || product.image || ''

  const swatchColors = getSwatchColors(product.variants)
  const visibleSwatches = swatchColors.slice(0, MAX_VISIBLE_SWATCHES)
  const hiddenSwatchCount = swatchColors.length - visibleSwatches.length

  function handleWishlistClick(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    dispatch(toggleWishlistItem(product._id))
  }

  return (
    <article className={`product-card ${!product.inStock ? 'out-of-stock' : ''}`}>
      <Link className="card-media" to={to}>
        {img ? (
          <img src={img} alt={title} loading="lazy" style={getImageFitStyle(img)} onError={onProductImageError} />
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

        {/* Subcategory, rating and swatches share one meta line. They used to
            occupy three separate fixed rows, which made every card tall and
            mostly empty — the grid read as styling rather than as a catalogue. */}
        <div className="card-meta">
          {!!product.displaySubCategoryHe && (
            <span className="card-line">{product.displaySubCategoryHe}</span>
          )}

          <StarRating
            rating={product.rating}
            reviewCount={product.reviewCount}
            size="small"
          />

          {visibleSwatches.length > 0 && (
            <span className="card-swatches" aria-label="צבעים זמינים">
              {visibleSwatches.map(({ color, colorHe }) => (
                <span
                  key={color}
                  className="card-swatch"
                  title={colorHe}
                  style={{ '--swatch-color': getVariantColorValue(color) }}
                />
              ))}
              {hiddenSwatchCount > 0 && (
                <span className="card-swatch-more">+{hiddenSwatchCount}</span>
              )}
            </span>
          )}
        </div>

        {/* Price section */}
        <div className="card-price-section">
          {hasDiscount && originalPriceParts && (
            <div className="original-price" aria-label={`מחיר מקורי ${originalPriceParts.whole} שקלים`}>
              <span className="currency">₪</span>
              <span className="amount">{originalPriceParts.whole}</span>
            </div>
          )}

          <div
            className="card-price"
            aria-label={`מחיר ${whole}.${frac} שקלים`}
          >
            <span className="ils">₪</span>
            <span className="whole">{whole}</span>
            {frac !== '00' && <span className="frac">{frac}</span>}
          </div>

          <StockWarning stockQty={product.stockQty} inStock={product.inStock} />
        </div>

        {/* Add to cart button */}
        <AddToCartBtn product={product} size="small" showText={true} />
      </div>
    </article>
  )
}

// Memoize component with custom comparison to prevent unnecessary re-renders
export default memo(ProductPreview, (prevProps, nextProps) => {
  // Only re-render if these specific properties change
  return (
    prevProps.product._id === nextProps.product._id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.salePrice === nextProps.product.salePrice &&
    prevProps.product.discountPercent === nextProps.product.discountPercent &&
    prevProps.product.inStock === nextProps.product.inStock &&
    prevProps.product.stockQty === nextProps.product.stockQty
  )
})
