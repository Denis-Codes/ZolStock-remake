export function makeId(length = 6) {
    var txt = ''
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (var i = 0; i < length; i++) {
        txt += possible.charAt(Math.floor(Math.random() * possible.length))
    }

    return txt
}

export function makeLorem(size = 100) {
    var words = ['The sky', 'above', 'the port', 'was', 'the color of television', 'tuned', 'to', 'a dead channel', '.', 'All', 'this happened', 'more or less', '.', 'I', 'had', 'the story', 'bit by bit', 'from various people', 'and', 'as generally', 'happens', 'in such cases', 'each time', 'it', 'was', 'a different story', '.', 'It', 'was', 'a pleasure', 'to', 'burn']
    var txt = ''
    while (size > 0) {
        size--
        txt += words[Math.floor(Math.random() * words.length)] + ' '
    }
    return txt
}

export function getRandomIntInclusive(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min //The maximum is inclusive and the minimum is inclusive 
}


export function randomPastTime() {
    const HOUR = 1000 * 60 * 60
    const DAY = 1000 * 60 * 60 * 24
    const WEEK = 1000 * 60 * 60 * 24 * 7

    const pastTime = getRandomIntInclusive(HOUR, WEEK)
    return Date.now() - pastTime
}

export function debounce(func, timeout = 300) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => { func.apply(this, args) }, timeout)
    }
}

export function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

export function loadFromStorage(key) {
    const data = localStorage.getItem(key)
    return (data) ? JSON.parse(data) : undefined
}

// Shared color-name -> CSS value map, used anywhere a product variant's
// color needs to render as a swatch (VariantSelector, ProductPreview cards).
export function getVariantColorValue(colorName) {
  const colorMap = {
    white: '#ffffff',
    black: '#222222',
    gray: '#888888',
    'dark-blue': '#1a365d',
    'light-blue': '#63b3ed',
    navy: '#1a365d',
    olive: '#556b2f',
    'black-white': 'linear-gradient(135deg, #222 50%, #fff 50%)',
  }
  return colorMap[colorName] || '#cccccc'
}

/*
 * Stand-in for a product photo that fails to load.
 *
 * The catalogue was rebuilt against the chain's eight real departments before
 * the photography for it existed, so every row currently points at a file that
 * is not on disk yet. Without this, each of those renders as the browser's
 * broken-image glyph — which reads as a bug rather than as pending content.
 *
 * Drawn rather than borrowed: a flat parcel outline on the sunken-surface
 * tone, one stroke weight, no shadow, sized to sit inside the same 1:1
 * contain box a real photo gets. It disappears on its own as soon as the real
 * files land — nothing needs unwiring.
 */
const PRODUCT_IMAGE_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="#F1F3F5"/>
  <g fill="none" stroke="#dddddd" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M30 47l30-15 30 15v26L60 88 30 73z"/>
    <path d="M30 47l30 15 30-15"/>
    <path d="M60 62v26"/>
  </g>
</svg>`

export const PRODUCT_IMAGE_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PRODUCT_IMAGE_FALLBACK_SVG)

/**
 * onError handler for any <img> showing a product photo. The dataset flag
 * matters: assigning src from inside onError fires onError again if the
 * fallback itself ever fails, and an unguarded handler would spin.
 */
export function onProductImageError(ev) {
  const img = ev.currentTarget
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = 'true'
  img.src = PRODUCT_IMAGE_FALLBACK
}

const RECENTLY_VIEWED_KEY = 'zolstock_recently_viewed'
const RECENTLY_VIEWED_LIMIT = 10

// Most-recent-first list of product ids the user has viewed, deduped,
// capped at RECENTLY_VIEWED_LIMIT. Plain localStorage (like the wishlist
// storage helpers above) rather than Redux — nothing outside the product
// details page needs to react to this list changing.
export function getRecentlyViewed() {
  return loadFromStorage(RECENTLY_VIEWED_KEY) || []
}

export function addRecentlyViewed(productId) {
  if (!productId) return
  const current = getRecentlyViewed().filter((id) => id !== productId)
  const next = [productId, ...current].slice(0, RECENTLY_VIEWED_LIMIT)
  saveToStorage(RECENTLY_VIEWED_KEY, next)
}

export function buildCategorySubcats(products) {
  const map = new Map()

  for (const p of products) {
    const category = p.category
    const subCategory = p.subCategory
    if (!category || !subCategory) continue

    if (!map.has(category)) map.set(category, new Map())
    const subMap = map.get(category)

    const labelHe = p.displaySubCategoryHe || subCategory

    if (!subMap.has(subCategory)) {
      subMap.set(subCategory, { subCategory, labelHe })
    }
  }

  const res = {}
  for (const [cat, subMap] of map.entries()) {
    res[cat] = Array.from(subMap.values()).sort((a, b) =>
      a.labelHe.localeCompare(b.labelHe, "he")
    )
  }

  return res
}
