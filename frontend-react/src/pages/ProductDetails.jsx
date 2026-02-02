import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { productService } from '../services/product'
import { ProductList } from '../cmps/ProductList.jsx'
import { ProductBreadcrumbs } from '../cmps/ProductBreadcrumbs.jsx'
import { ImageGallery } from '../cmps/ImageGallery.jsx'
import { VariantSelector } from '../cmps/VariantSelector.jsx'
import { StarRating } from '../cmps/StarRating.jsx'
import { SaleBadge } from '../cmps/SaleBadge.jsx'
import { AddToCartBtn } from '../cmps/AddToCartBtn.jsx'
import { toggleWishlistItem } from '../store/actions/wishlist.actions'

function formatPriceILS(price) {
  const num = Number(price) || 0
  return num.toFixed(0)
}

async function getSimilarProducts(curr, limit = 8) {
  if (!curr) return []

  const currCat = curr.category || curr.displayCategoryHe
  const currSub = curr.subCategory || curr.displaySubCategoryHe
  const currTags = new Set(curr.displayTagsHe || [])

  // Get all products
  const all = await productService.query({})

  const scored = all
    .filter(p => p.id !== curr.id)
    .map(p => {
      let score = 0
      if ((p.category || p.displayCategoryHe) && (p.category || p.displayCategoryHe) === currCat) score += 4
      if ((p.subCategory || p.displaySubCategoryHe) && (p.subCategory || p.displaySubCategoryHe) === currSub) score += 6

      const pTags = p.displayTagsHe || []
      for (const t of pTags) if (currTags.has(t)) score += 1

      const d = Math.abs((Number(p.price) || 0) - (Number(curr.price) || 0))
      if (d < 20) score += 1

      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.p)

  return scored
}

export function ProductDetails() {
  const { productId } = useParams()
  const dispatch = useDispatch()
  const wishlist = useSelector((storeState) => storeState.wishlistModule.wishlist)

  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])

  useEffect(() => {
    async function loadProduct() {
      const prod = await productService.getById(productId)
      setProduct(prod)

      if (prod) {
        const similar = await getSimilarProducts(prod, 8)
        setSimilarProducts(similar)
      }
    }
    loadProduct()
  }, [productId])

  const isWishlisted = product ? wishlist.includes(product.id) : false

  if (!product) {
    return (
      <section className="product-details">
        <div className="pd-container">
          <h2 className="pd-notfound-title">המוצר לא נמצא</h2>
          <Link className="pd-back" to="/">חזרה לדף הבית</Link>
        </div>
      </section>
    )
  }

  const title = product.displayNameHe || product.name
  const categoryHe = product.displayCategoryHe
  const subCategoryHe = product.displaySubCategoryHe
  const tagsHe = product.displayTagsHe || []
  const hasVariants = product.variants?.length > 0
  const hasDiscount = product.discountPercent > 0

  // Calculate display price
  const displayPrice = product.salePrice || product.price
  const originalPrice = product.originalPrice || product.price

  // Get stock info based on selected variant or product
  const stockInfo = selectedVariant
    ? { inStock: selectedVariant.inStock, stockQty: selectedVariant.stockQty }
    : { inStock: product.inStock, stockQty: product.stockQty }

  function handleWishlistClick() {
    dispatch(toggleWishlistItem(product.id))
  }

  function handleQuantityChange(delta) {
    const maxStock = stockInfo.stockQty || 99
    setQuantity(prev => Math.max(1, Math.min(prev + delta, maxStock)))
  }

  return (
    <section className="product-details">
      <div className="pd-container">
        <ProductBreadcrumbs
          categorySlug={product.category}
          subCategorySlug={product.subCategory}
          catLabel={product.displayCategoryHe}
          subLabel={product.displaySubCategoryHe}
        />

        <div className="pd-top">
          {/* Media section with gallery */}
          <div className="pd-media">
            <ImageGallery images={product.images} productName={title} />
            <SaleBadge discountPercent={product.discountPercent} size="large" />
          </div>

          {/* Product info section */}
          <div className="pd-info">
            <h1 className="pd-title">{title}</h1>

            {/* Star rating */}
            <StarRating
              rating={product.rating}
              reviewCount={product.reviewCount}
              showCount={true}
              size="medium"
            />

            {/* Price section */}
            <div className="pd-price-section">
              {hasDiscount && (
                <div className="pd-original-price" dir="ltr">
                  <span className="pd-currency">₪</span>
                  <span className="pd-price strikethrough">{formatPriceILS(originalPrice)}</span>
                </div>
              )}
              <div className={`pd-price-row ${hasDiscount ? 'sale' : ''}`} dir="ltr">
                <span className="pd-currency">₪</span>
                <span className="pd-price">{formatPriceILS(displayPrice)}</span>
              </div>
              {hasDiscount && (
                <span className="pd-discount-label">חיסכון של {product.discountPercent}%</span>
              )}
            </div>

            {/* Product meta */}
            <div className="pd-meta">
              {product.id && <div className="pd-sku">מק״ט: <span>{product.id}</span></div>}
              {product.brand && <div className="pd-brand">מותג: <span>{product.brand}</span></div>}
              {(categoryHe || subCategoryHe) && (
                <div className="pd-cat">
                  {categoryHe || ''}
                  {subCategoryHe ? ` / ${subCategoryHe}` : ''}
                </div>
              )}
            </div>

            {/* Stock status */}
            <div className={'pd-stock ' + (stockInfo.inStock ? 'is-in' : 'is-out')}>
              {stockInfo.inStock ? (
                stockInfo.stockQty <= 3 ? (
                  <span className="low-stock">נותרו רק {stockInfo.stockQty} במלאי!</span>
                ) : (
                  <span>במלאי ({stockInfo.stockQty})</span>
                )
              ) : (
                'אזל מהמלאי'
              )}
            </div>

            {/* Variant selector for clothing */}
            {hasVariants && (
              <VariantSelector
                variants={product.variants}
                onVariantSelect={setSelectedVariant}
              />
            )}

            {/* Quantity selector */}
            <div className="pd-quantity">
              <label>כמות:</label>
              <div className="quantity-controls">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="quantity-value">{quantity}</span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= (stockInfo.stockQty || 99)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Tags */}
            {!!tagsHe.length && (
              <div className="pd-tags">
                {tagsHe.slice(0, 6).map(t => (
                  <span key={t} className="pd-tag">{t}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="pd-actions">
              <AddToCartBtn
                product={product}
                selectedVariant={selectedVariant}
                size="large"
                showText={true}
              />
              <button
                className={`pd-btn pd-btn-ghost ${isWishlisted ? 'active' : ''}`}
                onClick={handleWishlistClick}
                aria-label={isWishlisted ? 'הסר ממועדפים' : 'הוסף למועדפים'}
              >
                {isWishlisted ? '♥' : '♡'}
              </button>
            </div>

            <p className="pd-note">
              * יתכנו שינויים בין הסניפים. בכפוף למגוון בסניף.
            </p>

            {/* Specs section */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="pd-specs">
                <h3 className="pd-specs-title">מפרט טכני</h3>
                <dl className="pd-specs-list">
                  {product.specs.dimensionsCm && (
                    <>
                      <dt>מידות</dt>
                      <dd>
                        {product.specs.dimensionsCm.width && `רוחב: ${product.specs.dimensionsCm.width} ס״מ`}
                        {product.specs.dimensionsCm.depth && ` | עומק: ${product.specs.dimensionsCm.depth} ס״מ`}
                        {product.specs.dimensionsCm.height && ` | גובה: ${product.specs.dimensionsCm.height} ס״מ`}
                        {product.specs.dimensionsCm.diameter && `קוטר: ${product.specs.dimensionsCm.diameter} ס״מ`}
                      </dd>
                    </>
                  )}
                  {product.specs.materialHe && (
                    <>
                      <dt>חומר</dt>
                      <dd>{product.specs.materialHe}</dd>
                    </>
                  )}
                  {product.specs.colorHe && (
                    <>
                      <dt>צבע</dt>
                      <dd>{product.specs.colorHe}</dd>
                    </>
                  )}
                  {product.specs.weightKg && (
                    <>
                      <dt>משקל</dt>
                      <dd>{product.specs.weightKg} ק״ג</dd>
                    </>
                  )}
                  {product.specs.assemblyRequired !== undefined && (
                    <>
                      <dt>הרכבה</dt>
                      <dd>{product.specs.assemblyRequired ? 'נדרשת הרכבה' : 'מורכב'}</dd>
                    </>
                  )}
                  {product.specs.warrantyMonths && (
                    <>
                      <dt>אחריות</dt>
                      <dd>{product.specs.warrantyMonths} חודשים</dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Similar products */}
        {!!similarProducts.length && (
          <section className="pd-similar">
            <h2 className="pd-section-title">מוצרים נוספים שאולי תאהבו</h2>
            <div className="pd-similar-list">
              <ProductList products={similarProducts} />
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
