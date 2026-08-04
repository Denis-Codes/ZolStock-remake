import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { setFilterBy } from '../store/actions/product.actions'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebookF, faInstagram } from '@fortawesome/free-brands-svg-icons'
import {
  faLocationDot,
  faMagnifyingGlass,
  faXmark,
  faUser,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons'
// Tightly cropped copy of logo.png, which carries ~53% transparent width
// and ~42% transparent height. The original is kept alongside it.
import logo from '../assets/styles/img/logo-trimmed.png'

import productsData from '../data/products.json'
import { HeaderNavDropdown } from './HeaderNavDropdown'
import { buildCategorySubcats } from '../services/util.service'
import { DEPARTMENTS, departmentPath } from '../services/taxonomy.service'
import { SearchOverlay } from './SearchOverlay.jsx'
import { HamburgerMenu } from './HamburgerMenu.jsx'
import { CartIcon } from './CartIcon.jsx'
import { WishlistIcon } from './WishlistIcon.jsx'

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

  // search overlay state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchToggleRef = useRef(null)

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
    // Send focus back where it came from, or the toggle vanishes under the user.
    searchToggleRef.current?.focus()
  }, [])

  useEffect(() => {
    setOpenDropdown(null)
    setIsSearchOpen(false)
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

        {/* דרושים and זכיינות used to sit here as `href=""`, which reloads the
            current page, and again in the drawer as links to /jobs and
            /franchise, which match no route. Neither page exists and PRODUCT.md
            records that whether they will is undecided, so the cluster is gone
            rather than pointing at a dead end. */}
      </div>

      <div className="logo-wrap full">
        <NavLink to="/" className="logo">
          <img src={logo} alt="zolstock logo" />
        </NavLink>
      </div>

      <div ref={logoSentinelRef} className="logo-sentinel full" />

      <header className={`app-header full ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="header-start">
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

          {/* `aria-hidden={isScrolled}` used to live here, from when the nav
              collapsed on scroll. It does not collapse any more, so this hid a
              visible, focusable, eight-item category nav from assistive tech
              the moment the page moved. */}
          <div className="nav-wrap">
            <nav>
              {DEPARTMENTS.map(({ slug, labelHe }) => (
                <HeaderNavDropdown
                  key={slug}
                  id={slug}
                  to={departmentPath(slug)}
                  label={labelHe}
                  subcats={categorySubcats[slug] || []}
                  openDropdown={openDropdown}
                  setOpenDropdown={setOpenDropdown}
                  onNavigate={onNavToCategoryOrSubcategory}
                />
              ))}

              {user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}

            </nav>
          </div>
        </div>

        <div className="header-left-actions">
          <button
            className={`search-toggle ${isSearchOpen ? 'is-open' : ''}`}
            type="button"
            ref={searchToggleRef}
            aria-label={isSearchOpen ? 'סגור חיפוש' : 'חיפוש מוצרים'}
            aria-expanded={isSearchOpen}
            onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
          >
            <FontAwesomeIcon icon={isSearchOpen ? faXmark : faMagnifyingGlass} />
          </button>

          {/* The only route to the login form. It previously existed at /login
              with nothing anywhere in the UI pointing at it, and the logged-in
              block lived inside the desktop nav — so it vanished entirely
              below 1200px. This sits in the action cluster at every width. */}
          {user ? (
            <>
              <Link
                to={`/user/${user._id}`}
                className="account-btn"
                aria-label={`החשבון של ${user.fullname}`}
                title={user.fullname}
              >
                <FontAwesomeIcon icon={faUser} />
              </Link>
              <button
                className="account-btn"
                type="button"
                onClick={onLogout}
                aria-label="התנתקות"
                title="התנתקות"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
              </button>
            </>
          ) : (
            <NavLink to="/login" className="account-btn" aria-label="התחברות">
              <FontAwesomeIcon icon={faUser} />
            </NavLink>
          )}

          <WishlistIcon />
          <CartIcon />

          {/* A link, not a button running `navigate()`: the locator is a real
              destination, so middle-click and open-in-new-tab work. */}
          <div className="locations">
            <NavLink to="/branches" className="branches-btn">
              <span>סניפים</span>
              <FontAwesomeIcon icon={faLocationDot} />
            </NavLink>
          </div>

          <div className="socials">
            <a href="https://www.facebook.com/zolstock/" target="_blank" rel="noopener noreferrer" aria-label="פייסבוק">
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a href="https://www.instagram.com/zol_stock/" target="_blank" rel="noopener noreferrer" aria-label="אינסטגרם">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
          </div>
        </div>

        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={closeSearch}
          value={filterBy?.txt || ''}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
        />
      </header>

      <HamburgerMenu
        isOpen={isMenuOpen}
        isClosing={isMenuClosing}
        onClose={handleCloseMenu}
        categorySubcats={categorySubcats}
        onNavigate={onNavToCategoryOrSubcategory}
        user={user}
        onLogout={onLogout}
      />
    </>
  )
}
//