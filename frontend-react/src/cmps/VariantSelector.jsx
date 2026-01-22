import { useState, useEffect, useMemo } from 'react'

export function VariantSelector({ variants, onVariantSelect, initialVariant = null }) {
  // Extract unique sizes and colors from variants
  const { sizes, colors, colorMap } = useMemo(() => {
    const sizesSet = new Set()
    const colorsSet = new Set()
    const colorMap = {}

    variants?.forEach((v) => {
      if (v.size) sizesSet.add(v.size)
      if (v.color) {
        colorsSet.add(v.color)
        colorMap[v.color] = v.colorHe || v.color
      }
    })

    return {
      sizes: Array.from(sizesSet),
      colors: Array.from(colorsSet),
      colorMap,
    }
  }, [variants])

  const [selectedSize, setSelectedSize] = useState(initialVariant?.size || sizes[0] || null)
  const [selectedColor, setSelectedColor] = useState(initialVariant?.color || colors[0] || null)

  // Find the matching variant based on selections
  const selectedVariant = useMemo(() => {
    if (!variants?.length) return null
    return variants.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    ) || variants.find(
      (v) => v.size === selectedSize
    ) || variants.find(
      (v) => v.color === selectedColor
    ) || variants[0]
  }, [variants, selectedSize, selectedColor])

  // Notify parent of selection changes
  useEffect(() => {
    if (onVariantSelect && selectedVariant) {
      onVariantSelect(selectedVariant)
    }
  }, [selectedVariant, onVariantSelect])

  // Check if a size/color combo is available
  function isVariantAvailable(size, color) {
    return variants?.some(
      (v) => v.size === size && v.color === color && v.inStock
    )
  }

  function isSizeAvailable(size) {
    return variants?.some((v) => v.size === size && v.inStock)
  }

  function isColorAvailable(color) {
    return variants?.some((v) => v.color === color && v.inStock)
  }

  if (!variants?.length) return null

  return (
    <div className="variant-selector">
      {/* Size selector */}
      {sizes.length > 0 && (
        <div className="variant-group">
          <label className="variant-label">מידה:</label>
          <div className="variant-options sizes">
            {sizes.map((size) => {
              const isAvailable = isSizeAvailable(size)
              const isSelected = selectedSize === size
              return (
                <button
                  key={size}
                  className={`variant-option size ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                  onClick={() => setSelectedSize(size)}
                  disabled={!isAvailable}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Color selector */}
      {colors.length > 0 && (
        <div className="variant-group">
          <label className="variant-label">
            צבע: <span className="selected-color-name">{colorMap[selectedColor]}</span>
          </label>
          <div className="variant-options colors">
            {colors.map((color) => {
              const isAvailable = isColorAvailable(color)
              const isSelected = selectedColor === color
              return (
                <button
                  key={color}
                  className={`variant-option color ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                  onClick={() => setSelectedColor(color)}
                  disabled={!isAvailable}
                  title={colorMap[color]}
                  style={{ '--color-value': getColorValue(color) }}
                >
                  <span className="color-swatch"></span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stock status for selected variant */}
      {selectedVariant && (
        <div className="variant-stock-status">
          {selectedVariant.inStock ? (
            selectedVariant.stockQty <= 3 ? (
              <span className="low-stock">נותרו רק {selectedVariant.stockQty} במלאי!</span>
            ) : (
              <span className="in-stock">במלאי</span>
            )
          ) : (
            <span className="out-of-stock">אזל מהמלאי</span>
          )}
        </div>
      )}
    </div>
  )
}

// Helper to convert color names to CSS colors
function getColorValue(colorName) {
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
