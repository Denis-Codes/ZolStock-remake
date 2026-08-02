import { useEffect, useRef } from 'react'
import { SearchBar } from './SearchBar.jsx'

/**
 * The search field is no longer a permanent fixture of the header — it drops
 * down from the search toggle and closes again. Rendering nothing while shut
 * is what lets the header stay symmetric at every width.
 *
 * Closing is owned by the parent so the toggle can restore focus.
 */
export function SearchOverlay({ isOpen, onClose, value, onChange, onSubmit }) {
  const panelRef = useRef(null)

  // Escape closes from anywhere, including from inside the input.
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(ev) {
      if (ev.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // A click anywhere outside the whole header closes it. Bound on the header
  // rather than the panel so hitting the toggle again doesn't close-then-open.
  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(ev) {
      const header = panelRef.current?.closest('.app-header')
      if (header && !header.contains(ev.target)) onClose?.()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSubmit(txt) {
    onSubmit?.(txt)
    onClose?.()
  }

  return (
    <div
      className="search-overlay"
      ref={panelRef}
      role="dialog"
      aria-label="חיפוש מוצרים"
    >
      <div className="search-overlay-inner">
        <SearchBar
          value={value}
          onChange={onChange}
          onSubmit={handleSubmit}
          placeholder="מה תרצו לחפש?"
          autoFocus
        />
      </div>
    </div>
  )
}
