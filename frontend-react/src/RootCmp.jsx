import React, { useRef, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDispatch } from 'react-redux'

import { HomePage } from './pages/HomePage'
import { AboutUs, AboutTeam, AboutVision } from './pages/AboutUs'
import { ReviewIndex } from './pages/ReviewIndex.jsx'
import { ChatApp } from './pages/Chat.jsx'
import { AdminIndex } from './pages/AdminIndex.jsx'
import { UserDetails } from './pages/UserDetails'
import { CategoryPage } from './pages/CategoryPage.jsx'
import { ProductDetails } from './pages/ProductDetails.jsx'
import { SearchResultsPage } from './pages/SearchResultsPage.jsx'
import { ProductIndex } from './pages/ProductIndex.jsx'
import { CartPage } from './pages/CartPage.jsx'

import { AppHeader } from './cmps/AppHeader'
import { AppFooter } from './cmps/AppFooter'
import { UserMsg } from './cmps/UserMsg.jsx'
import { ScrollToTop } from './cmps/ScrollToTop'
import { ScrollToTopBtn } from './cmps/ScrollToTopBtn'
import { LoginSignup } from './pages/LoginSignup.jsx'
import { Login } from './pages/Login.jsx'
import { Signup } from './pages/Signup.jsx'

import { loadCart } from './store/actions/cart.actions'
import { loadWishlist } from './store/actions/wishlist.actions'

export function RootCmp() {
  const scrollRef = useRef(null)
  const dispatch = useDispatch()

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
        <Routes>
          <Route path="" element={<HomePage />} />
          <Route path="about" element={<AboutUs />}>
            <Route path="team" element={<AboutTeam />} />
            <Route path="vision" element={<AboutVision />} />
          </Route>

          <Route path="category/:categorySlug" element={<ProductIndex />} />
          <Route path="category/:categorySlug/:subCategorySlug" element={<ProductIndex />} />

          <Route path="product/:productId" element={<ProductDetails />} />
          <Route path="/search" element={<SearchResultsPage />} />

          <Route path="cart" element={<CartPage />} />

          <Route path="user/:id" element={<UserDetails />} />
          <Route path="review" element={<ReviewIndex />} />
          <Route path="chat" element={<ChatApp />} />
          <Route path="admin" element={<AdminIndex />} />

          <Route path="login" element={<LoginSignup />}>
            <Route index element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>
        </Routes>
      </main>

      <AppFooter />

      <ScrollToTopBtn />
    </div>
  )
}
