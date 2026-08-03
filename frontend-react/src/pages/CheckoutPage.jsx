/*
 * DIRECTION CONTRACT — checkout surface (seed key 33852623, mode: operate)
 *
 * THESIS: The order manifest is never out of sight. Refuses the category
 *   default where the summary is a collapsed accordion the shopper opens once
 *   and forgets while filling a full-page form.
 * OWN-WORLD: The committed ZolStock system, unchanged — white panels on
 *   page-bg, 4-8px radii, one blue for every affordance, the yellow price tag
 *   as the single loudest object, flat at rest.
 * STORY: The shopper sees exactly what they are buying and what they save,
 *   fills an address, and pays without the total ever leaving the screen.
 * FIRST VIEWPORT: Two panes. Address form leads on the inline-start (right);
 *   manifest holds the left at 380px with items, savings, delivery and the
 *   yellow total. Primary action ends the form; below $bp-lg it docks.
 * FORM: Two-pane split — candidate 6 of the grounded list, as assigned.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 */
import { useState, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'

import { loadCart } from '../store/actions/cart.actions'
import { orderService, getEmptyAddress } from '../services/order/order.service.remote'
import { cartRemoteService } from '../services/cart/cart.service.remote'
import { onProductImageError } from '../services/util.service'
import { formatMoney, moneyParts, moneyAriaLabel, CURRENCY_SIGN } from '../services/money.service'

/**
 * Mirrors the server's Zod schema so the shopper is told what is wrong before
 * a round trip. The server still validates — this only spares the wait.
 * Bounds match order.schema.js so an over-long value cannot round-trip into an
 * untranslated server error.
 */
function validate(address) {
  const errors = {}

  const name = address.fullname.trim()
  if (name.length < 2) errors.fullname = 'צריך שם מלא'
  else if (name.length > 80) errors.fullname = 'השם ארוך מדי — עד 80 תווים'

  if (!/^[0-9+\-\s()]{9,20}$/.test(address.phone.trim())) {
    errors.phone = 'מספר טלפון לא תקין — לפחות 9 ספרות'
  }

  if (!address.city.trim()) errors.city = 'צריך עיר'
  else if (address.city.trim().length > 60) errors.city = 'שם העיר ארוך מדי — עד 60 תווים'

  if (!address.street.trim()) errors.street = 'צריך רחוב'
  else if (address.street.trim().length > 120) errors.street = 'שם הרחוב ארוך מדי — עד 120 תווים'

  return errors
}

/**
 * The API answers in English, because its messages are operational rather than
 * user-facing. The two that a shopper can actually trigger are translated;
 * anything else falls back to a general line rather than showing English.
 */
function toHebrewError(body) {
  const raw = body?.err || ''

  if (/sold out/i.test(raw)) {
    return 'אחד המוצרים אזל בזמן התשלום. עדכנו את העגלה ונסו שוב.'
  }
  if (/cart is empty/i.test(raw)) return 'העגלה ריקה.'
  if (/no longer available/i.test(raw)) {
    return 'חלק מהפריטים כבר לא זמינים בכמות שביקשתם.'
  }
  return 'לא הצלחנו להשלים את ההזמנה. נסו שוב.'
}

const FIELDS = [
  { name: 'fullname', label: 'שם מלא', autoComplete: 'name', required: true, span: 2 },
  { name: 'phone', label: 'טלפון', autoComplete: 'tel', required: true, span: 2, inputMode: 'tel', dir: 'ltr' },
  { name: 'city', label: 'עיר', autoComplete: 'address-level2', required: true, span: 2 },
  { name: 'street', label: 'רחוב', autoComplete: 'address-line1', required: true, span: 2 },
  { name: 'houseNumber', label: 'מספר בית', autoComplete: 'address-line2', span: 1 },
  { name: 'zip', label: 'מיקוד', autoComplete: 'postal-code', span: 1, inputMode: 'numeric', dir: 'ltr' },
  { name: 'floor', label: 'קומה', span: 1, inputMode: 'numeric' },
  { name: 'apartment', label: 'דירה', span: 1, inputMode: 'numeric' },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((storeState) => storeState.userModule.user)

  const [address, setAddress] = useState(() => getEmptyAddress())
  const [touched, setTouched] = useState({})
  const [cart, setCart] = useState(null)
  const [isPlacing, setIsPlacing] = useState(false)
  // Distinct from "cart could not load" — a failed fetch must never be
  // rendered as the fact that the cart is empty.
  const [loadFailed, setLoadFailed] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  // Checkout is behind sign-in: orders belong to an account so they can be
  // read back. Anyone who lands here signed out is sent to log in and returned
  // here afterwards, and the guest cart they built merges on the way through.
  useEffect(() => {
    if (!user) navigate('/login', { replace: true, state: { from: '/checkout' } })
  }, [user, navigate])

  // Read the cart from the server rather than the store: this is the figure
  // the shopper is about to be charged, so it comes from the same place that
  // will price the order.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    setLoadFailed(false)
    cartRemoteService
      .get()
      .then((serverCart) => {
        if (!cancelled) setCart(serverCart)
      })
      .catch(() => {
        if (!cancelled) {
          setCart(null)
          setLoadFailed(true)
        }
      })

    return () => { cancelled = true }
  }, [user, reloadToken])

  // Prefill the name we already know; the shopper can overwrite it.
  useEffect(() => {
    if (user?.fullname) {
      setAddress((prev) => (prev.fullname ? prev : { ...prev, fullname: user.fullname }))
    }
  }, [user])

  const totals = cart?.totals || {}
  const items = cart?.items || []

  const liveErrors = useMemo(() => validate(address), [address])

  // Deliberately not gated on validity. A submit button that greys out while
  // the shopper is still working gives them nothing to act on — they cannot
  // tell which field is unhappy or why. Submitting an incomplete form instead
  // marks every problem, focuses the first, and explains each one.
  const canPlace = items.length > 0 && !isPlacing

  function handleChange(ev) {
    const { name, value } = ev.target
    setAddress((prev) => ({ ...prev, [name]: value }))
  }

  function handleBlur(ev) {
    setTouched((prev) => ({ ...prev, [ev.target.name]: true }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSubmitError('')

    const found = validate(address)
    if (Object.keys(found).length) {
      setTouched(Object.fromEntries(FIELDS.map((f) => [f.name, true])))
      // Move the shopper to the first problem instead of leaving them to hunt.
      // flushSync so the error node and its aria-describedby exist before focus
      // lands, otherwise a screen reader announces a field with nothing on it.
      flushSync(() => {})
      document.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }

    setIsPlacing(true)
    try {
      const order = await orderService.checkout({
        shippingAddress: address,
        paymentMethod: 'simulated',
      })
      // The server empties the cart as part of placing the order; resync so
      // the header badge does not keep showing the old count.
      await dispatch(loadCart())
      navigate(`/order/${order._id}`, { replace: true })
    } catch (err) {
      // Kept on the page rather than thrown into a 3s toast: a failed checkout
      // is the moment a shopper most needs the message to stay put. Re-fetch
      // the cart too, since a sold-out failure means what is on screen is now
      // stale.
      setSubmitError(toHebrewError(err?.response?.data))
      setReloadToken((n) => n + 1)
      setIsPlacing(false)
    }
  }

  if (!user) return null

  // A failed fetch is a failure, not an empty cart. Saying "your cart is
  // empty" when the request merely did not arrive tells the shopper something
  // false and offers them no way back.
  if (loadFailed) {
    return (
      <section className="checkout-page checkout-page--empty">
        <div className="checkout-empty">
          <h1>לא הצלחנו לטעון את העגלה</h1>
          <p>ייתכן שהחיבור נפל. הפריטים שלכם שמורים.</p>
          <button
            type="button"
            className="checkout-empty__cta"
            onClick={() => setReloadToken((n) => n + 1)}
          >
            נסו שוב
          </button>
        </div>
      </section>
    )
  }

  // Held render while the cart is in flight. Painting the split early showed
  // "מוצרים ()" and ₪0 in both the total tag and the button.
  if (!cart) {
    return (
      <section className="checkout-page checkout-page--empty">
        <div className="checkout-empty" role="status" aria-live="polite">
          <p>טוען את ההזמנה…</p>
        </div>
      </section>
    )
  }

  if (!items.length) {
    return (
      <section className="checkout-page checkout-page--empty">
        <div className="checkout-empty">
          <h1>אין מה לשלם עליו</h1>
          <p>העגלה ריקה, אז אין הזמנה להשלים.</p>
          <Link to="/" className="checkout-empty__cta">המשך בקניות</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="checkout-page">
      {/* Two panes: the form leads on the inline-start (right) edge, the
          manifest holds the left. Each scrolls on its own from $bp-lg up, so
          the total and the saving stay on screen while the form is filled. */}
      <div className="checkout-split">

        <div className="checkout-form-pane">
          <header className="checkout-head">
            <h1>פרטי משלוח</h1>
            <Link to="/cart" className="checkout-head__back">חזרה לעגלה</Link>
          </header>

          <form id="checkout-form" className="checkout-form" onSubmit={handleSubmit} noValidate>
            <div className="field-grid">
              {FIELDS.map((field) => {
                const showError = touched[field.name] && liveErrors[field.name]
                const errorId = `${field.name}-error`

                return (
                  <div
                    key={field.name}
                    className={`field field--span-${field.span} ${showError ? 'field--invalid' : ''}`}
                  >
                    <label htmlFor={field.name}>
                      {field.label}
                      {!field.required && <span className="field__optional">רשות</span>}
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      inputMode={field.inputMode}
                      dir={field.dir}
                      autoComplete={field.autoComplete}
                      value={address[field.name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-required={field.required || undefined}
                      aria-invalid={showError ? 'true' : undefined}
                      aria-describedby={showError ? errorId : undefined}
                    />
                    {showError && (
                      <p className="field__error" id={errorId}>
                        {liveErrors[field.name]}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pay-note">
              <h2>תשלום</h2>
              <p>
                זהו אתר הדגמה. לא נגבה תשלום ולא נאספים פרטי אשראי —
                ההזמנה תירשם ותסומן כשולמה.
              </p>
            </div>

            {submitError && (
              <p className="checkout-error" role="alert">{submitError}</p>
            )}

            {/* Desktop action. The mobile one lives in the docked bar. */}
            <button
              type="submit"
              className={`place-order place-order--inline ${isPlacing ? 'place-order--placing' : ''}`}
              disabled={!canPlace}
              aria-busy={isPlacing || undefined}
            >
              {isPlacing ? (
                <><span className="place-order__spinner" aria-hidden="true" />שולח הזמנה…</>
              ) : (
                `אישור הזמנה · ${formatMoney(totals.total)}`
              )}
            </button>
          </form>
        </div>

        <aside className="checkout-manifest" aria-label="סיכום ההזמנה">
          <h2 className="manifest__title">ההזמנה שלך</h2>

          <ul className="manifest__items">
            {items.map((line) => (
              <li key={line.itemId} className="manifest-line">
                <div className="manifest-line__media">
                  <img src={line.product?.images?.[0]} alt="" onError={onProductImageError} />
                  <span className="manifest-line__qty" aria-label={`כמות ${line.quantity}`}>
                    {line.quantity}
                  </span>
                </div>
                <div className="manifest-line__body">
                  <span className="manifest-line__name">{line.product?.displayNameHe}</span>
                  {line.variant && (
                    <span className="manifest-line__variant">
                      {[line.variant.size, line.variant.colorHe || line.variant.color]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                <span className="manifest-line__sum" dir="ltr">
                  {formatMoney(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="manifest__totals">
            <div className="manifest-row">
              <dt>מוצרים ({totals.itemCount})</dt>
              <dd dir="ltr">{formatMoney(totals.subtotal)}</dd>
            </div>

            {totals.savings > 0 && (
              <div className="manifest-row manifest-row--savings">
                <dt>חיסכון</dt>
                <dd dir="ltr">−{formatMoney(totals.savings)}</dd>
              </div>
            )}

            <div className="manifest-row">
              <dt>משלוח</dt>
              <dd dir="ltr">
                {totals.shipping > 0 ? formatMoney(totals.shipping) : 'חינם'}
              </dd>
            </div>
          </dl>

          {totals.amountToFreeShipping > 0 && (
            <p className="manifest__nudge">
              עוד {formatMoney(totals.amountToFreeShipping)} ומשלוח חינם
            </p>
          )}

          {/* The price tag: the one loudest object here, same component
              language as every product surface. */}
          <div className="manifest__grand">
            <span className="manifest__grand-label">לתשלום</span>
            <span
              className="price-tag price-tag--total"
              dir="ltr"
              role="img"
              aria-label={moneyAriaLabel(totals.total)}
            >
              <span className="price-tag__currency">{CURRENCY_SIGN}</span>
              <span className="price-tag__whole">{moneyParts(totals.total).whole}</span>
              {moneyParts(totals.total).agorot && (
                <span className="price-tag__agorot">{moneyParts(totals.total).agorot}</span>
              )}
            </span>
          </div>
        </aside>
      </div>

      {/* Docked action for one-handed phone use; hidden once the panes split. */}
      <div className="checkout-dock">
        <div className="checkout-dock__sum">
          <span className="checkout-dock__label">לתשלום</span>
          <span className="checkout-dock__value" dir="ltr">
            {formatMoney(totals.total)}
          </span>
        </div>
        {/* Lives outside the form in the DOM, so it is associated by id
            rather than by nesting. */}
        <button
          type="submit"
          form="checkout-form"
          className={`place-order ${isPlacing ? 'place-order--placing' : ''}`}
          disabled={!canPlace}
          aria-busy={isPlacing || undefined}
        >
          {isPlacing ? 'שולח הזמנה…' : 'אישור הזמנה'}
        </button>
      </div>
    </section>
  )
}
