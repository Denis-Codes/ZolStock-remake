import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { getCartTotals } from '../store/actions/cart.actions'

export function CartIcon() {
  const cart = useSelector((storeState) => storeState.cartModule.cart)
  const { itemCount } = getCartTotals(cart)

  return (
    <Link to="/cart" className="cart-icon-wrapper" title="עגלת קניות">
      <svg
        className="cart-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {itemCount > 0 && (
        <span className="cart-count">{itemCount > 99 ? '99+' : itemCount}</span>
      )}
    </Link>
  )
}
