import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'

import { server } from './msw/server.js'

/**
 * Frontend test setup — runs before every unit/component test file.
 */

/**
 * Unmounts anything rendered during a test.
 *
 * React Testing Library renders into a container attached to document.body.
 * Without cleanup those containers accumulate, so a query like
 * getByRole('button') starts matching elements left over from earlier tests
 * and fails with "found multiple elements" — a confusing failure that has
 * nothing to do with the test that reports it.
 */
afterEach(() => {
  cleanup()
})

/**
 * Mock Service Worker.
 *
 * ── Why MSW rather than mocking axios/fetch ──────────────────────────────
 * Mocking the HTTP client coats the code under test in assumptions: you assert
 * that `axios.get` was called with certain arguments, which is testing the
 * implementation, not the behaviour. Swap axios for fetch and every test
 * breaks though nothing about the app changed.
 *
 * MSW intercepts at the network layer instead. The app makes a real request
 * through its real client; MSW answers it. So the test says "when the server
 * returns this, the UI shows that" — which is the actual contract, and it
 * survives changing HTTP libraries.
 *
 * It also makes failure modes easy to author. Returning a 500, or a timeout,
 * or an empty list, is one line — and those paths are usually where the bugs
 * are and where coverage is thinnest.
 */
beforeAll(() => {
  // Any request without a handler is an error rather than a silent pass. A
  // test that unexpectedly hits the network is not testing what it claims,
  // and in CI it would be slow and flaky instead of failing honestly.
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  // Per-test handler overrides must not leak into the next test.
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

/**
 * jsdom implements no layout engine, so these exist as names only — anything
 * that calls them throws "not a function" instead of failing on its own merits.
 * Stubbed here because they are infrastructure gaps, not app behaviour.
 */
beforeAll(() => {
  // Used by Embla and the carousels.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // Used by scroll-triggered UI such as ScrollToTopBtn.
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }

  // matchMedia backs responsive hooks and prefers-reduced-motion checks.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  window.scrollTo = vi.fn()
})
