import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

// Two sets of real artwork, each shown where it actually fits. The wide
// banners are 1920×700 and only work on a desktop-width hero; the campaign
// tiles are 1080×1080 and fill a phone with no cropping at all. Swapping the
// source beats cropping one asset to serve both.
//
// This must be a JS breakpoint rather than CSS because the two sets differ in
// slide COUNT, and Embla measures real slide widths — hidden slides would
// break its snapping. Keep 75rem in step with `$bp-lg` in _breakpoints.scss.
const DESKTOP_MQ = '(min-width: 75rem)'

// 1920×700 — desktop only.
const WIDE_SLIDES = [
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/45-1.jpg', alt: 'מבצעי זול סטוק' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/45.jpg', alt: 'מבצעי זול סטוק' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/21344534534.jpg', alt: 'מבצעי זול סטוק' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/5656.jpg', alt: 'מבצעי זול סטוק' },
]

// חורף 2025 campaign set — 1080×1080, mobile and tablet.
const SQUARE_SLIDES = [
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/456456454565.jpg', alt: 'חורף 2025 — כובעי בוגרים' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/575676567.jpg', alt: 'חורף 2025 — כריכיות ילדים' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/9909090.jpg', alt: 'חורף 2025 — כריכית יחיד פרווה' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/23423424.jpg', alt: 'חורף 2025 — מגפי גומי לבנים' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/23321323123.jpg', alt: 'חורף 2025 — כפכפי פרווה לנשים ולנערות' },
  { src: 'https://zolstock.co.il/wp-content/uploads/2025/10/788989.jpg', alt: 'חורף 2025 — כפפות פרווה לנשים ולנערות' },
]

// Anyone who asks for reduced motion gets a carousel they advance themselves.
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_MQ).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MQ)
    const onChange = (ev) => setIsDesktop(ev.matches)
    mql.addEventListener('change', onChange)
    setIsDesktop(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}

export function EmblaCarousel() {
  const isDesktop = useIsDesktop()
  const slides = isDesktop ? WIDE_SLIDES : SQUARE_SLIDES

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: 'rtl', align: 'start' },
    prefersReducedMotion ? [] : [Autoplay({ delay: 5000, stopOnInteraction: false })]
  )

  // Swapping the set changes the slide count and their widths, so Embla has
  // to measure again or it keeps snapping to the old geometry.
  useEffect(() => {
    emblaApi?.reInit()
  }, [emblaApi, isDesktop])

  return (
    <div className={`embla ${isDesktop ? 'embla--wide' : 'embla--square'}`}>
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {slides.map(({ src, alt }) => (
            <div className="embla__slide" key={src}>
              <img className="embla__slide__img" src={src} alt={alt} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
