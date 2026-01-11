import { NavLink } from "react-router-dom"
import { HeaderNavItem } from "./HeaderNavItem.jsx"

export function HeaderNavDropdown({ to, label, subcats = [] }) {
  return (
    <div className="nav-dropdown">
      <HeaderNavItem to={to} label={label} />

      {!!subcats.length && (
        <div className="dropdown-menu">
          {subcats.map(({ subCategory, labelHe }) => (
            <NavLink
              key={subCategory}
              to={`${to}/${subCategory}`}
              className="dropdown-item"
            >
              {labelHe}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
