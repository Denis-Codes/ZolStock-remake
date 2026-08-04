import { eventBus, showSuccessMsg } from '../services/event-bus.service'
import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { socketService, SOCKET_EVENT_REVIEW_ABOUT_YOU } from '../services/socket.service'

export function UserMsg() {
	const [msg, setMsg] = useState(null)
	const timeoutIdRef = useRef()

	useEffect(() => {
		const unsubscribe = eventBus.on('show-msg', msg => {
			setMsg(msg)
			if (timeoutIdRef.current) {
				timeoutIdRef.current = null
				clearTimeout(timeoutIdRef.current)
			}
			timeoutIdRef.current = setTimeout(closeMsg, 3000)
		})

		socketService.on(SOCKET_EVENT_REVIEW_ABOUT_YOU, review => {
			showSuccessMsg(`New review about me ${review.txt}`)
		})

		return () => {
			unsubscribe()
			socketService.off(SOCKET_EVENT_REVIEW_ABOUT_YOU)
		}
	}, [])

	function closeMsg() {
		setMsg(null)
	}

	/**
	 * The toast used to render permanently, hidden with `opacity: 0` and a
	 * translate — which hides it from the eye but not from the tab order. Its
	 * unlabelled `<button>x</button>` therefore sat at tab position 7 of 9 on a
	 * phone with no message on screen: a keyboard user tabbed into an invisible
	 * control that announced "x" and did nothing visible.
	 *
	 * Nothing renders when there is nothing to say. `role="status"` announces
	 * the message when it arrives without stealing focus, and the dismiss
	 * button says what it dismisses.
	 */
	if (!msg) return null

	return (
		<section className={`user-msg ${msg.type} visible`} role="status" aria-live="polite">
			<button type="button" onClick={closeMsg} aria-label="סגירת ההודעה">
				<FontAwesomeIcon icon={faXmark} />
			</button>
			<span className="user-msg__txt">{msg.txt}</span>
		</section>
	)
}
