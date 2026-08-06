import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebookF, faInstagram } from '@fortawesome/free-brands-svg-icons'
// Tightly cropped copy of logo.png, which carries ~53% transparent width
// and ~42% transparent height. The original is kept alongside it.
import logo from '../assets/styles/img/logo-trimmed.png'
import { DEPARTMENTS, departmentPath } from '../services/taxonomy.service'

// Below this width the link groups collapse into accordions, so the footer
// is a short list of headings instead of a wall of links.
//
// This is `$bp-tablet-min` (600px) and AppFooter.scss keys its accordion
// styling to the same variable. The two used to disagree — this said 600px
// while the stylesheet dressed the accordion only below `$bp-sm` (480px) —
// so every viewport in between rendered three collapsed `+` headings laid
// out as three columns.
const COLUMNS_MQ = '(min-width: 37.5rem)'

// Only routes that actually exist are wired up. The legal pages have never
// been written, so those entries render as plain text rather than links to
// nowhere — PRODUCT.md records whether they will exist as an open question.
const SECTIONS = [
  {
    id: 'categories',
    title: 'קטגוריות',
    // Eight departments against six and four in its siblings, so as a single
    // list this group ran twice the height of the column beside it and the
    // block ended badly ragged. `wide` splits it into two sub-columns once
    // there is room for them, which lands all three groups within two rows
    // of each other. The taxonomy is the real chain's and is not editable,
    // so balancing has to happen in the layout rather than in the content.
    wide: true,
    links: DEPARTMENTS.map(({ slug, labelHe }) => ({
      to: departmentPath(slug),
      label: labelHe,
    })),
  },
  {
    id: 'service',
    title: 'שירות לקוחות',
    links: [
      { to: '/branches', label: 'סניפים' },
      { to: '/chat', label: 'צור קשר' },
      { to: '/about', label: 'אודות' },
      { to: '/wishlist', label: 'המועדפים שלי' },
      { to: '/cart', label: 'עגלת הקניות' },
      { to: '/login', label: 'התחברות' },
    ],
  },
  {
    id: 'legal',
    title: 'מידע ותקנון',
    pending: ['נגישות', 'תנאי שימוש', 'מדיניות פרטיות', 'מדיניות החלפה והחזרה'],
  },
]

function useIsColumns() {
  const [isColumns, setIsColumns] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(COLUMNS_MQ).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(COLUMNS_MQ)
    const onChange = (ev) => setIsColumns(ev.matches)
    mql.addEventListener('change', onChange)
    setIsColumns(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isColumns
}

export function AppFooter() {
  const isColumns = useIsColumns()
  const [openId, setOpenId] = useState(null)

  function toggle(id) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <footer className="app-footer full">
      <div className="footer-main">
        {/* The mark and the accounts lead the footer at every width, so the
            phone and the desktop share one structure instead of two
            arrangements that have to be kept in step. The tagline that used
            to sit under the logo is gone: `logo-trimmed.png` already carries
            "כשמחיר וחוויה נפגשים" inside the lockup, so the line printed it a
            second time 20px below itself. */}
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label="לדף הבית">
            <img src={logo} alt="זול סטוק" />
          </Link>

          <div className="socials">
            <a
              href="https://www.facebook.com/zolstock/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="זול סטוק בפייסבוק"
            >
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a
              href="https://www.instagram.com/zol_stock/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="זול סטוק באינסטגרם"
            >
              <FontAwesomeIcon icon={faInstagram} />
            </a>
          </div>
        </div>

        <nav className="footer-cols" aria-label="ניווט תחתון">
          {SECTIONS.map(({ id, title, links, pending, wide }) => {
            const isOpen = isColumns || openId === id
            const classNames = ['footer-col', wide && 'footer-col--wide', isOpen && 'is-open']
              .filter(Boolean)
              .join(' ')

            return (
              <section key={id} className={classNames}>
                {isColumns ? (
                  <h3>{title}</h3>
                ) : (
                  <h3>
                    <button
                      type="button"
                      className="footer-col-toggle"
                      aria-expanded={isOpen}
                      aria-controls={`footer-${id}`}
                      onClick={() => toggle(id)}
                    >
                      <span>{title}</span>
                      <span className="footer-col-sign" aria-hidden="true" />
                    </button>
                  </h3>
                )}

                <ul id={`footer-${id}`} hidden={!isOpen}>
                  {links?.map(({ to, label, state }) => (
                    <li key={label}>
                      <Link to={to} state={state}>{label}</Link>
                    </li>
                  ))}
                  {pending?.map((label) => (
                    <li key={label}>
                      <span className="footer-pending">{label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </nav>
      </div>

      <div className="footer-bottom">
        <p>© 2026 זול סטוק. כל הזכויות שמורות.</p>
        <p>Made by Denis Libin</p>
      </div>
    </footer>
  )
}
