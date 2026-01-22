import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

export function HamburgerMenu({
  isOpen,
  onClose,
  categorySubcats,
  onNavigate,
  onPickSubcat,
}) {
  const [openCat, setOpenCat] = useState(null)
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

  // ESC close
  useEffect(() => {
    if (phase === 'closed') return
    function onKeyDown(ev) {
      if (ev.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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

          <ul className="hamburger-list">
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
        </nav>
      </aside>
    </div>
  )
}
