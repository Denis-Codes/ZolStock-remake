import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useMemo } from 'react'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebookF, faInstagram } from "@fortawesome/free-brands-svg-icons"
import { faLocationDot } from "@fortawesome/free-solid-svg-icons"
import logo from '../assets/styles/img/logo.png'

import productsData from '../data/products.json'
import { HeaderNavDropdown } from './HeaderNavDropdown'
import { buildCategorySubcats } from '../services/util.service' // מומלץ קובץ ייעודי

export function AppHeader() {
	const user = useSelector(storeState => storeState.userModule.user)
	const navigate = useNavigate()
	const location = useLocation()

	const categorySubcats = useMemo(() => buildCategorySubcats(productsData), [])

	async function onLogout() {
		try {
			await logout()
			navigate('/')
			showSuccessMsg(`Bye now`)
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
					{/* <HeaderNavDropdown to="/furniture" label="רהיטים" subcats={categorySubcats.furniture || []} />
          <HeaderNavDropdown to="/clothing" label="ביגוד" subcats={categorySubcats.clothing || []} />
          <HeaderNavDropdown to="/electronics" label="אלקטרוניקה" subcats={categorySubcats.electronics || []} />
          <HeaderNavDropdown to="/kitchen" label="מטבח" subcats={categorySubcats.kitchen || []} />
          <HeaderNavDropdown to="/pets" label="חיות מחמד" subcats={categorySubcats.pets || []} /> */}

					<HeaderNavDropdown to="/category/furniture" label="רהיטים" subcats={categorySubcats.furniture || []} />
					<HeaderNavDropdown to="/category/clothing" label="ביגוד" subcats={categorySubcats.clothing || []} />
					<HeaderNavDropdown to="/category/electronics" label="אלקטרוניקה" subcats={categorySubcats.electronics || []} />
					<HeaderNavDropdown to="/category/kitchen" label="מטבח" subcats={categorySubcats.kitchen || []} />
					<HeaderNavDropdown to="/category/pets" label="חיות מחמד" subcats={categorySubcats.pets || []} />


					{user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}

					{user && (
						<div className="user-info">
							<Link to={`user/${user._id}`}>{user.fullname}</Link>
							<button onClick={onLogout}>logout</button>
						</div>
					)}
				</nav>

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
			</header>
		</>
	)
}
