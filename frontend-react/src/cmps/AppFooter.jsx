import { useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faTiktok,
	faFacebookF,
	faInstagram,
	faYoutube,
	faLinkedinIn
} from "@fortawesome/free-brands-svg-icons"

export function AppFooter() {
	// const count = useSelector(storeState => storeState.userModule.count)

	return (
		<footer className="app-footer full">
			<div className="shortcuts">
				<a href="">סניפים</a>
				<a href="">אודות</a>
				<a href="">נגישות</a>
				<a href="">תנאי שימוש</a>
				<a href="">מדיניות פרטיות</a>
				<a href="">מדיניות החלפה והחזרה</a>
				<a href="">צור קשר</a>
			</div>
			<div className="socials">
				<a href="https://www.facebook.com/zolstock/"
					target="_blank"
					rel="noopener noreferrer"><FontAwesomeIcon icon={faFacebookF} /></a>
				<a href="https://www.instagram.com/zol_stock/"
					target="_blank"
					rel="noopener noreferrer"><FontAwesomeIcon icon={faInstagram} /></a>
			</div>
			<p>Made by Denis Libin &copy; 2026</p>
			{/* <p>Count: {count}</p> */}
			{/*             
            {import.meta.env.VITE_LOCAL ? 
                <span className="local-services">Local Services</span> : 
                <span className="remote-services">Remote Services</span>} */}
		</footer>
	)
}