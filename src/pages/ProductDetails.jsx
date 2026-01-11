import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { loadProduct } from '../store/actions/product.actions'
import { showErrorMsg } from '../services/event-bus.service'

export function ProductDetails() {
  const { productId } = useParams()
  const product = useSelector(storeState => storeState.productModule.product)
  const isLoading = useSelector(storeState => storeState.productModule.isLoading)

  useEffect(() => {
    ;(async () => {
      try {
        await loadProduct(productId)
      } catch (err) {
        showErrorMsg('Cannot load product')
      }
    })()
  }, [productId])

  if (isLoading) return <section className="product-details">טוען...</section>

  return (
    <section className="product-details">
      <Link to="/">חזרה</Link>

      {!product && <p>לא נמצא מוצר</p>}

      {product && (
        <>
          <h1>{product.displayNameHe}</h1>
          <p>
            {product.price} ₪ {product.currency ? `(${product.currency})` : ''}
          </p>

          {product.images?.length ? (
            <img
              src={product.images[0]}
              alt={product.displayNameHe}
              style={{ maxWidth: 360 }}
            />
          ) : null}

          <p>
            {product.displayCategoryHe} / {product.displaySubCategoryHe}
          </p>

          {product.specs ? (
            <pre style={{ direction: 'ltr', textAlign: 'left' }}>
              {JSON.stringify(product.specs, null, 2)}
            </pre>
          ) : null}
        </>
      )}
    </section>
  )
}
