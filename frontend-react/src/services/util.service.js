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
