import React, { useRef, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'

// Eager load - critical components
import { AppHeader } from './cmps/AppHeader'
import { AppFooter } from './cmps/AppFooter'
import { UserMsg } from './cmps/UserMsg.jsx'
import { ScrollToTop } from './cmps/ScrollToTop'
import { ScrollToTopBtn } from './cmps/ScrollToTopBtn'

// Lazy load - routes (improves initial load time)
const HomePage = lazy(() => import('./pages/HomePage'))
const AboutUs = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs })))
const AboutTeam = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutTeam })))
const AboutStory = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutStory })))
const AboutVision = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutVision })))
const ReviewIndex = lazy(() => import('./pages/ReviewIndex.jsx').then(m => ({ default: m.ReviewIndex })))
const ChatApp = lazy(() => import('./pages/Chat.jsx').then(m => ({ default: m.ChatApp })))
const AdminIndex = lazy(() => import('./pages/AdminIndex.jsx').then(m => ({ default: m.AdminIndex })))
const UserDetails = lazy(() => import('./pages/UserDetails').then(m => ({ default: m.UserDetails })))
const ProductDetails = lazy(() =>
  import('./pages/ProductDetails.jsx').then(m => ({ default: m.ProductDetails }))
)
const SearchResultsPage = lazy(() =>
  import('./pages/SearchResultsPage.jsx').then(m => ({ default: m.SearchResultsPage }))
)
const ProductIndex = lazy(() =>
  import('./pages/ProductIndex.jsx').then(m => ({ default: m.ProductIndex }))
)
const CartPage = lazy(() =>
  import('./pages/CartPage.jsx').then(m => ({ default: m.CartPage }))
)
const WishlistPage = lazy(() =>
  import('./pages/WishlistPage.jsx').then(m => ({ default: m.WishlistPage }))
)
// These three export named functions, not defaults. `lazy()` reads
// `module.default`, so without the mapping it rendered `undefined` and the
// whole /login route crashed the tree — no header, no footer, blank page.
const LoginSignup = lazy(() =>
  import('./pages/LoginSignup.jsx').then(m => ({ default: m.LoginSignup }))
)
const Login = lazy(() => import('./pages/Login.jsx').then(m => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Signup.jsx').then(m => ({ default: m.Signup })))

import { rememberShoppingRoute } from './services/last-shopping-route.service'
import { loadCart } from './store/actions/cart.actions'
import { loadWishlist } from './store/actions/wishlist.actions'

// Loading fallback component
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      טוען...
    </div>
  )
}

export function RootCmp() {
  const scrollRef = useRef(null)
  const dispatch = useDispatch()
  const location = useLocation()

  // One place records where the shopper was browsing; the cart and wishlist
  // empty states read it so "המשך בקניות" goes back there.
  useEffect(() => {
    rememberShoppingRoute(location.pathname + location.search)
  }, [location.pathname, location.search])

  // Initialize cart and wishlist from localStorage on app load
  useEffect(() => {
    dispatch(loadCart())
    dispatch(loadWishlist())
  }, [dispatch])

  return (
    <div className="main-container" ref={scrollRef}>
      <ScrollToTop targetRef={scrollRef} />

      <AppHeader />
      <UserMsg />

      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="" element={<HomePage />} />
            <Route path="about" element={<AboutUs />}>
              <Route index element={<AboutStory />} />
              <Route path="team" element={<AboutTeam />} />
              <Route path="vision" element={<AboutVision />} />
            </Route>

            <Route path="category/:categorySlug" element={<ProductIndex />} />
            <Route path="category/:categorySlug/:subCategorySlug" element={<ProductIndex />} />

            <Route path="product/:productId" element={<ProductDetails />} />
            <Route path="/search" element={<SearchResultsPage />} />

            <Route path="cart" element={<CartPage />} />
            <Route path="wishlist" element={<WishlistPage />} />

            <Route path="user/:id" element={<UserDetails />} />
            <Route path="review" element={<ReviewIndex />} />
            <Route path="chat" element={<ChatApp />} />
            <Route path="admin" element={<AdminIndex />} />

            <Route path="login" element={<LoginSignup />}>
              <Route index element={<Login />} />
              <Route path="signup" element={<Signup />} />
            </Route>
          </Routes>
        </Suspense>
      </main>

      <AppFooter />

      <ScrollToTopBtn />
    </div>
  )
}
