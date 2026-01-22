import { NavLink } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown } from "@fortawesome/free-solid-svg-icons"

export function HeaderNavItem({ to, label, onClick }) {
  return (
    <div className="nav-link">
      <NavLink to={to} className="nav-item" onClick={onClick}>
        <span>{label}</span>
        <FontAwesomeIcon icon={faChevronDown} className="chevron" />
      </NavLink>
    </div>
  )
}
