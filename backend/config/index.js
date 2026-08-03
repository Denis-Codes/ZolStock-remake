import './env.js' // must be first — see env.js for why

import configProd from './prod.js'
import configDev from './dev.js'

const isProd = process.env.NODE_ENV === 'production'

export const isProduction = isProd
export var config = isProd ? configProd : configDev

// Fail at boot rather than on the first request that happens to touch the DB.
if (!config.dbURL) {
  throw new Error('MONGO_URL is not set. Copy .env.example to .env and fill it in.')
}

