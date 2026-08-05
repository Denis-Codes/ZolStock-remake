import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { SaleBadge } from '../../src/cmps/SaleBadge.jsx'
import { formatMoney, moneyParts } from '../../src/services/money.service.js'
import { testProducts } from './msw/handlers.js'

/**
 * Tests for the frontend harness.
 *
 * Same purpose as the backend's helpers.test.js: everything in stage 5 stands
 * on these pieces, so they are verified rather than assumed. This asserts the
 * plumbing works — real coverage of these modules comes later.
 */

describe('harness: plain module imports', () => {
  it('runs a pure function with no DOM involved', () => {
    // The cheapest kind of test there is: no render, no network, no database.
    // Most of the suite should look like this.
    expect(formatMoney(24.9)).toBe('₪24.90')
    expect(formatMoney(60)).toBe('₪60')
  })

  it('handles the agorot boundary the module exists for', () => {
    // Per the module's own comment, whole-shekel display is only correct when
    // the agorot really are zero — that is the boundary worth pinning.
    expect(moneyParts(118.8).agorot).toBe('80')
    expect(moneyParts(119).agorot).toBeNull()
  })
})

describe('harness: React rendering', () => {
  it('renders a component into jsdom', () => {
    render(<SaleBadge discountPercent={25} />)
    expect(screen.getByText('-25%')).toBeInTheDocument()
  })

  it('supports jest-dom matchers', () => {
    const { container } = render(<SaleBadge discountPercent={25} size="small" />)
    expect(container.firstChild).toHaveClass('sale-badge', 'small')
  })

  it('renders nothing when the component decides not to', () => {
    // SaleBadge returns null for a zero discount. queryBy* returns null for a
    // missing element; getBy* throws. Use queryBy when absence is the assertion.
    const { container } = render(<SaleBadge discountPercent={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('cleans up between tests', () => {
    // If afterEach(cleanup) were missing, the badges rendered above would still
    // be in document.body and this would find several.
    expect(screen.queryAllByText(/%$/)).toHaveLength(0)
  })
})

describe('harness: network mocking', () => {
  it('intercepts a request and returns the mocked catalogue', async () => {
    // Goes through the app's real HTTP path — MSW answers at the network
    // layer, so nothing about axios is mocked or asserted on.
    const res = await fetch('http://localhost:3030/api/product')
    const products = await res.json()

    expect(res.status).toBe(200)
    expect(products).toHaveLength(2)
    expect(products[0].sku).toBe('p1001')
  })

  it('serves 404 for an unknown product, as the real API does', async () => {
    const res = await fetch('http://localhost:3030/api/product/does-not-exist')

    expect(res.status).toBe(404)
    expect((await res.json()).err).toBeTruthy()
  })

  it('exposes fixtures matching the real API response shape', () => {
    // Guards the handler file against drifting into a convenient-but-fake
    // shape. Every field here is one the Express API actually returns.
    for (const product of testProducts) {
      expect(product).toHaveProperty('_id')
      expect(product).toHaveProperty('sku')
      expect(product).toHaveProperty('displayNameHe')
      expect(product).toHaveProperty('stockQty')
      expect(product).toHaveProperty('currency', 'ILS')
    }
  })
})

describe('harness: jsdom gaps are stubbed', () => {
  it('provides the browser APIs jsdom lacks', () => {
    // Without these the carousel and scroll components throw on mount, and the
    // failure names the missing global rather than the actual bug.
    expect(typeof global.ResizeObserver).toBe('function')
    expect(typeof global.IntersectionObserver).toBe('function')
    expect(typeof window.matchMedia).toBe('function')
    expect(window.matchMedia('(min-width: 768px)').matches).toBe(false)
  })
})
