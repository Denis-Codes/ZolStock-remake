export function StarRating({ rating, reviewCount, showCount = true, size = 'medium' }) {
  if (!rating && rating !== 0) return null

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.3 && rating % 1 <= 0.7
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className={`star-rating ${size}`}>
      <div className="stars">
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <svg key={`full-${i}`} className="star full" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <svg className="star half" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="halfGradient">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#ddd" />
              </linearGradient>
            </defs>
            <path
              fill="url(#halfGradient)"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        )}

        {/* Empty stars */}
        {[...Array(Math.max(0, emptyStars))].map((_, i) => (
          <svg key={`empty-${i}`} className="star empty" viewBox="0 0 24 24" fill="#ddd">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {showCount && reviewCount !== undefined && (
        <span className="review-count">({reviewCount})</span>
      )}

      <span className="rating-number">{rating.toFixed(1)}</span>
    </div>
  )
}
