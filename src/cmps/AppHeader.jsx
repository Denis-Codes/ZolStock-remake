import { Link, NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { showErrorMsg, showSuccessMsg } from '../services/event-bus.service'
import { logout } from '../store/actions/user.actions'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faTiktok,
	faFacebookF,
	faInstagram,
	faYoutube,
	faLinkedinIn
} from "@fortawesome/free-brands-svg-icons"
import logo from '../assets/styles/img/logo.png'


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
				<div className="locations">
					<a href="">סניפים</a>
				</div>
				<span>“זול סטוק – כשמחיר וחוויה נפגשים”</span>
				<div className="investors">
					<a href="">דרושים</a>
					<a href="">זכיינות</a>
				</div>
			</div>
			<div className="logo-wrap full">
				<NavLink to="/" className="logo">
					<img src={logo} alt="zolstock logo" />
				</NavLink>
			</div>
			<header className="app-header full">
				<nav>
					<div className="nav-link">
						<div className="about">
							<NavLink to="about">אודות</NavLink>
						</div>
					</div>
					<div className="nav-link">
						<NavLink to="products">מוצרים</NavLink>
					</div>
					<div className="nav-link">
						<NavLink to="chat">צור קשר</NavLink>
					</div>
					{/* <NavLink to="review">Review</NavLink> */}

					{user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}

					{/* {!user && <NavLink to="login" className="login-link">Login</NavLink>} */}
					{user && (
						<div className="user-info">
							<Link to={`user/${user._id}`}>
								{/* {user.imgUrl && <img src={user.imgUrl} />} */}
								{user.fullname}
							</Link>
							{/* <span className="score">{user.score?.toLocaleString()}</span> */}
							<button onClick={onLogout}>logout</button>
						</div>
					)}
				</nav>
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
