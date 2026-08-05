import { httpService } from '../http.service'

const STORAGE_KEY_LOGGEDIN_USER = 'loggedinUser'

export const userService = {
	login,
	logout,
	signup,
	getUsers,
	getById,
	remove,
	update,
    getLoggedinUser,
    saveLoggedinUser,
    fetchLoggedinUser,
}

function getUsers() {
	return httpService.get(`user`)
}

async function getById(userId) {
	const user = await httpService.get(`user/${userId}`)
	return user
}

function remove(userId) {
	return httpService.delete(`user/${userId}`)
}

async function update({ _id, score }) {
	const user = await httpService.put(`user/${_id}`, { _id, score })

	// When admin updates other user's details, do not update loggedinUser
    const loggedinUser = getLoggedinUser() // Might not work because its defined in the main service???
    if (loggedinUser._id === user._id) saveLoggedinUser(user)

	return user
}

async function login(userCred) {
	const user = await httpService.post('auth/login', userCred)
	if (user) return saveLoggedinUser(user)
}

async function signup(userCred) {
	if (!userCred.imgUrl) userCred.imgUrl = 'https://cdn.pixabay.com/photo/2020/07/01/12/58/icon-5359553_1280.png'
	userCred.score = 10000

    const user = await httpService.post('auth/signup', userCred)
	return saveLoggedinUser(user)
}

async function logout() {
	sessionStorage.removeItem(STORAGE_KEY_LOGGEDIN_USER)
	return await httpService.post('auth/logout')
}

/**
 * The CACHED answer. Synchronous, so it can be read during render.
 *
 * This is not the source of truth — the session cookie is (see
 * `fetchLoggedinUser`). It exists so the first paint after a reload does not
 * flash signed-out UI while the server is being asked.
 */
function getLoggedinUser() {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY_LOGGEDIN_USER))
}

/**
 * The REAL answer — was BUG-005.
 *
 * `sessionStorage` is scoped per tab. A link opened in a new tab starts with
 * an empty one, so the app decided it was dealing with a guest while the
 * session cookie sat there, valid, and the server would happily have said so.
 * The visible symptom was the shopper's cart emptying and then reappearing
 * when they switched back.
 *
 * The cookie belongs to the browser profile, so every tab already sends it.
 * Asking the server is the only way to get an answer that is true in all of
 * them — and it also fixes a new window and a browser restart, which
 * localStorage would have papered over without addressing the design.
 *
 * A 401 here is the ordinary answer for a guest, not a failure. It resolves to
 * null and clears the stale cache.
 */
async function fetchLoggedinUser() {
    try {
        const user = await httpService.get('auth/me')
        return saveLoggedinUser(user)
    } catch (err) {
        sessionStorage.removeItem(STORAGE_KEY_LOGGEDIN_USER)
        return null
    }
}

function saveLoggedinUser(user) {
	user = { 
        _id: user._id, 
        fullname: user.fullname, 
        imgUrl: user.imgUrl, 
        score: user.score, 
        isAdmin: user.isAdmin 
    }
	sessionStorage.setItem(STORAGE_KEY_LOGGEDIN_USER, JSON.stringify(user))
	return user
}
