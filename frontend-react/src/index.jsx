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

root.render(
  <Provider store={store}>
    <Router>
      <RootCmp />
    </Router>
  </Provider>
)

// const isGithub = import.meta.env.MODE === 'github'
// if (!isGithub) serviceWorkerRegistration.register()
// else serviceWorkerRegistration.unregister()

serviceWorkerRegistration.unregister()