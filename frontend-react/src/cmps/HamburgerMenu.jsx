import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'

export function HamburgerMenu({
  isOpen,
  onClose,
  categorySubcats,
  onNavigate,
  onPickSubcat,
  onGoToBranches,
  user,
  onLogout,
}) {
  const [openCat, setOpenCat] = useState(null)
  const drawerRef = useRef(null)
  const [phase, setPhase] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'

  // Build cats once per input
  const cats = useMemo(() => ([
    { id: 'furniture', label: 'רהיטים', to: '/category/furniture', subcats: categorySubcats?.furniture || [] },
    { id: 'clothing', label: 'ביגוד', to: '/category/clothing', subcats: categorySubcats?.clothing || [] },
    { id: 'electronics', label: 'אלקטרוניקה', to: '/category/electronics', subcats: categorySubcats?.electronics || [] },
    { id: 'kitchen', label: 'מטבח', to: '/category/kitchen', subcats: categorySubcats?.kitchen || [] },
    { id: 'pets', label: 'חיות מחמד', to: '/category/pets', subcats: categorySubcats?.pets || [] },
  ]), [categorySubcats])

  // Handle open/close phases (so we can animate close while still mounted)
  useEffect(() => {
    if (isOpen) {
      setPhase('opening')
      const t = requestAnimationFrame(() => setPhase('open'))
      return () => cancelAnimationFrame(t)
    }

    // if parent closes it, animate out then unmount by phase='closed'
    if (phase === 'open' || phase === 'opening') {
      setPhase('closing')
      const t = setTimeout(() => setPhase('closed'), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen]) // intentionally only depends on isOpen

  // Lock body scroll only when actually visible
  useEffect(() => {
    if (phase === 'closed') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [phase])

  // ESC close, and keep Tab inside the drawer. It declares
  // `role="dialog" aria-modal="true"`, but focus used to walk straight out
  // into the page behind it after two presses.
  useEffect(() => {
    if (phase === 'closed') return

    function getFocusable() {
      if (!drawerRef.current) return []
      return [...drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )].filter(el => el.offsetParent !== null)
    }

    function onKeyDown(ev) {
      if (ev.key === 'Escape') return handleClose()
      if (ev.key !== 'Tab') return

      const items = getFocusable()
      if (!items.length) return

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (ev.shiftKey && (active === first || !drawerRef.current.contains(active))) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase])

  // Land focus inside the drawer when it opens, not on the page behind it.
  useEffect(() => {
    if (phase !== 'open') return
    const first = drawerRef.current?.querySelector('button, a[href]')
    first?.focus()
  }, [phase])

  // Reset internal openCat when fully closed
  useEffect(() => {
    if (phase === 'closed') setOpenCat(null)
  }, [phase])

  function handleClose() {
    // start animation out
    if (phase === 'closing' || phase === 'closed') return
    setPhase('closing')
    // tell parent to set isOpen=false (but we keep mounted until timeout)
    onClose?.()
    setTimeout(() => setPhase('closed'), 220)
  }

  function closeAndReset() {
    onNavigate?.()
    handleClose()
    setOpenCat(null)
  }

  // ✅ The critical part: when closed => render nothing
  if (phase === 'closed') return null

  const overlayClass =
    phase === 'open' ? 'hamburger-overlay is-open' :
    phase === 'opening' ? 'hamburger-overlay is-enter' :
    'hamburger-overlay is-closing'

  const drawerClass =
    phase === 'open' ? 'hamburger-drawer is-open' :
    phase === 'opening' ? 'hamburger-drawer is-enter' :
    'hamburger-drawer is-closing'

  return (
    <div className={overlayClass} onClick={handleClose} role="presentation">
      <aside
        ref={drawerRef}
        className={drawerClass}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="תפריט"
      >
        <header className="hamburger-head">
          <h3>תפריט</h3>
          <button className="hamburger-close" type="button" onClick={handleClose} aria-label="סגור תפריט">
            ✕
          </button>
        </header>

        <nav className="hamburger-nav">
          <p className="hamburger-section">קטגוריות</p>

          <ul className="hamburger-list">
            {cats.map((cat) => {
              const isOpenCat = openCat === cat.id
              const hasSub = cat.subcats.length > 0

              return (
                <li key={cat.id} className={`hamburger-item ${isOpenCat ? 'is-open' : ''}`}>
                  <div className="hamburger-row">
                    <NavLink to={cat.to} className="hamburger-link" onClick={closeAndReset}>
                      {cat.label}
                    </NavLink>

                    {hasSub && (
                      <button
                        type="button"
                        className={`hamburger-expander ${isOpenCat ? 'is-open' : ''}`}
                        onClick={() => setOpenCat(prev => (prev === cat.id ? null : cat.id))}
                        aria-expanded={isOpenCat}
                        aria-label={isOpenCat ? 'סגור תתי קטגוריות' : 'פתח תתי קטגוריות'}
                      >
                        {isOpenCat ? '−' : '+'}
                      </button>
                    )}
                  </div>

                  {hasSub && (
                    <ul className="hamburger-sublist">
                      {cat.subcats.map((sub) => (
                        <li key={sub.subCategory || sub.slug}>
                          {/* אם אתה רוצה לבחור תת-קטגוריה בלי querystring */}
                          {onPickSubcat ? (
                            <button
                              type="button"
                              className="hamburger-sublink"
                              onClick={() => {
                                onPickSubcat(cat.id, sub.subCategory || sub.slug)
                                closeAndReset()
                              }}
                            >
                              {sub.labelHe || sub.label}
                            </button>
                          ) : (
                            <NavLink
                              to={`${cat.to}?sub=${encodeURIComponent(sub.subCategory || sub.slug)}`}
                              className="hamburger-sublink"
                              onClick={closeAndReset}
                            >
                              {sub.labelHe || sub.label}
                            </NavLink>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="hamburger-divider" />

          <p className="hamburger-section">מידע ושירות</p>

          <ul className="hamburger-list">
            {onGoToBranches && (
              <li className="hamburger-item">
                <button
                  type="button"
                  className="hamburger-link"
                  onClick={() => { closeAndReset(); onGoToBranches() }}
                >
                  סניפים
                </button>
              </li>
            )}
            <li className="hamburger-item">
              <NavLink to="/about" className="hamburger-link" onClick={closeAndReset}>אודות</NavLink>
            </li>
            <li className="hamburger-item">
              <NavLink to="/chat" className="hamburger-link" onClick={closeAndReset}>צור קשר</NavLink>
            </li>
            <li className="hamburger-item">
              <NavLink to="/jobs" className="hamburger-link" onClick={closeAndReset}>דרושים</NavLink>
            </li>
            <li className="hamburger-item">
              <NavLink to="/franchise" className="hamburger-link" onClick={closeAndReset}>זכיינות</NavLink>
            </li>
          </ul>

          <div className="hamburger-divider" />

          {/* The drawer is the primary navigation on a phone, so the account
              belongs in it — not only in the icon bar. */}
          <ul className="hamburger-list">
            {user ? (
              <>
                <li className="hamburger-item">
                  <NavLink to={`/user/${user._id}`} className="hamburger-link hamburger-link--icon" onClick={closeAndReset}>
                    <FontAwesomeIcon icon={faUser} />
                    <span>{user.fullname}</span>
                  </NavLink>
                </li>
                <li className="hamburger-item">
                  <button
                    type="button"
                    className="hamburger-link hamburger-link--icon"
                    onClick={() => { handleClose(); onLogout?.() }}
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    <span>התנתקות</span>
                  </button>
                </li>
              </>
            ) : (
              <li className="hamburger-item">
                <NavLink to="/login" className="hamburger-link hamburger-link--icon" onClick={closeAndReset}>
                  <FontAwesomeIcon icon={faUser} />
                  <span>התחברות / הרשמה</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </div>
  )
}
