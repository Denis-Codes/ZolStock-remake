/**
 * The login / signup screens.
 *
 * ── Why a page object at all ──────────────────────────────────────────────
 * A page object is one place that knows how to find things on a screen. The
 * tests then read as intent — `await auth.signup(name)` — and when the markup
 * changes, one file changes instead of every spec that touched that screen.
 *
 * It is the single most commonly named pattern in QA automation job postings,
 * and the reason is unglamorous: suites die of selector maintenance, not of
 * bad assertions.
 *
 * ── Why these locators ────────────────────────────────────────────────────
 * getByLabel finds an input through its <label>, the same association a screen
 * reader uses. So it survives class renames and DOM restructuring, and it fails
 * if the label association breaks — which is a real accessibility bug worth
 * failing on. A CSS selector like `.auth-field:nth-child(2) input` would pass
 * through both of those and break on a reorder that changes nothing.
 */
export class AuthPage {
  constructor(page) {
    this.page = page

    this.fullnameInput = page.getByLabel('שם מלא')
    this.usernameInput = page.getByLabel('שם משתמש')
    this.passwordInput = page.getByLabel('סיסמה')

    this.signupSubmit = page.getByRole('button', { name: 'הרשמה' })
    this.loginSubmit = page.getByRole('button', { name: 'התחברות' })

    /* role="alert" is announced by assistive tech the moment it appears, so
       querying by role rather than by class asserts that a failure is actually
       communicated — not merely rendered somewhere. */
    this.error = page.getByRole('alert')
  }

  async gotoSignup() {
    await this.page.goto('/login/signup')
  }

  async gotoLogin() {
    await this.page.goto('/login')
  }

  /**
   * Registers an account and waits for the redirect that follows success.
   *
   * The wait is the important part. Signup navigates on completion, and
   * asserting anything before that navigation lands is how a suite becomes
   * intermittently red — it passes on a fast machine and fails in CI. Waiting
   * for the URL to change is an explicit, observable condition rather than a
   * sleep.
   */
  async signup(username, { password = 'Passw0rd!', fullname = 'E2E Shopper' } = {}) {
    await this.gotoSignup()

    await this.fullnameInput.fill(fullname)
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.signupSubmit.click()

    await this.page.waitForURL(url => !url.pathname.startsWith('/login'))
  }

  async login(username, password = 'Passw0rd!') {
    await this.gotoLogin()

    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.loginSubmit.click()
  }
}

/* Unique per call, so a spec that registers an account never collides with
   another spec's account or with a previous run against the same server. */
export const uniqueUsername = (prefix = 'e2e') =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
