import { useCallback, useEffect, useState } from 'react'

import { productService } from '../services/product'
import { ProductList } from './ProductList.jsx'
import { ProductSkeleton } from './ProductSkeleton.jsx'

/**
 * The homepage's merchandise band.
 *
 * The page had none. Four blocks — carousel, category tiles, welcome copy and
 * a store locator — and not one product, price, struck-through original or
 * discount badge anywhere on it, on a storefront whose whole proposition is
 * the markdown. DESIGN.md calls the price tag "the defining object of the
 * storefront" and it did not appear on the surface every shopper lands on.
 *
 * The deepest markdowns in the catalogue, sorted by percent off, in the same
 * card and the same grid the listing pages use. Nothing here is bespoke: it is
 * the shop's own component, put where the shop's own front door is.
 */

const DEAL_COUNT = 8

export function HomeDeals() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  const loadDeals = useCallback(async ({ signal } = {}) => {
    setStatus('loading')

    try {
      const all = await productService.query({})
      if (signal?.aborted) return

      const deals = all
        .filter((product) => product.discountPercent > 0 && product.inStock !== false)
        .sort((a, b) => b.discountPercent - a.discountPercent)
        .slice(0, DEAL_COUNT)

      setProducts(deals)
      setStatus('ready')
    } catch (err) {
      if (signal?.aborted) return
      console.error('Failed to load homepage deals', err)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadDeals({ signal: controller.signal })
    return () => controller.abort()
  }, [loadDeals])

  if (status === 'loading') {
    return (
      <section className="product-list" aria-busy="true" aria-label="טוען מבצעים">
        <ProductSkeleton count={DEAL_COUNT} />
      </section>
    )
  }

  /* A failed request used to leave a labelled band above an empty hole, with
     no message and no way to try again. It says what happened and offers the
     one action that can fix it. */
  if (status === 'error') {
    return (
      <div className="home-block-error" role="alert">
        <p>לא הצלחנו לטעון את המבצעים כרגע.</p>
        <button type="button" className="home-retry-btn" onClick={() => loadDeals()}>
          נסו שוב
        </button>
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="home-block-error">
        <p>אין כרגע מוצרים במבצע להצגה.</p>
      </div>
    )
  }

  return <ProductList products={products} />
}
