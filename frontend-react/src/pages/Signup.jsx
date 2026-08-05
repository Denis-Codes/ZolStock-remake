import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'

import { signup } from '../store/actions/user.actions'

import { ImgUploader } from '../cmps/ImgUploader'
import { userService } from '../services/user'

/**
 * What the form can answer without asking the server.
 *
 * These mirror `backend/api/auth/auth.schema.js` — 2 / 3 / 8 characters, and
 * the same upper bounds — and the numbers are duplicated on purpose. The
 * alternative is what this form did before: a round trip to be told something
 * the page already had everything it needed to say. A duplicated rule that
 * drifts is worse than no duplicate, so both halves are pinned to the same
 * figures in tests, the way the free-delivery threshold already is.
 *
 * The server stays the authority. This is a faster copy of its answer, not a
 * replacement for it — nothing here is a security boundary, and a rule the
 * client does not know about still arrives from the server intact.
 *
 * Presence first in every list, so an empty field is told it is empty rather
 * than told it is too short.
 */
const FIELD_RULES = {
    fullname: [
        { test: v => !!v.trim(), message: 'יש להזין שם מלא' },
        { test: v => v.trim().length >= 2, message: 'שם מלא חייב להכיל 2 תווים לפחות' },
        { test: v => v.trim().length <= 80, message: 'שם מלא יכול להכיל עד 80 תווים' },
    ],
    username: [
        { test: v => !!v.trim(), message: 'יש להזין שם משתמש' },
        { test: v => v.trim().length >= 3, message: 'שם המשתמש חייב להכיל 3 תווים לפחות' },
        { test: v => v.trim().length <= 40, message: 'שם המשתמש יכול להכיל עד 40 תווים' },
    ],
    password: [
        // Not trimmed, matching the schema: a space is a character in a
        // password, and quietly dropping it would reject a password the
        // server would have accepted.
        { test: v => !!v, message: 'יש להזין סיסמה' },
        { test: v => v.length >= 8, message: 'הסיסמה חייבת להכיל 8 תווים לפחות' },
        { test: v => v.length <= 200, message: 'הסיסמה יכולה להכיל עד 200 תווים' },
    ],
    imgUrl: [
        { test: v => !v || _isUrl(v), message: 'כתובת התמונה אינה תקינה' },
    ],
}

/* The order problems are reported in, which is the order they are asked for. */
const FIELD_ORDER = ['fullname', 'username', 'password', 'imgUrl']

/**
 * Server failures that carry no `details` — they are not schema violations, so
 * `validate` never sees them and there is no field to attach them to
 * automatically.
 *
 * Only "already taken" is worth naming: it is the one failure a shopper can
 * actually do something about, and it was previously indistinguishable from a
 * server outage.
 */
const SERVER_ERRORS = {
    'Username already taken': { field: 'username', message: 'שם המשתמש כבר תפוס. בחרו שם אחר.' },
}

/* When nothing better arrived — a 500, a dropped connection. Here the advice
   to try again is accurate, which is exactly why it must not be the answer to
   everything. */
const GENERIC_ERROR = 'ההרשמה נכשלה. נסו שוב בעוד רגע.'

function _isUrl(value) {
    try {
        new URL(value)
        return true
    } catch {
        return false
    }
}

function _firstFailure(field, value) {
    return FIELD_RULES[field]?.find(rule => !rule.test(value ?? ''))?.message ?? null
}

function _validate(credentials) {
    return FIELD_ORDER
        .map(field => ({ field, message: _firstFailure(field, credentials[field]) }))
        .filter(problem => problem.message)
}

/**
 * Reads what the server actually said, which is the whole of BUG-009.
 *
 * `Signup.jsx` used to catch with no binding at all — `} catch {` — so there
 * was no `err` in scope and `details` could not be read even in principle. The
 * information was never lost in transit; it arrived intact and was stepped
 * over, and every failure became "try again in a moment": deterministic advice
 * to repeat an action that cannot work.
 *
 * The server's messages are English and this UI is Hebrew, so showing
 * `detail.message` is the last resort, not the plan. It is rare by
 * construction: FIELD_RULES mirrors every rule `signupSchema` currently has,
 * so a validation failure that reaches here is one the schema gained and this
 * form has not caught up with. English and precise beats Hebrew and wrong —
 * and it is a visible signal that the two have drifted.
 */
function _serverProblems(err) {
    const data = err?.response?.data

    if (data?.details?.length) {
        return data.details.map(detail => ({
            field: detail.field,
            message: detail.message,
        }))
    }

    const known = SERVER_ERRORS[data?.err]
    if (known) return [known]

    return [{ field: null, message: GENERIC_ERROR }]
}

export function Signup() {
    const [credentials, setCredentials] = useState(userService.getEmptyUser())
    const navigate = useNavigate()
    const location = useLocation()

    // Same as Login: checkout sends signed-out shoppers here and expects them
    // back afterwards rather than on the homepage.
    const redirectTo = location.state?.from || '/'

    function clearState() {
        setCredentials({ username: '', password: '', fullname: '', imgUrl: '' })
    }

    const [problems, setProblems] = useState([])

    const invalidFields = new Set(problems.map(problem => problem.field))

    function handleChange(ev) {
        const field = ev.target.name
        const value = ev.target.value
        setCredentials({ ...credentials, [field]: value })
        // Clear this field's complaint only. The others are still true, and
        // wiping them on the first keystroke would hide problems the shopper
        // has not dealt with yet.
        setProblems(prev => prev.filter(problem => problem.field !== field))
    }

    async function onSignup(ev = null) {
        if (ev) ev.preventDefault()

        const failures = _validate(credentials)
        if (failures.length) return setProblems(failures)

        setProblems([])
        try {
            await signup(credentials)
            clearState()
            navigate(redirectTo)
        } catch (err) {
            setProblems(_serverProblems(err))
        }
    }

    function onUploaded(imgUrl) {
        setCredentials({ ...credentials, imgUrl })
        setProblems(prev => prev.filter(problem => problem.field !== 'imgUrl'))
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
                    aria-invalid={invalidFields.has('fullname')}
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
                    aria-invalid={invalidFields.has('username')}
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
                    aria-invalid={invalidFields.has('password')}
                />
            </div>

            <div className="auth-field">
                <span className="auth-field-label">תמונת פרופיל (רשות)</span>
                <ImgUploader onUploaded={onUploaded} />
            </div>

            {/* One alert, every problem. `details` can name more than one
                field, and showing only the first sends a shopper round the
                loop once per mistake. */}
            {!!problems.length && (
                <div className="auth-error" role="alert">
                    {problems.map(problem => (
                        <p key={problem.field ?? problem.message}>{problem.message}</p>
                    ))}
                </div>
            )}

            <button className="auth-submit" type="submit">הרשמה</button>
        </form>
    )
}