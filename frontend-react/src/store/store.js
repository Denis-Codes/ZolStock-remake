import {
  legacy_createStore as createStore,
  combineReducers,
  applyMiddleware,
  compose,
} from 'redux'
import { thunk } from 'redux-thunk'

import { productReducer } from './reducers/product.reducer'
import { userReducer } from './reducers/user.reducer'
import { reviewReducer } from './reducers/review.reducer'
import { systemReducer } from './reducers/system.reducer'
import { cartReducer } from './reducers/cart.reducer'
import { wishlistReducer } from './reducers/wishlist.reducer'

const rootReducer = combineReducers({
  productModule: productReducer,
  userModule: userReducer,
  systemModule: systemReducer,
  reviewModule: reviewReducer,
  cartModule: cartReducer,
  wishlistModule: wishlistReducer,
})

const composeEnhancers =
  (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose

export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
)
