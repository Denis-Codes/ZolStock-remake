export function SaleBadge({ discountPercent, size = 'medium' }) {
  if (!discountPercent || discountPercent <= 0) return null

  return (
    <span className={`sale-badge ${size}`}>
      -{discountPercent}%
    </span>
  )
}
