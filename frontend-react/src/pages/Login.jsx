import { useState } from 'react'
import { useNavigate } from 'react-router'

import { login } from '../store/actions/user.actions'

/**
 * Was a bare <select> listing every user in storage plus an English "Login"
 * button — a development shortcut, not a form, and nothing in the UI linked
 * to it. Now a real credential form.
 *
 * Note: the local service matches on username and does not verify the
 * password, so this collects a password but cannot be described as
 * authenticating. Wiring that up is a backend change.
 */
export function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' })
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const navigate = useNavigate()

    function handleChange(ev) {
        const { name, value } = ev.target
        setCredentials(prev => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    async function onLogin(ev) {
        ev.preventDefault()

        if (!credentials.username.trim()) {
            setError('יש להזין שם משתמש')
            return
        }
        if (!credentials.password) {
            setError('יש להזין סיסמה')
            return
        }

        setIsSubmitting(true)
        try {
            const user = await login(credentials)
            // The service resolves to undefined when no such username exists.
            if (!user) {
                setError('שם המשתמש אינו קיים. בדקו את הפרטים ונסו שוב.')
                return
            }
            navigate('/')
        } catch {
            setError('ההתחברות נכשלה. נסו שוב בעוד רגע.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={onLogin} noValidate>
            <div className="auth-field">
                <label htmlFor="login-username">שם משתמש</label>
                <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={credentials.username}
                    onChange={handleChange}
                    aria-invalid={!!error}
                />
            </div>

            <div className="auth-field">
                <label htmlFor="login-password">סיסמה</label>
                <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={credentials.password}
                    onChange={handleChange}
                    aria-invalid={!!error}
                />
            </div>

            {/* Names the problem and the way forward, rather than "an error occurred". */}
            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'מתחבר…' : 'התחברות'}
            </button>
        </form>
    )
}
