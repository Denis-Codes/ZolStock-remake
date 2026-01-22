import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { removeFromCart, updateCartItemQty, clearCart, getCartTotals } from '../store/actions/cart.actions'

export function CartPage() {
  const dispatch = useDispatch()
  const cart = useSelector((storeState) => storeState.cartModule.cart)
  const { itemCount, subtotal, savings } = getCartTotals(cart)

  function handleQuantityChange(variantKey, newQty) {
    dispatch(updateCartItemQty(variantKey, newQty))
  }

  function handleRemoveItem(variantKey) {
    dispatch(removeFromCart(variantKey))
  }

  function handleClearCart() {
    if (window.confirm('האם למחוק את כל הפריטים מהעגלה?')) {
      dispatch(clearCart())
    }
  }

  if (cart.length === 0) {
    return (
      <section className="cart-page empty">
        <div className="cart-container">
          <div className="empty-cart">
            <svg className="empty-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <h2>העגלה ריקה</h2>
            <p>לא הוספת עדיין מוצרים לעגלה</p>
            <Link to="/" className="continue-shopping-btn">המשך בקניות</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h1>עגלת קניות</h1>
          <span className="cart-item-count">{itemCount} פריטים</span>
        </div>

        <div className="cart-content">
          {/* Cart items list */}
          <div className="cart-items">
            {cart.map((item) => (
              <article key={item.variantKey} className="cart-item">
                <Link to={`/product/${item.productId}`} className="item-image">
                  <img src={item.image} alt={item.name} />
                </Link>

                <div className="item-details">
                  <Link to={`/product/${item.productId}`} className="item-name">
                    {item.name}
                  </Link>

                  {item.variant && (
                    <div className="item-variant">
                      {item.variant.size && <span>מידה: {item.variant.size}</span>}
                      {item.variant.colorHe && <span>צבע: {item.variant.colorHe}</span>}
                    </div>
                  )}

                  <div className="item-price-row">
                    {item.originalPrice > item.price && (
                      <span className="original-price">₪{item.originalPrice}</span>
                    )}
                    <span className="current-price">₪{item.price}</span>
                  </div>
                </div>

                <div className="item-quantity">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.variantKey, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.variantKey, item.quantity + 1)}
                    disabled={item.quantity >= item.maxStock}
                  >
                    +
                  </button>
                </div>

                <div className="item-total">
                  ₪{(item.price * item.quantity).toFixed(0)}
                </div>

                <button
                  className="remove-item-btn"
                  onClick={() => handleRemoveItem(item.variantKey)}
                  aria-label="הסר מהעגלה"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </article>
            ))}

            <button className="clear-cart-btn" onClick={handleClearCart}>
              נקה עגלה
            </button>
          </div>

          {/* Cart summary */}
          <aside className="cart-summary">
            <h2>סיכום הזמנה</h2>

            <div className="summary-row">
              <span>סה״כ מוצרים ({itemCount})</span>
              <span>₪{subtotal.toFixed(0)}</span>
            </div>

            {savings > 0 && (
              <div className="summary-row savings">
                <span>חיסכון</span>
                <span className="savings-amount">-₪{savings.toFixed(0)}</span>
              </div>
            )}

            <div className="summary-row shipping">
              <span>משלוח</span>
              <span>חינם מעל ₪300</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row total">
              <span>סה״כ לתשלום</span>
              <span>₪{subtotal.toFixed(0)}</span>
            </div>

            <button className="checkout-btn" disabled>
              מעבר לתשלום (בקרוב)
            </button>

            <Link to="/" className="continue-shopping-link">
              המשך בקניות
            </Link>

            <div className="secure-checkout">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              <span>רכישה מאובטחת</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
