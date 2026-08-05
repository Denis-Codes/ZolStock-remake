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
 * Both halves are now fixed and this file covers both: the form mirrors the
 * server's rules so the common failures never leave the page, and what the
 * server does send is read rather than stepped over. See bugs/BUG-009.
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

/* The exact wording the server sends, kept because the tests below are about
   WHICH message wins rather than about its text: the client's Hebrew when it
   knows the rule, the server's English when it does not. */
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

describe('the client-side guards', () => {
  /**
   * Presence. These passed before the fix and still do — the gap was never
   * "this form has no validation", it was that presence was all it checked.
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

  /**
   * Length. The rules the form now mirrors from `auth.schema.js`, pinned to
   * the same figures the server uses — 2 / 3 / 8.
   *
   * A duplicated rule that drifts is worse than no duplicate, so these numbers
   * are the point of the test, not incidental to it.
   * `backend/tests/unit/schemas.test.js` pins the other side.
   */
  it.each([
    ['full name of 1 character', { fullname: 'A', username: 'shopper1', password: 'Passw0rd!' }, 'שם מלא חייב להכיל 2 תווים לפחות'],
    ['username of 2 characters', { fullname: 'Test Shopper', username: 'ab', password: 'Passw0rd!' }, 'שם המשתמש חייב להכיל 3 תווים לפחות'],
    ['password of 7 characters', { fullname: 'Test Shopper', username: 'shopper1', password: 'short12' }, 'הסיסמה חייבת להכיל 8 תווים לפחות'],
  ])('%s — states the rule without asking the server', async (_label, fields, expected) => {
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', SERVER_PASSWORD_MESSAGE))

    await fillAndSubmit(user, fields)

    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(signupRequests).toHaveLength(0)
  })

  it.each([
    ['exactly 2 / 3 / 8 characters', { fullname: 'Jo', username: 'abc', password: '12345678' }],
    ['comfortably above every limit', { fullname: 'Test Shopper', username: 'shopper1', password: 'Passw0rd!' }],
  ])('accepts %s', async (_label, fields) => {
    /**
     * The boundary from the passing side, which is the half that catches an
     * off-by-one. A form using `>` instead of `>=` would satisfy every test
     * above and reject a password the server accepts — the most annoying
     * possible outcome, because the shopper is told a rule they are obeying.
     */
    const { user } = renderSignup()
    answerSignupWith(200, { _id: 'u1', fullname: fields.fullname })

    await fillAndSubmit(user, fields)

    await waitFor(() => expect(signupRequests).toHaveLength(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports every problem at once, not one per round trip', async () => {
    /**
     * Three empty-ish fields used to mean three submissions to discover three
     * rules, because the old form returned on the first failure. The shopper's
     * time is the thing being spent here.
     */
    const { user } = renderSignup()

    await fillAndSubmit(user, { fullname: 'A', username: 'ab', password: 'short12' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('שם מלא חייב להכיל 2 תווים לפחות')
    expect(alert).toHaveTextContent('שם המשתמש חייב להכיל 3 תווים לפחות')
    expect(alert).toHaveTextContent('הסיסמה חייבת להכיל 8 תווים לפחות')
  })

  it('marks the offending input, so the message has something to point at', async () => {
    // `aria-invalid` is what a screen reader announces and what the field
    // border reads from, and it is the difference between "something is wrong"
    // and "this box is wrong".
    const { user } = renderSignup()

    await fillAndSubmit(user, { fullname: 'Test Shopper', username: 'shopper1', password: 'short12' })

    await screen.findByRole('alert')
    expect(screen.getByLabelText('סיסמה')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('שם משתמש')).toHaveAttribute('aria-invalid', 'false')
  })

  it('takes the complaint back when the shopper fixes that field', async () => {
    /**
     * And only that field. Clearing everything on the first keystroke — which
     * is what the login form does, with one error to clear — would hide
     * problems the shopper has not dealt with yet.
     */
    const { user } = renderSignup()

    await fillAndSubmit(user, { fullname: 'A', username: 'ab', password: 'Passw0rd!' })
    await screen.findByRole('alert')

    await user.type(screen.getByLabelText('שם מלא'), 'nother Shopper')

    const alert = screen.getByRole('alert')
    expect(alert).not.toHaveTextContent('שם מלא')
    expect(alert).toHaveTextContent('שם המשתמש חייב להכיל 3 תווים לפחות')
  })
})

describe('BUG-009: what the server says reaches the shopper', () => {
  /**
   * `Signup.jsx` used to end in:
   *
   *     } catch {
   *         setError('ההרשמה נכשלה. נסו שוב בעוד רגע.')
   *     }
   *
   * A bare `catch` with no binding — no `err` in scope, so `details` could not
   * be read even in principle. The information was never lost in transit; it
   * arrived intact and was stepped over, and four different rules collapsed
   * into one sentence advising a retry that could not work.
   *
   * The form now mirrors the length rules, so those particular failures are
   * caught before the request — which is why the tests below use rules the
   * CLIENT DOES NOT KNOW. That is the honest test of this half of the fix: the
   * mirroring must not be what makes it look fixed, because the server will
   * always know rules the client does not.
   */

  /* A rule this form does not mirror, and could not have pre-empted. It can
     only reach the screen by being read out of the response, which is the
     whole point. */
  const UNMIRRORED_RULE = 'Password must not repeat a previous password'

  it('states the rule the server named, not a generic retry', async () => {
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', UNMIRRORED_RULE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'Passw0rd!',
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(UNMIRRORED_RULE)
    expect(alert).not.toHaveTextContent(GENERIC_ERROR)
  })

  it('shows the server\'s English only for rules it does not know', async () => {
    /**
     * The server's messages are English and this UI is Hebrew, so the test
     * above is showing a last resort rather than the plan. FIELD_RULES mirrors
     * every rule `signupSchema` currently has, so the shopper's realistic
     * mistakes are all answered in Hebrew, before the request.
     *
     * This asserts the boundary between the two: the password message that
     * DOES have a Hebrew equivalent never reaches the network, so its English
     * form cannot appear on screen even when the handler is standing by to
     * send it.
     */
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', SERVER_PASSWORD_MESSAGE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'short12',
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('הסיסמה חייבת להכיל 8 תווים לפחות')
    expect(alert).not.toHaveTextContent(SERVER_PASSWORD_MESSAGE)
    expect(signupRequests).toHaveLength(0)
  })

  it('names each field when the server rejects more than one', async () => {
    // `details` is an array precisely so this can happen. Rendering only
    // `details[0]` would send the shopper round the loop once per mistake.
    const { user } = renderSignup()
    answerSignupWith(400, {
      err: 'Validation failed',
      details: [
        { field: 'username', message: SERVER_USERNAME_MESSAGE },
        { field: 'imgUrl', message: 'Image URL must be a valid URL' },
      ],
    })

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'Passw0rd!',
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(SERVER_USERNAME_MESSAGE)
    expect(alert).toHaveTextContent('Image URL must be a valid URL')
  })

  it('explains a taken username, which carries no details at all', async () => {
    /**
     * Not a schema failure — `authService.signup` rejects with the string
     * 'Username already taken', so it arrives as `{ err }` with no `details`
     * to read. It was indistinguishable from a server outage, and it is the
     * one failure here a shopper can actually act on.
     */
    const { user } = renderSignup()
    answerSignupWith(400, { err: 'Username already taken' })

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'Passw0rd!',
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('שם המשתמש כבר תפוס. בחרו שם אחר.')
    expect(alert).not.toHaveTextContent(GENERIC_ERROR)
  })

  it('does not advise a retry for a failure that would repeat', async () => {
    /**
     * The most damaging part of the original bug, and the reason it was Medium
     * rather than Low. "נסו שוב בעוד רגע" — try again in a moment — describes
     * a TRANSIENT fault. A validation failure is deterministic: the same input
     * fails identically forever, so the form was telling the shopper to do the
     * one thing guaranteed not to work.
     *
     * The second submission is the assertion. A shopper who is told what to
     * change and changes nothing must not be told something different.
     */
    const { user } = renderSignup()
    answerSignupWith(400, validationFailure('password', UNMIRRORED_RULE))

    await fillAndSubmit(user, {
      fullname: 'Test Shopper',
      username: 'shopper1',
      password: 'Passw0rd!',
    })
    expect(await screen.findByRole('alert')).not.toHaveTextContent(GENERIC_ERROR)

    await user.click(screen.getByRole('button', { name: 'הרשמה' }))

    await waitFor(() => expect(signupRequests).toHaveLength(2))
    expect(signupRequests[0]).toEqual(signupRequests[1])
    expect(screen.getByRole('alert')).toHaveTextContent(UNMIRRORED_RULE)
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
