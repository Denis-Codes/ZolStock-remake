const EDGE = 1     // pages always shown at each end
const AROUND = 1   // pages shown either side of the current one

/**
 * Which page numbers to render, with gaps collapsed to an ellipsis.
 *
 * At the catalogue's present size this returns [1, 2] and the windowing never
 * engages — but a paginator that only works below eight pages is a paginator
 * that breaks silently the week the catalogue grows, and the alternative is
 * a row of forty numbers.
 */
function buildPages(current, total) {
  const wanted = new Set([1, total])
  for (let i = 1; i <= EDGE; i++) {
    wanted.add(i)
    wanted.add(total - i + 1)
  }
  for (let i = current - AROUND; i <= current + AROUND; i++) wanted.add(i)

  const pages = [...wanted].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)

  const out = []
  let prev = 0
  for (const n of pages) {
    if (prev && n - prev > 1) out.push({ gap: true, key: `gap-${n}` })
    out.push({ page: n, key: n })
    prev = n
  }
  return out
}

/* In RTL the first child sits rightmost, so "previous" leads and its chevron
   points right — toward the start of the sequence, which is where page one is.
   Hard-coding a left-pointing "back" arrow is the reflex that gets this wrong. */
function Chevron({ dir }) {
  return (
    <svg
      className="pagination__chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'start' ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
    </svg>
  )
}

export function Pagination({ page, totalPages, onChange }) {
  // One page is not a choice, so it gets no control.
  if (totalPages <= 1) return null

  const items = buildPages(page, totalPages)

  return (
    <nav className="pagination" aria-label="ניווט בין עמודי תוצאות">
      <button
        className="pagination__step"
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <Chevron dir="start" />
        <span>הקודם</span>
      </button>

      <ul className="pagination__pages">
        {items.map(item =>
          item.gap ? (
            <li key={item.key} className="pagination__gap" aria-hidden="true">…</li>
          ) : (
            <li key={item.key}>
              <button
                className={`pagination__page ${item.page === page ? 'is-current' : ''}`}
                type="button"
                onClick={() => onChange(item.page)}
                aria-label={`עמוד ${item.page}`}
                aria-current={item.page === page ? 'page' : undefined}
              >
                {item.page}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        className="pagination__step"
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        <span>הבא</span>
        <Chevron dir="end" />
      </button>
    </nav>
  )
}
