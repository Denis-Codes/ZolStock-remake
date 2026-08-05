import { setupServer } from 'msw/node'

import { handlers } from './handlers.js'

/**
 * The MSW server used by every unit/component test.
 *
 * Default handlers live in handlers.js and describe the happy path. A test
 * that needs a different response overrides just that endpoint:
 *
 *   server.use(
 *     http.get('*\/api\/product', () => HttpResponse.json([], { status: 500 }))
 *   )
 *
 * setup.js resets handlers after every test, so an override is scoped to the
 * test that declared it.
 */
export const server = setupServer(...handlers)
