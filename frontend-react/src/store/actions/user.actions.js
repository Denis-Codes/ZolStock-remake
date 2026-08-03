import { userService } from '../../services/user'
import { socketService } from '../../services/socket.service'
import { store } from '../store'
import { mergeGuestCart, loadCart } from './cart.actions'
import { mergeGuestWishlist, loadWishlist } from './wishlist.actions'

import { showErrorMsg } from '../../services/event-bus.service'
import { LOADING_DONE, LOADING_START } from '../reducers/system.reducer'
import { REMOVE_USER, SET_USER, SET_USERS, SET_WATCHED_USER } from '../reducers/user.reducer'

export async function loadUsers() {
    try {
        store.dispatch({ type: LOADING_START })
        const users = await userService.getUsers()
        store.dispatch({ type: SET_USERS, users })
    } catch (err) {
        console.log('UserActions: err in loadUsers', err)
    } finally {
        store.dispatch({ type: LOADING_DONE })
    }
}

export async function removeUser(userId) {
    try {
        await userService.remove(userId)
        store.dispatch({ type: REMOVE_USER, userId })
    } catch (err) {
        console.log('UserActions: err in removeUser', err)
    }
}

export async function login(credentials) {
    try {
        const user = await userService.login(credentials)

        // The service resolves to undefined when no such username exists.
        // Without this guard `socketService.login(user._id)` threw, so an
        // unknown username surfaced as a generic failure instead of one the
        // form could explain.
        if (!user) return null

        store.dispatch({
            type: SET_USER,
            user
        })
        socketService.login(user._id)

        // Whatever was collected as a guest belongs to this account now. The
        // merge is awaited so the header badges are correct on the first
        // render after the redirect, rather than flicking from guest counts to
        // server counts a moment later.
        await syncShoppingStateOnAuth()

        return user
    } catch (err) {
        console.log('Cannot login', err)
        throw err
    }
}

/**
 * Folds guest cart and wishlist into the signed-in account.
 *
 * Failures are swallowed inside the merge thunks: a shopper who has just
 * logged in successfully should not be shown an error because a cart merge
 * hiccuped, and the next loadCart will reconcile anyway.
 */
async function syncShoppingStateOnAuth() {
    await Promise.all([
        store.dispatch(mergeGuestCart()),
        store.dispatch(mergeGuestWishlist()),
    ])
}

export async function signup(credentials) {
    try {
        const user = await userService.signup(credentials)
        store.dispatch({
            type: SET_USER,
            user
        })
        socketService.login(user._id)

        await syncShoppingStateOnAuth()

        return user
    } catch (err) {
        console.log('Cannot signup', err)
        throw err
    }
}

export async function logout() {
    try {
        await userService.logout()
        store.dispatch({
            type: SET_USER,
            user: null
        })
        socketService.logout()

        // Reload from the guest backing so the previous account's cart and
        // wishlist do not stay on screen after signing out.
        await Promise.all([
            store.dispatch(loadCart()),
            store.dispatch(loadWishlist()),
        ])
    } catch (err) {
        console.log('Cannot logout', err)
        throw err
    }
}

export async function loadUser(userId) {
    try {
        const user = await userService.getById(userId)
        store.dispatch({ type: SET_WATCHED_USER, user })
    } catch (err) {
        showErrorMsg('Cannot load user')
        console.log('Cannot load user', err)
    }
}