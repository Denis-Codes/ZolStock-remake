const { DEV, VITE_LOCAL, MODE } = import.meta.env

import { userService as local } from './user.service.local'
import { userService as remote } from './user.service.remote'

function getEmptyUser() {
    return {
        username: '',
        password: '',
        fullname: '',
        isAdmin: false,
        score: 100,
    }
}

const isGithub = MODE === 'github'

// בגיטהאב תמיד LOCAL
const service = isGithub ? local : (VITE_LOCAL === 'true' ? local : remote)
export const userService = { ...service, getEmptyUser }

// Easy access to this service from the dev tools console
// when using script - dev / dev:local

if(DEV) window.userService = userService