import { Link, NavLink, Outlet } from 'react-router-dom'

/**
 * This page was the starter template's demo screen — lorem ipsum, a pink
 * SplitPane, a FancyBox and two placeholder names — reachable at /about and
 * linked from the footer. Replaced with the chain's own copy.
 *
 * Everything here comes from what the project actually knows: the five
 * departments it sells, the branch network on the homepage map, and the
 * tagline already on the logo. No customer numbers, founding dates, store
 * counts or awards — PRODUCT.md records that none of that is established, and
 * inventing it would put false claims on a real chain's page.
 */

const DEPARTMENTS = [
  { slug: 'furniture', labelHe: 'רהיטים' },
  { slug: 'clothing', labelHe: 'ביגוד' },
  { slug: 'electronics', labelHe: 'אלקטרוניקה' },
  { slug: 'kitchen', labelHe: 'מטבח' },
  { slug: 'pets', labelHe: 'חיות מחמד' },
]

export function AboutUs() {
  return (
    <section className="about-page">
      <header className="about-hero">
        <h1>אודות זול סטוק</h1>
        <p className="about-lead">
          זול סטוק היא רשת קמעונאית שמביאה מגוון רחב של מוצרים לבית ולמשפחה
          במחירים נגישים. מרהיטים ועד כלי מטבח, מביגוד ועד מוצרי חשמל — הכול
          תחת קורת גג אחת, ובמחיר שמתאים לכל תקציב.
        </p>
      </header>

      <nav className="about-tabs" aria-label="ניווט באודות">
        <NavLink to="/about" end>הסיפור שלנו</NavLink>
        <NavLink to="/about/vision">החזון</NavLink>
        <NavLink to="/about/team">הצוות</NavLink>
      </nav>

      <div className="about-body">
        <Outlet />
      </div>

      <section className="about-departments">
        <h2>המחלקות שלנו</h2>
        <ul>
          {DEPARTMENTS.map(({ slug, labelHe }) => (
            <li key={slug}>
              <Link to={`/category/${slug}`}>{labelHe}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-cta">
        <h2>רוצים לראות במו עיניכם?</h2>
        <p>
          המלאי בסניפים מתחדש באופן שוטף, וייתכנו הבדלים בין סניף לסניף.
          כדאי לבדוק מה קרוב אליכם לפני שיוצאים לדרך.
        </p>
        <Link className="about-cta-btn" to="/" state={{ scrollTo: 'branches-map' }}>
          לרשימת הסניפים
        </Link>
      </section>
    </section>
  )
}

export function AboutStory() {
  return (
    <article className="about-article">
      <h2>הסיפור שלנו</h2>
      <p>
        הרעיון פשוט: לרכז תחת קורת גג אחת את מה שמשפחה צריכה — רהיטים, ביגוד,
        מוצרי חשמל, כלי מטבח וציוד לחיות מחמד — ולמכור אותו במחיר שלא מחייב
        להתפשר על האיכות.
      </p>
      <p>
        המבחר בסניפים משתנה לאורך השנה, ולכן שווה לחזור ולבדוק. מה שמופיע כאן
        באתר נותן תמונה של הקטגוריות, והסניף הקרוב הוא המקום לראות, למשש
        ולקחת הביתה.
      </p>
    </article>
  )
}

export function AboutVision() {
  return (
    <article className="about-article">
      <h2>החזון</h2>
      <p>
        המחיר הוא נקודת הפתיחה, לא הפשרה. המטרה היא שקנייה משתלמת לא תרגיש
        כמו ויתור — שהמוצר יהיה טוב, שהמבחר יהיה אמיתי, ושהמחיר יהיה ברור
        מהרגע הראשון.
      </p>

      <ul className="about-principles">
        <li>
          <h3>מחיר בלי כוכביות</h3>
          <p>המחיר שאתם רואים הוא המחיר. הנחות מוצגות תמיד לצד המחיר המקורי.</p>
        </li>
        <li>
          <h3>מבחר שמתחדש</h3>
          <p>המלאי בסניפים מתחדש באופן שוטף, כך שתמיד יש מה לגלות.</p>
        </li>
        <li>
          <h3>קרוב לבית</h3>
          <p>רשת סניפים פרוסה ברחבי הארץ, עם כתובות ושעות פתיחה בדף הבית.</p>
        </li>
      </ul>
    </article>
  )
}

export function AboutTeam() {
  return (
    <article className="about-article">
      <h2>הצוות</h2>
      <p>
        מאחורי כל סניף עומד צוות מקומי שמכיר את הלקוחות שלו ואת המדפים שלו.
        הצוות אחראי על סידור המלאי, על השירות בקופה ועל המענה לשאלות בשטח.
      </p>
      <p className="about-note">
        מחפשים עבודה ברשת? פרטי המשרות הפתוחות מתפרסמים בעמוד הדרושים.
      </p>
    </article>
  )
}
