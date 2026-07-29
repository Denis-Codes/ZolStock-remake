// import React from 'react'
// import ReactDOM from 'react-dom/client'

// import { BrowserRouter as Router } from 'react-router-dom'
// import { Provider } from 'react-redux'

// import * as serviceWorkerRegistration from './serviceWorkerRegistration'

// import { store } from './store/store'
// import { RootCmp } from './RootCmp'

// import './assets/styles/main.scss'
// import "slick-carousel/slick/slick.css"
// // import "slick-carousel/slick/slick-theme.css"

// const root = ReactDOM.createRoot(document.getElementById('root'))
// root.render(
// 	<Provider store={store}>
// 		<Router>
// 			<RootCmp />
// 		</Router>
// 	</Provider>
// )

// // If you want your app to work offline and load faster, you can change
// // unregister() to register() below. Note this comes with some pitfalls.
// // Learn more about service workers: https://cra.link/PWA
// serviceWorkerRegistration.register()

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider } from 'react-redux'

import * as serviceWorkerRegistration from './serviceWorkerRegistration'
import { store } from './store/store'
import { RootCmp } from './RootCmp'

import './assets/styles/main.scss'
import "slick-carousel/slick/slick.css"

const root = ReactDOM.createRoot(document.getElementById('root'))
console.log('MODE:', import.meta.env.MODE, 'PROD:', import.meta.env.PROD, 'BASE_URL:', import.meta.env.BASE_URL)

// Version-based cache management - only clear on updates
const APP_VERSION = '1.0.1'

;(async () => {
  try {
    const lastVersion = localStorage.getItem('app_version')

    // Only clear caches when version updates or first load
    if (lastVersion !== APP_VERSION) {
      console.log(`Version update detected: ${lastVersion} → ${APP_VERSION}`)

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
        console.log('Service workers unregistered:', registrations.length)
      }

      // Clear caches
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(name => caches.delete(name)))
        console.log('Caches cleared:', names.length)
      }

      localStorage.setItem('app_version', APP_VERSION)
      console.log('Cache cleared successfully')
    } else {
      console.log('App version unchanged, using cached resources')
    }
  } catch (error) {
    console.error('Error managing service worker/caches:', error)
  }
})()

root.render(
  <Provider store={store}>
    <Router basename={import.meta.env.BASE_URL}>
      <RootCmp />
    </Router>
  </Provider>
)

serviceWorkerRegistration.unregister()