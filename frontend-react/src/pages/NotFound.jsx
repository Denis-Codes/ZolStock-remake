import { Link } from 'react-router-dom'

import { DEPARTMENTS, departmentPath } from '../services/taxonomy.service'

/**
 * The catch-all route.
 *
 * `RootCmp` had no `path="*"`, so any address that matched nothing rendered a
 * blank white page between the header and the footer with nothing to explain
 * it. The drawer shipped two such links — /jobs and /franchise — and the
 * header's top strip had two more as `href=""`, which silently reloaded the
 * current page.
 *
 * It names what happened and puts the shop back within one tap, because a
 * shopper who lands here was on their way somewhere.
 */
export function NotFound() {
  return (
    <section className="not-found">
      <h1>הדף הזה לא נמצא</h1>
      <p>
        ייתכן שהכתובת השתנתה או שהוקלדה בטעות. אפשר לחזור לדף הבית או להיכנס
        ישירות לאחת המחלקות.
      </p>

      <Link className="not-found__cta" to="/">
        חזרה לדף הבית
      </Link>

      <nav className="not-found__departments" aria-label="מחלקות החנות">
        {DEPARTMENTS.map(({ slug, labelHe }) => (
          <Link key={slug} to={departmentPath(slug)}>
            {labelHe}
          </Link>
        ))}
      </nav>
    </section>
  )
}
