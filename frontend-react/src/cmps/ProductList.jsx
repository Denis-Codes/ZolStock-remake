import ProductPreview from './ProductPreview.jsx'
import { ProductSkeleton } from './ProductSkeleton.jsx'
import { EmptyState } from './EmptyState.jsx'

const SKELETON_COUNT = 8

/**
 * `isLoading` and `empty` are both optional, so the five callers that pass
 * neither behave exactly as before.
 *
 * `empty` takes a node rather than a message string: only the caller knows why
 * its list came back empty — a filter that matched nothing, a search with no
 * hits and an empty wishlist are three different situations with three
 * different exits, and the list cannot tell them apart from the outside.
 */
export function ProductList({ products = [], isLoading = false, empty = null }) {
  /* Skeletons inside the real grid, not a spinner replacing it: the shelf keeps
     its shape while it fills, so nothing below jumps when results arrive. Same
     pattern as the homepage deals band. */
  if (isLoading) {
    return (
      <section className="product-list" aria-busy="true" aria-label="טוען מוצרים">
        <ProductSkeleton count={SKELETON_COUNT} />
      </section>
    )
  }

  if (!products.length) {
    return empty || <EmptyState title="אין מוצרים להצגה" />
  }

  return (
    <section className="product-list">
      {products.map(product => (
        <ProductPreview key={product._id} product={product} />
      ))}
    </section>
  )
}
