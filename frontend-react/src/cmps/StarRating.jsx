const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

/**
 * `compact` renders one star plus the number instead of five glyphs. Five 12px
 * stars cost 87px of a 147px meta line on a phone-width card, which left the
 * subcategory 53px of the 67px it needed and truncated four cards in five to
 * "סירים ומ…". Nothing is lost: at 12px the glyph row cannot express 4.5 vs 4.2
 * anyway — the number always did that work — so the compact form carries the
 * same information in 61px. The five-star display stays for the product page,
 * where it has the room and the size to actually read as a scale.
 */
export function StarRating({ rating, reviewCount, showCount = true, size = 'medium', compact = false }) {
  if (!rating && rating !== 0) return null

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.3 && rating % 1 <= 0.7
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  /* The glyphs are decoration once the number is present, so the whole control
     announces itself once and hides its parts. Without this a screen reader
     read the bare fragments "(24)" and "4.5" with nothing to attach them to. */
  const label = showCount && reviewCount !== undefined
    ? `דירוג ${rating.toFixed(1)} מתוך 5, ${reviewCount} ביקורות`
    : `דירוג ${rating.toFixed(1)} מתוך 5`

  /* Value before count. In RTL the first child sits rightmost and is therefore
     read first, so the old order announced how many people rated the product
     before saying what they rated it. */
  const readout = (
    <>
      <span className="rating-number">{rating.toFixed(1)}</span>
      {showCount && reviewCount !== undefined && (
        <span className="review-count">({reviewCount})</span>
      )}
    </>
  )

  if (compact) {
    return (
      <div className={`star-rating ${size} compact`} role="img" aria-label={label}>
        <svg className="star full" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={STAR_PATH} />
        </svg>
        {readout}
      </div>
    )
  }

  return (
    <div className={`star-rating ${size}`} role="img" aria-label={label}>
      <div className="stars" aria-hidden="true">
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <svg key={`full-${i}`} className="star full" viewBox="0 0 24 24" fill="currentColor">
            <path d={STAR_PATH} />
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
            <path fill="url(#halfGradient)" d={STAR_PATH} />
          </svg>
        )}

        {/* Empty stars */}
        {[...Array(Math.max(0, emptyStars))].map((_, i) => (
          <svg key={`empty-${i}`} className="star empty" viewBox="0 0 24 24" fill="#ddd">
            <path d={STAR_PATH} />
          </svg>
        ))}
      </div>

      {readout}
    </div>
  )
}
