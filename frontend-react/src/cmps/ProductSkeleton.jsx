/**
 * A placeholder is only worth showing if it is the same height as the thing it
 * stands in for — otherwise the shelf resizes the moment results land, which is
 * the jump skeletons exist to prevent. So this mirrors the real card's five-row
 * body: title, meta, slack, price, action. The action row in particular was
 * missing, and it is the tallest single element on a card at 44px.
 */
export function ProductSkeleton({ count = 8 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <article key={i} className="product-card skeleton" aria-hidden="true">
          <div className="card-media skeleton-shimmer"></div>
          <div className="card-body">
            <div className="skeleton-line title skeleton-shimmer"></div>
            <div className="skeleton-line subtitle skeleton-shimmer"></div>
            <div className="skeleton-line price skeleton-shimmer"></div>
            <div className="skeleton-line action skeleton-shimmer"></div>
          </div>
        </article>
      ))}
    </>
  )
}
