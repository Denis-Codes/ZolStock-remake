import Axios from 'axios'

const BASE_URL = process.env.NODE_ENV === 'production'
    ? '/api/'
    : '//localhost:3030/api/'


const axios = Axios.create({ withCredentials: true })

export const httpService = {
    get(endpoint, data) {
        return ajax(endpoint, 'GET', data)
    },
    post(endpoint, data) {
        return ajax(endpoint, 'POST', data)
    },
    put(endpoint, data) {
        return ajax(endpoint, 'PUT', data)
    },
    delete(endpoint, data) {
        return ajax(endpoint, 'DELETE', data)
    }
}

/**
 * Endpoints where a 401 is an ANSWER, not an expired session.
 *
 * The interceptor below force-signs-out and navigates to the homepage on any
 * 401. That is right for `GET /api/cart` — the session died mid-visit and the
 * app must recover. It is wrong for these two:
 *
 * - `auth/me` is how the app asks "is anyone signed in?" on start. For a
 *   guest the honest reply is 401, and redirecting on it would bounce every
 *   signed-out visitor off whatever page they opened.
 * - `auth/login` returns 401 for a wrong password. Navigating away means the
 *   form's "incorrect username or password" renders onto a page that is
 *   already unloading, so the shopper is dropped on the homepage with no idea
 *   why. (Recorded as an unverified hypothesis in BUG-009; confirmed while
 *   wiring up auth/me, because a guest hitting the new endpoint reproduced it
 *   on every page load.)
 *
 * The caller sees the rejection either way and decides what it means.
 */
const ENDPOINTS_WHERE_401_IS_EXPECTED = ['auth/me', 'auth/login']

async function ajax(endpoint, method = 'GET', data = null) {
    const url = `${BASE_URL}${endpoint}`
    const params = (method === 'GET') ? data : null

    const options = { url, method, data, params }

    try {
        const res = await axios(options)
        return res.data
    } catch (err) {
        console.log(`Had Issues ${method}ing to the backend, endpoint: ${endpoint}, with data: `, data)
        console.dir(err)

        const isExpected401 = ENDPOINTS_WHERE_401_IS_EXPECTED.includes(endpoint)
        if (err.response && err.response.status === 401 && !isExpected401) {
            sessionStorage.clear()
            window.location.assign('/')
        }
        throw err
    }
}