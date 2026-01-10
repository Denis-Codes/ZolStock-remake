import { Link, NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faFacebookF,
	faInstagram,
} from "@fortawesome/free-brands-svg-icons"
import { faLocationDot } from "@fortawesome/free-solid-svg-icons"
import logo from '../assets/styles/img/logo.png'
import { HeaderNavItem } from './HeaderNavItem'


export function AppHeader() {
	const user = useSelector(storeState => storeState.userModule.user)
	const navigate = useNavigate()

	async function onLogout() {
		try {
			await logout()
			navigate('/')
			showSuccessMsg(`Bye now`)
		} catch (err) {
			showErrorMsg('Cannot logout')
		}
	}

	return (
		<>
			<div className="top-wrap full">
				<div className="right-links">

					<div className="about">
						<NavLink to="about">אודות</NavLink>
					</div>
					<div className="nav-link">
						<NavLink to="chat">צור קשר</NavLink>
					</div>
				</div>
				<span>“זול סטוק – כשמחיר וחוויה נפגשים”</span>
				<div className="left-links">
					<div className="investors">
						<div className="drushim">
							<a href="">דרושים</a>
						</div>
						<div className="zakyanut">
							<a href="">זכיינות</a>
						</div>
					</div>
				</div>
			</div>
			<div className="logo-wrap full">
				<NavLink to="/" className="logo">
					<img src={logo} alt="zolstock logo" />
				</NavLink>
			</div>
			<header className="app-header full">
				<nav>
					<HeaderNavItem to="/furniture" label="רהיטים" />
					<HeaderNavItem to="/clothing" label="ביגוד" />
					<HeaderNavItem to="/electronics" label="אלקטרוניקה" />
					<HeaderNavItem to="/kitchen" label="מטבח" />
					<HeaderNavItem to="/pets" label="חיות מחמד" />

					{user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}

					{user && (
						<div className="user-info">
							<Link to={`user/${user._id}`}>{user.fullname}</Link>
							<button onClick={onLogout}>logout</button>
						</div>
					)}
				</nav>
				<div className="locations">
					<button className="branches-btn">
						<span>סניפים</span>
						<FontAwesomeIcon icon={faLocationDot} />

					</button>
				</div>

				<div className="socials">
					<a href="https://www.facebook.com/zolstock/"
						target="_blank"
						rel="noopener noreferrer"><FontAwesomeIcon icon={faFacebookF} /></a>
					<a href="https://www.instagram.com/zol_stock/"
						target="_blank"
						rel="noopener noreferrer"><FontAwesomeIcon icon={faInstagram} /></a>
				</div>
			</header>
		</>
	)
}
