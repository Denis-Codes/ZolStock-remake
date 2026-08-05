import { useState, useEffect, useMemo } from 'react'
import { getVariantColorValue } from '../services/util.service'

/* Module scope so the memo below can depend on `variants` alone rather than on
   a function identity that changes every render. */
function isVariantAvailable(variants, size, color) {
  return variants?.some(
    (v) => v.size === size && v.color === color && v.inStock
  )
}

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

  function isSizeAvailable(size) {
    return variants?.some((v) => v.size === size && v.inStock)
  }

  /**
   * Colour is constrained by the chosen size, not by the catalogue as a whole.
   *
   * A real catalogue is sparse — M in red, L in blue — so asking "does red
   * exist anywhere?" enabled a colour that did not exist in the selected size,
   * and the shopper could build a pair that was not a thing. See BUG-006.
   *
   * With no sizes at all (a product sold in colours only) there is nothing to
   * constrain against, so the question falls back to the whole catalogue.
   */
  function isColorAvailable(color) {
    if (!selectedSize) return variants?.some((v) => v.color === color && v.inStock)
    return isVariantAvailable(variants, selectedSize, color)
  }

  /**
   * The colour actually in force, which is not always the one last clicked.
   *
   * When a size change makes the chosen colour impossible, the display moves
   * to a colour that does exist in that size. The chosen colour is deliberately
   * kept in state rather than overwritten: it is what the shopper asked for, so
   * going back to a size where it exists restores it instead of silently
   * losing it.
   *
   * Derived rather than reconciled in an effect, so there is never a render
   * where the swatch and the resolved variant disagree — which was the whole
   * damage in BUG-006. If nothing is available (every variant out of stock)
   * the chosen colour stands, and the stock line below says why.
   */
  const effectiveColor = useMemo(() => {
    if (isVariantAvailable(variants, selectedSize, selectedColor)) return selectedColor
    return colors.find((c) => isVariantAvailable(variants, selectedSize, c)) ?? selectedColor
  }, [variants, colors, selectedSize, selectedColor])

  // Find the matching variant based on selections
  const selectedVariant = useMemo(() => {
    if (!variants?.length) return null
    return variants.find(
      (v) => v.size === selectedSize && v.color === effectiveColor
    ) || variants.find(
      (v) => v.size === selectedSize
    ) || variants.find(
      (v) => v.color === effectiveColor
    ) || variants[0]
  }, [variants, selectedSize, effectiveColor])

  // Notify parent of selection changes
  useEffect(() => {
    if (onVariantSelect && selectedVariant) {
      onVariantSelect(selectedVariant)
    }
  }, [selectedVariant, onVariantSelect])

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
            צבע: <span className="selected-color-name">{colorMap[effectiveColor]}</span>
          </label>
          <div className="variant-options colors">
            {colors.map((color) => {
              const isAvailable = isColorAvailable(color)
              // effectiveColor, not selectedColor: the name, the swatch and the
              // variant handed to the cart all have to be the same colour.
              const isSelected = effectiveColor === color
              return (
                <button
                  key={color}
                  className={`variant-option color ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                  onClick={() => setSelectedColor(color)}
                  disabled={!isAvailable}
                  title={colorMap[color]}
                  style={{ '--color-value': getVariantColorValue(color) }}
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
