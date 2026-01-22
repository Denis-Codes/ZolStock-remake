import { useState } from 'react'

export function ImageGallery({ images, productName }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  // Ensure we have at least one image
  const imageList = images?.length > 0 ? images : ['assets/img/placeholder.png']

  function handleThumbnailClick(index) {
    setActiveIndex(index)
  }

  function handleMainImageClick() {
    setIsZoomed(!isZoomed)
  }

  function handlePrevious() {
    setActiveIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1))
  }

  function handleNext() {
    setActiveIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="image-gallery">
      <div className={`main-image-container ${isZoomed ? 'zoomed' : ''}`}>
        <img
          src={imageList[activeIndex]}
          alt={`${productName} - ${activeIndex + 1}`}
          className="main-image"
          onClick={handleMainImageClick}
        />

        {imageList.length > 1 && (
          <>
            <button className="gallery-nav prev" onClick={handlePrevious} aria-label="Previous image">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="gallery-nav next" onClick={handleNext} aria-label="Next image">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        <div className="image-counter">
          {activeIndex + 1} / {imageList.length}
        </div>
      </div>

      {imageList.length > 1 && (
        <div className="thumbnails">
          {imageList.map((img, index) => (
            <button
              key={index}
              className={`thumbnail ${index === activeIndex ? 'active' : ''}`}
              onClick={() => handleThumbnailClick(index)}
            >
              <img src={img} alt={`${productName} thumbnail ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
