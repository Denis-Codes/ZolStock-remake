import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function getScrollTop() {
  const se = document.scrollingElement
  return se?.scrollTop || window.scrollY || 0
}

export function ScrollToTopBtn() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(getScrollTop() > 300)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.scrollingElement?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return createPortal(
    <button
      className={`scroll-to-top-btn ${isVisible ? 'is-visible' : ''}`}
      onClick={handleClick}
      type="button"
      aria-label="חזרה לראש הדף"
    >
      ↑
    </button>,
    document.body
  )
}
