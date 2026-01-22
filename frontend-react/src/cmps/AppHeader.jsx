import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { setFilterBy } from '../store/actions/product.actions'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebookF, faInstagram } from '@fortawesome/free-brands-svg-icons'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import logo from '../assets/styles/img/logo.png'

import productsData from '../data/products.json'
import { HeaderNavDropdown } from './HeaderNavDropdown'
import { buildCategorySubcats } from '../services/util.service'
import { SearchBar } from './SearchBar.jsx'
import { HamburgerMenu } from './HamburgerMenu.jsx'
import { CartIcon } from './CartIcon.jsx'

export function AppHeader() {
  const dispatch = useDispatch()

  const user = useSelector(storeState => storeState.userModule.user)
  const filterBy = useSelector(storeState => storeState.productModule.filterBy)

  const navigate = useNavigate()
  const location = useLocation()

  const categorySubcats = useMemo(() => buildCategorySubcats(productsData), [])
  const [openDropdown, setOpenDropdown] = useState(null)

  const [isScrolled, setIsScrolled] = useState(false)
  const logoSentinelRef = useRef(null)

  // hamburger state (animation-safe)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)

  useEffect(() => {
    setOpenDropdown(null)
    // אם ניווט קרה תוך כדי תפריט פתוח — נסגור יפה
    if (isMenuOpen) handleCloseMenu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    const el = logoSentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  async function onLogout() {
    try {
      await logout()
      navigate('/')
      showSuccessMsg('Bye now')
    } catch (err) {
      showErrorMsg('Cannot logout')
    }
  }

  function onGoToBranches() {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: 'branches-map' } })
      return
    }
    const el = document.getElementById('branches-map')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function resetFilterForSearch(txt) {
    dispatch(
      setFilterBy({
        ...(filterBy || {}),
        txt,
        category: '',
        subCategory: '',
        minPrice: '',
        maxPrice: '',
        inStock: '',
        sortField: '',
        sortDir: '1',
      })
    )
  }

  function onSearchChange(nextTxt) {
    dispatch(setFilterBy({ ...(filterBy || {}), txt: nextTxt }))
  }

  function onSearchSubmit(txt) {
    const q = (txt || '').trim()
    if (!q) return

    resetFilterForSearch(q)
    navigate(`/search?q=${encodeURIComponent(q)}`)
    dispatch(setFilterBy({ ...(filterBy || {}), txt: '' }))
  }

  function onNavToCategoryOrSubcategory() {
    if (!filterBy?.txt) return
    dispatch(setFilterBy({ ...(filterBy || {}), txt: '' }))
  }

  // ---- hamburger open/close with animation ----
  const handleOpenMenu = useCallback(() => {
    setIsMenuClosing(false)
    setIsMenuOpen(true)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setIsMenuClosing(true)
    // duration must match CSS (220ms)
    window.setTimeout(() => {
      setIsMenuOpen(false)
      setIsMenuClosing(false)
    }, 220)
  }, [])

  return (
    <>
      <div className="top-wrap full">
        <div className="right-links">
          <NavLink to="about">אודות</NavLink>
          <NavLink to="chat">צור קשר</NavLink>
        </div>

        <div className="left-links">
          <a href="">דרושים</a>
          <a href="">זכיינות</a>
        </div>
      </div>

      <div className="logo-wrap full">
        <NavLink to="/" className="logo">
          <img src={logo} alt="zolstock logo" />
        </NavLink>
      </div>

      <div ref={logoSentinelRef} className="logo-sentinel full" />

      <header className={`app-header full ${isScrolled ? 'is-scrolled' : ''}`}>
        <button
          className="hamburger-btn"
          type="button"
          aria-label="פתח תפריט"
          onClick={handleOpenMenu}
        >
          <span className="hamburger-icon" aria-hidden="true"></span>
        </button>

        <NavLink to="/" className="mini-logo" aria-label="לדף הבית" tabIndex={isScrolled ? 0 : -1}>
          <img src={logo} alt="zolstock logo" />
        </NavLink>

        <div className="nav-wrap" aria-hidden={isScrolled}>
          <nav>
            <HeaderNavDropdown
              id="furniture"
              to="/category/furniture"
              label="רהיטים"
              subcats={categorySubcats.furniture || []}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onNavigate={onNavToCategoryOrSubcategory}
            />
            <HeaderNavDropdown
              id="clothing"
              to="/category/clothing"
              label="ביגוד"
              subcats={categorySubcats.clothing || []}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onNavigate={onNavToCategoryOrSubcategory}
            />
            <HeaderNavDropdown
              id="electronics"
              to="/category/electronics"
              label="אלקטרוניקה"
              subcats={categorySubcats.electronics || []}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onNavigate={onNavToCategoryOrSubcategory}
            />
            <HeaderNavDropdown
              id="kitchen"
              to="/category/kitchen"
              label="מטבח"
              subcats={categorySubcats.kitchen || []}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onNavigate={onNavToCategoryOrSubcategory}
            />
            <HeaderNavDropdown
              id="pets"
              to="/category/pets"
              label="חיות מחמד"
              subcats={categorySubcats.pets || []}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onNavigate={onNavToCategoryOrSubcategory}
            />

            {user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}

            {user && (
              <div className="user-info">
                <Link to={`user/${user._id}`}>{user.fullname}</Link>
                <button onClick={onLogout}>logout</button>
              </div>
            )}
          </nav>
        </div>

        <div className="search-bar">
          <SearchBar
            value={filterBy?.txt || ''}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            placeholder="חיפוש מוצרים…"
          />
        </div>

        <div className="header-left-actions">
          <CartIcon />

          <div className="locations">
            <button className="branches-btn" type="button" onClick={onGoToBranches}>
              <span>סניפים</span>
              <FontAwesomeIcon icon={faLocationDot} />
            </button>
          </div>

          <div className="socials">
            <a href="https://www.facebook.com/zolstock/" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a href="https://www.instagram.com/zol_stock/" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
          </div>
        </div>
      </header>

      <HamburgerMenu
        isOpen={isMenuOpen}
        isClosing={isMenuClosing}
        onClose={handleCloseMenu}
        categorySubcats={categorySubcats}
        onNavigate={onNavToCategoryOrSubcategory}
      />
    </>
  )
}
//