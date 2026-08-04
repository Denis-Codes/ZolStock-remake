import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'

import { departmentPath } from '../services/taxonomy.service'
import {
  departmentImage,
  getDeepestDiscountDepartments,
} from '../services/department-highlights.service'
import { moneyAriaLabel, moneyParts } from '../services/money.service'

/**
 * The homepage hero.
 *
 * It used to be six bare image tags hotlinked from zolstock.co.il, showing a
 * חורף 2025 campaign for coats, boots and gloves — categories this shop does
 * not stock — with no link on any of them. The largest, most animated object
 * on the page went nowhere, advertised goods that do not exist, and put the
 * LCP asset on a third party's server, which PRODUCT.md forbids outright.
 *
 * The slides are authored now: each one is a department, its real deepest
 * markdown, its real entry price, and its own artwork from `public/`. That
 * makes the hero the first place a shopper meets a price — the single thing
 * this storefront is selling — and every slide is a link to somewhere real.
 *
 * Because the slides are markup rather than two sets of fixed-size artwork,
 * the JS breakpoint that used to swap 1920×700 banners for 1080×1080 tiles is
 * gone. One set, one slide count, and CSS changes the shape. Embla only needed
 * the JS because the two sets differed in COUNT and it measures real widths.
 */

const AUTOPLAY_DELAY = 6000

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SLIDES = getDeepestDiscountDepartments(4)

function HeroPrice({ amount }) {
  const { whole, agorot } = moneyParts(amount)

  return (
    <span className="hero-slide__price" aria-label={`החל מ־${moneyAriaLabel(amount)}`}>
      <span className="hero-slide__price-lead" aria-hidden="true">
        החל מ־
      </span>
      {/* Reverses once, in CSS. `dir="ltr"` here as well would cancel it out
          and render 90₪7 — see DESIGN.md, The LTR Price Rule. */}
      <span className="hero-slide__price-tag" aria-hidden="true">
        <span className="ils">₪</span>
        <span className="whole">{whole}</span>
        {agorot && <span className="frac">{agorot}</span>}
      </span>
    </span>
  )
}

export function EmblaCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: 'rtl', align: 'start' },
    // Autoplay stops the moment the shopper touches the carousel. It used to
    // carry `stopOnInteraction: false`, so a swipe back to the slide you were
    // reading was overruled 5 seconds later and there was no way to win.
    prefersReducedMotion
      ? []
      : [Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: true, stopOnMouseEnter: true })]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion)

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    const autoplay = emblaApi.plugins()?.autoplay
    const onAutoplayChange = () => setIsPlaying(!!autoplay?.isPlaying())

    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    emblaApi.on('autoplay:play', onAutoplayChange)
    emblaApi.on('autoplay:stop', onAutoplayChange)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
      emblaApi.off('autoplay:play', onAutoplayChange)
      emblaApi.off('autoplay:stop', onAutoplayChange)
    }
  }, [emblaApi])

  const scrollTo = useCallback((index) => emblaApi?.scrollTo(index), [emblaApi])

  const toggleAutoplay = useCallback(() => {
    const autoplay = emblaApi?.plugins()?.autoplay
    if (!autoplay) return

    if (autoplay.isPlaying()) autoplay.stop()
    else autoplay.play()

    setIsPlaying(autoplay.isPlaying())
  }, [emblaApi])

  if (!SLIDES.length) return null

  return (
    <section className="embla" aria-roledescription="carousel" aria-label="מבצעי המחלקות">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {SLIDES.map(({ slug, labelHe, fromPrice, maxDiscount }, index) => (
            <div
              className="embla__slide"
              key={slug}
              role="group"
              aria-roledescription="שקופית"
              aria-label={`${index + 1} מתוך ${SLIDES.length}`}
            >
              <Link className="hero-slide" to={departmentPath(slug)}>
                <div className="hero-slide__media">
                  {/* The first slide is the LCP element, so it loads eagerly
                      and at high priority. It previously carried
                      `loading="lazy"`, deferring the one image that has to
                      paint first. */}
                  <img
                    src={departmentImage(slug)}
                    alt=""
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchpriority={index === 0 ? 'high' : 'auto'}
                    decoding={index === 0 ? 'sync' : 'async'}
                  />
                </div>

                <div className="hero-slide__panel">
                  <h2 className="hero-slide__title">{labelHe}</h2>

                  {maxDiscount > 0 && (
                    <p className="hero-slide__markdown">עד {maxDiscount}%- הנחה</p>
                  )}

                  <HeroPrice amount={fromPrice} />

                  <span className="hero-slide__cta">לכל המחלקה</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="embla__controls">
        {!prefersReducedMotion && (
          <button
            className="embla__play"
            type="button"
            onClick={toggleAutoplay}
            aria-label={isPlaying ? 'עצור מעבר אוטומטי בין המבצעים' : 'הפעל מעבר אוטומטי בין המבצעים'}
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>
        )}

        <div className="embla__dots" role="tablist" aria-label="בחירת מבצע">
          {SLIDES.map(({ slug, labelHe }, index) => (
            <button
              key={slug}
              className={`embla__dot ${index === selectedIndex ? 'is-selected' : ''}`}
              type="button"
              role="tab"
              aria-selected={index === selectedIndex}
              aria-label={`מבצעי ${labelHe}`}
              onClick={() => scrollTo(index)}
            >
              <span className="embla__dot-mark" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
