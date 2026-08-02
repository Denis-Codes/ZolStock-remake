import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

export function WishlistIcon() {
  const wishlist = useSelector((storeState) => storeState.wishlistModule.wishlist)
  const itemCount = wishlist.length

  return (
    <Link to="/wishlist" className="wishlist-icon-wrapper" title="מועדפים">
      <svg
        className="wishlist-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {itemCount > 0 && (
        <span className="wishlist-count">{itemCount > 99 ? '99+' : itemCount}</span>
      )}
    </Link>
  )
}
