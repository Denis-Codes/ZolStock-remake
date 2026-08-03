import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { orderService } from '../services/order/order.service.remote'
import { formatMoney } from '../services/money.service'

const STATUS_HE = {
  pending: 'ממתינה',
  paid: 'שולמה',
  shipped: 'נשלחה',
  delivered: 'נמסרה',
  cancelled: 'בוטלה',
}

/** Green must not stand in for every status — a cancelled order is not a success. */
const STATUS_TONE = {
  pending: 'is-pending',
  paid: 'is-good',
  shipped: 'is-good',
  delivered: 'is-good',
  cancelled: 'is-bad',
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function OrdersPage() {
  const navigate = useNavigate()
  const user = useSelector((storeState) => storeState.userModule.user)

  const [orders, setOrders] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!user) navigate('/login', { replace: true, state: { from: '/orders' } })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    setLoadFailed(false)
    orderService
      .getMyOrders()
      .then((res) => { if (!cancelled) setOrders(res) })
      .catch(() => {
        // Not the same as having no orders — see the error branch below.
        if (!cancelled) { setOrders(null); setLoadFailed(true) }
      })

    return () => { cancelled = true }
  }, [user, reloadToken])

  if (!user) return null

  if (loadFailed) {
    return (
      <section className="orders-page">
        <h1>ההזמנות שלי</h1>
        <div className="checkout-empty">
          <h2>לא הצלחנו לטעון את ההזמנות</h2>
          <p>ייתכן שהחיבור נפל. ההזמנות שלכם שמורות.</p>
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

  if (orders === null) {
    return (
      <section className="orders-page">
        <h1>ההזמנות שלי</h1>
        <div className="checkout-empty" role="status" aria-live="polite">
          <p>טוען הזמנות…</p>
        </div>
      </section>
    )
  }

  if (!orders.length) {
    return (
      <section className="orders-page">
        <h1>ההזמנות שלי</h1>
        <div className="checkout-empty">
          <h2>עוד לא הזמנת כלום</h2>
          <p>הזמנות שתשלימו יופיעו כאן.</p>
          <Link to="/" className="checkout-empty__cta">המשך בקניות</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="orders-page">
      <h1>ההזמנות שלי</h1>

      <ul className="order-list">
        {orders.map((order) => (
          <li key={order._id}>
            <Link to={`/order/${order._id}`} className="order-card">
              <div className="order-card__top">
                <span className={`order-status ${STATUS_TONE[order.status] || 'is-pending'}`}>
                  {STATUS_HE[order.status] || order.status}
                </span>
                <span className="order-card__total" dir="ltr">
                  {formatMoney(order.totals?.total)}
                </span>
              </div>
              <p className="order-card__meta">
                {formatDate(order.createdAt)} · {order.totals?.itemCount} פריטים
              </p>
              {/* bdi, not dir="ltr" on the block — a block-level LTR element
                  left-aligns and breaks the card's right edge in RTL. */}
              {order.payment?.reference && (
                <p className="order-card__ref"><bdi>{order.payment.reference}</bdi></p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
