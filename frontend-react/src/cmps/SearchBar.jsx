import { useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

export function SearchBar({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'חיפוש מוצרים…',
  autoFocus = false,
}) {
  const inputRef = useRef(null)

  // The overlay mounts on demand, so the caret has to be placed for the user.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function handleSubmit(ev) {
    ev.preventDefault()
    onSubmit?.(value)
    inputRef.current?.blur() // ✅ יוצא מהאינפוט בלי לשנות עיצוב
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(ev) => onChange?.(ev.target.value)}
        placeholder={placeholder}
        aria-label="חיפוש מוצרים"
      />

      <button type="submit" className="search-btn" aria-label="חפש">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </button>
    </form>
  )
}
