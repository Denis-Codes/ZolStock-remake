import { useState } from 'react'
import { useNavigate } from 'react-router'

import { signup } from '../store/actions/user.actions'

import { ImgUploader } from '../cmps/ImgUploader'
import { userService } from '../services/user'

export function Signup() {
    const [credentials, setCredentials] = useState(userService.getEmptyUser())
    const navigate = useNavigate()

    function clearState() {
        setCredentials({ username: '', password: '', fullname: '', imgUrl: '' })
    }

    function handleChange(ev) {
        const type = ev.target.type

        const field = ev.target.name
        const value = ev.target.value
        setCredentials({ ...credentials, [field]: value })
    }
    
    const [error, setError] = useState('')

    async function onSignup(ev = null) {
        if (ev) ev.preventDefault()

        if (!credentials.fullname?.trim()) return setError('יש להזין שם מלא')
        if (!credentials.username?.trim()) return setError('יש להזין שם משתמש')
        if (!credentials.password) return setError('יש להזין סיסמה')

        setError('')
        try {
            await signup(credentials)
            clearState()
            navigate('/')
        } catch {
            setError('ההרשמה נכשלה. נסו שוב בעוד רגע.')
        }
    }

    function onUploaded(imgUrl) {
        setCredentials({ ...credentials, imgUrl })
    }

    return (
        <form className="auth-form" onSubmit={onSignup} noValidate>
            <div className="auth-field">
                <label htmlFor="signup-fullname">שם מלא</label>
                <input
                    id="signup-fullname"
                    type="text"
                    name="fullname"
                    autoComplete="name"
                    value={credentials.fullname}
                    onChange={handleChange}
                />
            </div>

            <div className="auth-field">
                <label htmlFor="signup-username">שם משתמש</label>
                <input
                    id="signup-username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={credentials.username}
                    onChange={handleChange}
                />
            </div>

            <div className="auth-field">
                <label htmlFor="signup-password">סיסמה</label>
                <input
                    id="signup-password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={credentials.password}
                    onChange={handleChange}
                />
            </div>

            <div className="auth-field">
                <span className="auth-field-label">תמונת פרופיל (רשות)</span>
                <ImgUploader onUploaded={onUploaded} />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit" type="submit">הרשמה</button>
        </form>
    )
}