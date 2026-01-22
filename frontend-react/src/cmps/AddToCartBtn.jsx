import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { addToCart } from '../store/actions/cart.actions'

export function AddToCartBtn({ product, selectedVariant = null, size = 'medium', showText = true }) {
  const dispatch = useDispatch()
  const [isAdding, setIsAdding] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const isOutOfStock = !product.inStock || product.stockQty === 0
  const variantOutOfStock = selectedVariant && !selectedVariant.inStock

  async function handleAddToCart(ev) {
    ev.preventDefault()
    ev.stopPropagation()

    if (isOutOfStock || variantOutOfStock || isAdding) return

    setIsAdding(true)
    dispatch(addToCart(product, 1, selectedVariant))

    // Show success feedback
    setTimeout(() => {
      setIsAdding(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1500)
    }, 300)
  }

  const btnClass = `add-to-cart-btn ${size} ${isAdding ? 'adding' : ''} ${showSuccess ? 'success' : ''}`
  const isDisabled = isOutOfStock || variantOutOfStock

  return (
    <button
      className={btnClass}
      onClick={handleAddToCart}
      disabled={isDisabled}
      title={isDisabled ? 'אזל מהמלאי' : 'הוסף לעגלה'}
    >
      {showSuccess ? (
        <>
          <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {showText && <span>נוסף!</span>}
        </>
      ) : isAdding ? (
        <span className="spinner"></span>
      ) : (
        <>
          <svg className="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z" />
            <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z" />
            <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" />
          </svg>
          {showText && <span>{isDisabled ? 'אזל מהמלאי' : 'הוסף לעגלה'}</span>}
        </>
      )}
    </button>
  )
}
