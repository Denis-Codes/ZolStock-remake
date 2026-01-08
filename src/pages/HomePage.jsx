import { EmblaCarousel } from '../cmps/EmblaCarousel.jsx'
import { PauseOnHover } from '../cmps/SlickCarousel.jsx'

export function HomePage() {
    return (
        <section>
            <div className="gallery">
                {/* <PauseOnHover /> */}
                <EmblaCarousel />
            </div>
            <div className="welcome">
                <h1>ברוכים הבאים לרשת זול סטוק!</h1>
                <p>רשת זול סטוק מציעה חוויית קנייה משתלמת עם מגוון עצום של מוצרי צריכה לבית ולמשפחה במחירים זולים במיוחד. ברשת תוכלו למצוא צעצועים, כלי בית, טקסטיל, מוצרי פארם וניקיון, ציוד משרדי, מוצרי חשמל ועוד – הכול מתחדש באופן קבוע. בזול סטוק שמים את הלקוח והמחיר במרכז, עם שירות מקצועי והתאמה לכל תקציב. <strong>“זול סטוק – כשמחיר וחוויה נפגשים”</strong></p>
            </div>
        </section >
    )
}

