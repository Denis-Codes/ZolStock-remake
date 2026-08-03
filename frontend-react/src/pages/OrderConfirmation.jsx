import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { orderService } from '../services/order/order.service.remote'
import { onProductImageError } from '../services/util.service'
import { formatMoney, moneyParts, moneyAriaLabel, CURRENCY_SIGN } from '../services/money.service'

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function addressLines(addr) {
  if (!addr) return []

  const street = [addr.street, addr.houseNumber].filter(Boolean).join(' ')
  const inner = [
    addr.floor && `קומה ${addr.floor}`,
    addr.apartment && `דירה ${addr.apartment}`,
  ].filter(Boolean).join(', ')

  return [addr.fullname, street, inner, [addr.city, addr.zip].filter(Boolean).join(' '), addr.phone]
    .filter(Boolean)
}

export function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const user = useSelector((storeState) => storeState.userModule.user)

  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/order/${orderId}` } })
    }
  }, [user, navigate, orderId])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    orderService
      .getById(orderId)
      .then((res) => { if (!cancelled) setOrder(res) })
      .catch(() => { if (!cancelled) setError('לא מצאנו את ההזמנה הזאת') })

    return () => { cancelled = true }
  }, [orderId, user])

  if (!user) return null

  if (error) {
    return (
      <section className="order-confirmation">
        <div className="order-panel">
          {/* h1: this is the page's only heading when the order is missing. */}
          <h1>{error}</h1>
          <div className="order-actions">
            <Link to="/orders" className="order-btn order-btn--primary">ההזמנות שלי</Link>
            <Link to="/" className="order-btn order-btn--ghost">המשך בקניות</Link>
          </div>
        </div>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="order-confirmation">
        <div className="order-panel" role="status" aria-live="polite">
          <p>טוען את ההזמנה…</p>
        </div>
      </section>
    )
  }

  const totals = order.totals || {}

  return (
    <section className="order-confirmation">
      <header className="order-hero">
        <div className="order-hero__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
               strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1>ההזמנה התקבלה</h1>
        <p className="order-hero__sub">
          נשלח אליך עדכון כשההזמנה תצא למשלוח.
        </p>
        <p className="order-hero__ref">
          מספר הזמנה <span dir="ltr">{order.payment?.reference || order._id}</span>
          {order.createdAt && <> · {formatDate(order.createdAt)}</>}
        </p>
      </header>

      <div className="order-panels">
        <div className="order-panel">
          <h2>מה הזמנת</h2>
          <ul className="manifest__items">
            {order.items?.map((item, idx) => (
              <li key={`${item.productId}-${idx}`} className="manifest-line">
                <div className="manifest-line__media">
                  <img src={item.image} alt="" onError={onProductImageError} />
                  <span className="manifest-line__qty" aria-label={`כמות ${item.quantity}`}>{item.quantity}</span>
                </div>
                <div className="manifest-line__body">
                  <span className="manifest-line__name">{item.displayNameHe || item.name}</span>
                  {item.variant && (
                    <span className="manifest-line__variant">
                      {[item.variant.size, item.variant.colorHe || item.variant.color]
                        .filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                <span className="manifest-line__sum" dir="ltr">
                  {formatMoney(item.lineTotal)}
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

          <div className="manifest__grand">
            <span className="manifest__grand-label">שולם</span>
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
        </div>

        <div className="order-panel">
          <h2>כתובת למשלוח</h2>
          {/* dir="auto" would derive direction per line, which left-aligned
              the phone number and broke the block's right edge. The block
              stays RTL; only the numeral run inside is isolated. */}
          <address>
            {addressLines(order.shippingAddress).map((line, idx) => (
              <div key={idx}>
                <bdi>{line}</bdi>
              </div>
            ))}
          </address>

          <div className="order-actions">
            <Link to="/orders" className="order-btn order-btn--primary">ההזמנות שלי</Link>
            <Link to="/" className="order-btn order-btn--ghost">המשך בקניות</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
