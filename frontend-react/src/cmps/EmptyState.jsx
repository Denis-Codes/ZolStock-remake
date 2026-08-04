import { Link } from 'react-router-dom'

/**
 * An empty result is a state the shopper landed in, not a fact to be reported.
 * The listing used to answer with one unstyled sentence — "אין מוצרים להצגה" —
 * sitting flush against the page edge, which told them nothing about why the
 * grid was empty and left no way out of it. Every use of this block names the
 * cause and offers the one action that resolves it.
 *
 * `.empty-state` keeps its original class name: it had no rule anywhere in the
 * stylesheets, so this is the first time it has been styled at all.
 */

const ICONS = {
  /* Feather's package and search glyphs, at the same 24-box, 2px, round-capped
     stroke system as the cart and check icons in AddToCartBtn. */
  box: (
    <>
      <path d="M16.5 9.4 7.5 4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.27 6.96 8.73 5.05 8.73-5.05" />
      <path d="M12 22.08V12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </>
  ),
}

export function EmptyState({
  title,
  hint,
  icon = 'box',
  actionLabel,
  onAction,
  actionTo,
}) {
  return (
    <div className="empty-state" role="status">
      <svg
        className="empty-state__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[icon] || ICONS.box}
      </svg>

      <p className="empty-state__title">{title}</p>
      {!!hint && <p className="empty-state__hint">{hint}</p>}

      {!!actionLabel && actionTo && (
        <Link className="empty-state__action" to={actionTo}>{actionLabel}</Link>
      )}
      {!!actionLabel && !actionTo && onAction && (
        <button className="empty-state__action" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
