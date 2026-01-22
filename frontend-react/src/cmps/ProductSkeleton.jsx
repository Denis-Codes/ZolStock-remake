export function ProductSkeleton({ count = 8 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <article key={i} className="product-card skeleton">
          <div className="card-media skeleton-shimmer"></div>
          <div className="card-body">
            <div className="skeleton-line title skeleton-shimmer"></div>
            <div className="skeleton-line subtitle skeleton-shimmer"></div>
            <div className="skeleton-line price skeleton-shimmer"></div>
          </div>
        </article>
      ))}
    </>
  )
}
