import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

export function EmblaCarousel() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, direction: 'rtl' },  // or 'ltr' if you prefer
    [Autoplay({ delay: 5000 })]
  )

  const images = [
    "https://zolstock.co.il/wp-content/uploads/2025/10/45-1.jpg",
    "https://zolstock.co.il/wp-content/uploads/2025/10/45.jpg",
    "https://zolstock.co.il/wp-content/uploads/2025/10/21344534534.jpg",
    "https://zolstock.co.il/wp-content/uploads/2025/10/5656.jpg",
  ]

  return (
    <div className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {images.map((src, i) => (
            <div className="embla__slide" key={src}>
              <img className="embla__slide__img" src={src} alt={`slide-${i}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
