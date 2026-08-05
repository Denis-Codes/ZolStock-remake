import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { Signup } from '../../src/pages/Signup.jsx'
import { server } from './msw/server.js'

/**
 * Signup — what the form does with a validation failure from the server.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * Found by using the app, not by reading it. A signup with a short password
 * produced this in the console:
 *
 *   POST /api/auth/signup 400
 *   {"err":"Validation failed",
 *    "details":[{"field":"password","message":"Password must be at least 8 characters"}]}
 *
 * The server behaved impeccably. It named the field and stated the rule. The
 * form showed "ההרשמה נכשלה. נסו שוב בעוד רגע" — "registration failed, try
 * again in a moment" — and the account was never created.
 *
 * ── Why MSW rather than mocking the signup action ─────────────────────────
 * Mocking `signup()` to reject would test the catch block in isolation and
 * prove nothing about whether the real error survives the trip. Answering the
 * real request with the real 400 body exercises the whole client chain the
 * console log came from:
 *
 *   Signup.jsx → user.actions → user.service.remote → http.service → axios
 *
 * Any layer that flattens the error is caught here, not just the last one.
 *
 * ── The response bodies below are copied from the running server ──────────
 * Not invented. A handler returning a convenient made-up shape lets a test
 * pass against data the API never sends, which is the most common way
 * component tests give false confidence. These match `auth.schema.js`, and
 * `backend/tests/unit/validate.middleware.test.js` pins the server side of the
 * same contract.
 */

const GENERIC_ERROR = 'ההרשמה נכשלה. נסו שוב בעוד רגע.'

/* The exact wording the server sends. If someone rewords auth.schema.js, the
   assertions below still pass — they are about the message being DISCARDED,
   not about its text. It appears here so the diff shows what was thrown away. */
const SERVER_PASSWORD_MESSAGE = 'Password must be at least 8 characters'
const SERVER_USERNAME_MESSAGE = 'Username must be at least 3 characters'

/** Records every signup request so a test can assert one was never sent. */
let signupRequests

function answerSignupWith(status, body) {
  server.use(
    http.post('*/api/auth/signup', async ({ request }) => {
      signupRequests.push(await request.clone().json())
      return HttpResponse.json(body, { status })
    })
  )
}

function validationFailure(field, message) {
  return { err: 'Validation failed', details: [{ field, message }] }
}

function renderSignup() {
  return {
    user: userEvent.setup(),
    // useNavigate and useLocation read from router context; rendered bare, the
    // component throws before a single assertion runs.
    ...render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    ),
  }
}

async function fillAndSubmit(user, { fullname, username, password }) {
  if (fullname) await user.type(screen.getByLabelText('שם מלא'), fullname)
  if (username) await user.type(screen.getByLabelText('שם משתמש'), username)
  if (password) await user.type(screen.getByLabelText('סיסמה'), password)
  await user.click(screen.getByRole('button', { name: 'הרשמה' }))
}

beforeEach(() => {
  signupRequests = []
  // http.service and user.actions both console.log the axios error on failure.
  // Silenced so a passing run stays readable; the assertions do not depend on it.
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'dir').mockImplementation(() => {})
})

describe('the client-side guards that already work', () => {
  /**
   * These pass today. They are here because the bug below is easy to
   * misread as "the form has no validation at all" — it does, and it names
   * the missing field precisely. The gap is narrower and more interesting
   * than that: it validates PRESENCE and delegates every RULE.
   */
  it.each([
    ['no full name', { username: 'shopper1', password: 'Passw0rd!' }, 'יש להזין שם מלא'],
    ['no username', { fullname: 'Test Shopper', password: 'Passw0rd!' }, 'יש להזין שם משתמש'],
    ['no password', { fullname: 'Test Shopper', username: 'shopper1' }, 'יש להזין סיסמה'],
  ])('%s — names the missing field and sends no request', async (_label, fields, expected) => {
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', SERVER_PASSWORD_MESSAGE))

    await fillAndSubmit(user, fields)

    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    // The valuable half of this assertion. A form that shows the right message
    // AND still posts has not actually prevented anything.
    expect(signupRequests).toHaveLength(0)
  })
})

describe('🐛 BUG-009: the server explains the problem and the form discards it', () => {
  /**
   * `Signup.jsx`:
   *
   *     } catch {
   *         setError('ההרשמה נכשלה. נסו שוב בעוד רגע.')
   *     }
   *
   * A bare `catch` with no binding — there is no `err` in scope, so this cannot
   * read `details` even in principle. The information is not lost in transit;
   * it arrives intact and is stepped over.
   *
   * These tests assert the CURRENT behaviour so the suite stays green and the
   * gap is a written fact. They are named for the bug and will go red the
   * moment it is fixed, which is the intended signal.
   */

  it('shows generic retry text instead of the rule the server stated', async () => {
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', SERVER_PASSWORD_MESSAGE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'short12', // 7 characters — one below the limit
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR)
    // The bug, stated as an assertion: what the server said is nowhere on screen.
    expect(screen.queryByText(/8/)).toBeNull()
    expect(screen.queryByText(new RegExp(SERVER_PASSWORD_MESSAGE, 'i'))).toBeNull()
  })

  it('is the same message for a short username, so the cause is unknowable', async () => {
    /**
     * This is what makes it more than a wording problem. Two different rules,
     * two different fields, two precise server messages — and one identical
     * sentence on screen. The shopper cannot tell which input to change, and
     * neither can support reading a screenshot.
     */
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('username', SERVER_USERNAME_MESSAGE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'ab', // 2 characters — one below the limit
      password: 'Passw0rd!',
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR)
    expect(screen.queryByText(/username/i)).toBeNull()
  })

  it('sends a password it could have rejected without asking', async () => {
    /**
     * The other half of the same defect. The form knows how to check a field
     * — it does it three times for presence — but the length rule lives only
     * on the server, so a shopper waits for a round trip to be told something
     * the page could have said as they typed.
     *
     * `noValidate` is on the <form> and there is no minLength on the input, so
     * the browser will not step in either.
     */
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', SERVER_PASSWORD_MESSAGE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'short12',
    })

    await screen.findByRole('alert')
    expect(signupRequests).toHaveLength(1)
    expect(signupRequests[0].password).toBe('short12')
  })

  it('advises a retry that reproduces the failure exactly', async () => {
    /**
     * The most damaging part, and the reason this is Medium rather than Low.
     *
     * "נסו שוב בעוד רגע" — try again in a moment — describes a TRANSIENT
     * fault. This one is deterministic: the same input fails identically
     * forever. The form is telling the shopper to do the one thing guaranteed
     * not to work, and giving them no way to discover what would.
     *
     * Two submissions, two requests, byte-identical outcome.
     */
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', SERVER_PASSWORD_MESSAGE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'short12',
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR)

    // Exactly what a shopper does when told to try again: press it again.
    await user.click(screen.getByRole('button', { name: 'הרשמה' }))

    await waitFor(() => expect(signupRequests).toHaveLength(2))
    expect(signupRequests[0]).toEqual(signupRequests[1])
    expect(screen.getByRole('alert')).toHaveTextContent(GENERIC_ERROR)
  })
})

describe('when the generic message is the right message', () => {
  /**
   * The contrast that keeps the bug honest.
   *
   * A fallback for unexpected failures is correct and should survive the fix.
   * The defect is not "there is a generic message" — it is "the generic
   * message is used even when something better arrived". Without this test,
   * a fix could delete the fallback and leave a 500 rendering nothing at all,
   * and the suite would applaud.
   */
  it('a 500 has no details to show, so the retry advice is accurate', async () => {
    const { user } = renderSignup()
    answerSignupWith(500, { err: 'Internal server error' })

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'Passw0rd!',
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR)
  })
})
