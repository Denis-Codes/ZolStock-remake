import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, NavLink } from 'react-router-dom'
import { getLastShoppingRoute } from '../services/last-shopping-route.service'
import { productService } from '../services/product'
import { ProductList } from '../cmps/ProductList.jsx'

function WishlistBreadcrumbs() {
  return (
    <nav className="breadcrumbs" aria-label="פירורי לחם">
      <ol className="crumbs">
        <li className="crumb">
          <NavLink to="/">עמוד הבית</NavLink>
        </li>
        <li className="crumb">
          <NavLink to="/wishlist">מועדפים</NavLink>
        </li>
      </ol>
    </nav>
  )
}

export function WishlistPage() {
  const wishlist = useSelector((storeState) => storeState.wishlistModule.wishlist)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)

    Promise.all(wishlist.map((id) => productService.getById(id)))
      .then((res) => {
        if (isCancelled) return
        setProducts(res.filter(Boolean))
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [wishlist])

  if (isLoading) {
    return (
      <section className="wishlist-page">
        <div className="wishlist-container">
          <WishlistBreadcrumbs />
          <p className="wishlist-loading">טוען...</p>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section className="wishlist-page empty">
        <div className="wishlist-container">
          <WishlistBreadcrumbs />
          <div className="empty-wishlist">
            <svg
              className="empty-wishlist-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <h2>רשימת המועדפים ריקה</h2>
            <p>עדיין לא הוספת מוצרים למועדפים</p>
            <Link to={getLastShoppingRoute()} className="continue-shopping-btn">
              המשך בקניות
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="wishlist-page">
      <div className="wishlist-container">
        <WishlistBreadcrumbs />
        <div className="wishlist-header">
          <h1>המועדפים שלי</h1>
          <span className="wishlist-item-count">{products.length} פריטים</span>
        </div>

        <ProductList products={products} />
      </div>
    </section>
  )
}
