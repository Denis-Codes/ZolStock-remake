import { Outlet } from 'react-router'
import { NavLink } from 'react-router-dom'

export function LoginSignup() {
    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">החשבון שלי</h1>

                <nav className="auth-tabs" aria-label="התחברות או הרשמה">
                    <NavLink to="." end>התחברות</NavLink>
                    <NavLink to="signup">הרשמה</NavLink>
                </nav>

                <Outlet />
            </div>
        </div>
    )
}
