import { NavLink } from "react-router-dom"
import { HeaderNavItem } from "./HeaderNavItem.jsx"

export function HeaderNavDropdown({
  id,
  to,
  label,
  subcats = [],
  openDropdown,
  setOpenDropdown,
  onNavigate, // ✅ חדש (אופציונלי)
}) {
  const isOpen = openDropdown === id

  function open() {
    setOpenDropdown(id)
  }

  function close() {
    setOpenDropdown(null)
  }

  function onPickCategory() {
    // סוגר + מאפס חיפוש (אם נשלח מבחוץ)
    close()
    if (onNavigate) onNavigate()
  }

  function onPickSubcat() {
    // סוגר לפני ניווט + מאפס חיפוש
    close()
    if (onNavigate) onNavigate()
  }

  return (
    <div className="nav-dropdown" onMouseEnter={open} onMouseLeave={close}>
      {/* ✅ מאפס גם בלחיצה על הקטגוריה עצמה */}
      <HeaderNavItem to={to} label={label} onClick={onPickCategory} />

      {!!subcats.length && isOpen && (
        <div className="dropdown-menu">
          {subcats.map(({ subCategory, labelHe }) => (
            <NavLink
              key={subCategory}
              to={`${to}/${subCategory}`}
              className="dropdown-item"
              onClick={onPickSubcat}
            >
              {labelHe}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
