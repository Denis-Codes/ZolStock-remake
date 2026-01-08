import { EmblaCarousel } from '../cmps/EmblaCarousel.jsx'
import { PauseOnHover } from '../cmps/SlickCarousel.jsx'

export function HomePage() {
    return (
        <section>
            <div className="gallery">
                {/* <PauseOnHover /> */}
                <EmblaCarousel />
            </div>
            <div className="section-separator">
                <h2>חדש על המדף</h2>
            </div>
            <div className="gallery2">
                <img src="https://zolstock.co.il/wp-content/uploads/2025/10/456456454565.jpg" alt="new-products1" />
                <img src="https://zolstock.co.il/wp-content/uploads/2025/10/575676567.jpg" alt="new-products2" />
                <img src="https://zolstock.co.il/wp-content/uploads/2025/10/9909090.jpg" alt="new-products3" />
                <img src="https://zolstock.co.il/wp-content/uploads/2025/10/23423424.jpg" alt="new-products4" />
                <img src="https://zolstock.co.il/wp-content/uploads/2025/10/23321323123.jpg" alt="new-products5" />
                <img src="https://zolstock.co.il/wp-content/uploads/2025/10/788989.jpg" alt="new-products6" />
            </div>
            <div className="all-products-btn">
                <button>לכל המוצרים</button>
            </div>
            <div className="welcome">
                <h1>ברוכים הבאים לרשת זול סטוק!</h1>
                <p>רשת זול סטוק מציעה חוויית קנייה משתלמת עם מגוון עצום של מוצרי צריכה לבית ולמשפחה במחירים זולים במיוחד. ברשת תוכלו למצוא צעצועים, כלי בית, טקסטיל, מוצרי פארם וניקיון, ציוד משרדי, מוצרי חשמל ועוד – הכול מתחדש באופן קבוע. בזול סטוק שמים את הלקוח והמחיר במרכז, עם שירות מקצועי והתאמה לכל תקציב. <strong>“זול סטוק – כשמחיר וחוויה נפגשים”</strong></p>
            </div>
        </section >
    )
}

