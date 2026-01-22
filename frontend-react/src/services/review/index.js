const { DEV, VITE_LOCAL, MODE } = import.meta.env

import { reviewService as local } from './review.service.local'
import { reviewService as remote } from './review.service.remote'

const isGithub = MODE === 'github'

// בגיטהאב תמיד LOCAL
export const reviewService = isGithub ? local : (VITE_LOCAL === 'true' ? local : remote)

// Easy access to this service from the dev tools console
// when using script - dev / dev:local

if (DEV) window.reviewService = reviewService
