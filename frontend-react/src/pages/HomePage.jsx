import { Link } from 'react-router-dom'

import { EmblaCarousel } from '../cmps/EmblaCarousel.jsx'
import { HomeDeals } from '../cmps/HomeDeals.jsx'
import { DEPARTMENTS, departmentPath } from '../services/taxonomy.service'
import { departmentImage } from '../services/department-highlights.service'
import branchRegions from '../data/branches.withLatLng.json'

const BRANCH_COUNT = branchRegions.reduce(
  (total, region) => total + (region.branches?.length ?? 0),
  0
)

/* "א, ב, ג ו-ד" — the departments read as a Hebrew sentence rather than a
   comma-separated dump, and the list stays derived from taxonomy.service so
   the copy cannot drift from the nav the way the old welcome block did. */
const DEPARTMENT_SENTENCE = DEPARTMENTS.map(({ labelHe }) => labelHe)
  .reduce((sentence, label, index, all) => {
    if (index === 0) return label
    if (index === all.length - 1) return `${sentence} ו${label}`
    return `${sentence}, ${label}`
  }, '')

/**
 * The homepage.
 *
 * It used to run carousel → category tiles → welcome copy → store locator, and
 * sold nothing: no product, no price, no struck-through original, no discount
 * badge anywhere on it. The signature price tag — DESIGN.md's "defining object
 * of the storefront" — never appeared on the surface every shopper lands on,
 * and the page closed on a map of car parks.
 *
 * It now states a price in the first viewport (the hero), puts the deepest
 * markdowns in the catalogue directly under it, and only then offers the
 * departments. The locator moved to /branches, where a shopper goes when they
 * want it.
 */
function HomePage() {
  return (
    <section className="home-page">
      {/* The visual title of this page is the logo lockup in the header, so
          the document's h1 is here rather than duplicated on screen. The page
          previously ran h2 → h1 → h2, with the only h1 buried three blocks
          down inside the welcome copy. */}
      <h1 className="visually-hidden">זול סטוק — קניות לבית במחירים זולים</h1>

      <div className="gallery">
        <EmblaCarousel />
      </div>

      {/* `.section-separator` was a full-width blue band with centred white
          text — the same object as the hero above it and the closing CTA
          below, so the page offered five slabs of #1c41b4 with no way to rank
          them. A section head is a label, not a brand moment; it reads as type
          now and the blue is left to mean something. */}
      <div className="home-section-head">
        <h2>המבצעים הגדולים</h2>
      </div>

      <div className="home-deals">
        <HomeDeals />
      </div>

      <div className="home-section-head">
        <h2>קנייה לפי קטגוריה</h2>
      </div>

      {/* Straight from the department list, with artwork keyed by slug. It
          used to query the API eight times to borrow the first product photo
          it could find in each department — which meant eight round trips, a
          zero-height hole under a labelled band while they resolved, and, when
          those files turned out not to exist, eight identical grey
          placeholders where the category system should have been. The tiles
          are static content; they render with the page. */}
      <nav className="category-tiles" aria-label="מחלקות החנות">
        {DEPARTMENTS.map(({ slug, labelHe }, index) => (
          <Link key={slug} to={departmentPath(slug)} className="category-tile">
            <img
              src={departmentImage(slug)}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <span className="category-tile-label">{labelHe}</span>
          </Link>
        ))}
      </nav>

      {/* The page used to end on a 62vh map and 74 branch rows, and carried a
          separate `.welcome` block of brochure copy that advertised three
          departments this chain does not have (מוצרי פארם, ציוד משרדי, מוצרי
          חשמל) while omitting four it does. One closing block now, saying only
          what is true, and ending on something to do rather than on a car
          park. */}
      <div className="home-close">
        <h2>כל הבית במקום אחד</h2>
        <p>
          {DEPARTMENT_SENTENCE} — {DEPARTMENTS.length} מחלקות במחירים זולים,
          ב-{BRANCH_COUNT} סניפים ברחבי הארץ.
        </p>

        <Link className="home-close__cta" to="/branches">
          למצוא סניף קרוב
        </Link>
      </div>
    </section>
  )
}

export default HomePage
