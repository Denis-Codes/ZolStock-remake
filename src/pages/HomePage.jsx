import { EmblaCarousel } from '../cmps/EmblaCarousel.jsx'
import { PauseOnHover } from '../cmps/SlickCarousel.jsx'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { AppAccordion } from '../cmps/AppAccordion'
import { MyComponent } from '../cmps/MapsCmp.jsx'
import regions from '../data/branches.json'


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
                <p>רשת זול סטוק מציעה חוויית קנייה משתלמת עם מגוון עצום של מוצרי צריכה לבית ולמשפחה במחירים זולים במיוחד. ברשת תוכלו למצוא צעצועים, כלי בית, טקסטיל, מוצרי פארם וניקיון, ציוד משרדי, מוצרי חשמל ועוד – הכול מתחדש באופן קבוע. בזול סטוק שמים את הלקוח והמחיר במרכז, עם שירות מקצועי והתאמה לכל תקציב. <strong>"זול סטוק – כשמחיר וחוויה נפגשים"</strong></p>
            </div>
            <div className="section-separator">
                <h2>הסניפים שלנו</h2>
            </div>
            <div className="branches-container">
                {/* Accordion - left side */}
                <div className="branches-menu">
                    <AppAccordion
                        items={regions}
                        allowMultiple={false}
                        defaultExpandedId="sharon"
                        getId={(r) => r.id}
                        maxDetailsHeight="248px"
                        sx={{ border: '1px solid #ddd' }}
                        renderSummary={(region) => (
                            <Typography sx={{ fontWeight: 700 }}>{region.name}</Typography>
                        )}
                        renderDetails={(region) => (
                            <>
                                {region.branches.length === 0 ? (
                                    <Typography sx={{ opacity: 0.7 }}>אין סניפים להצגה</Typography>
                                ) : (
                                    region.branches.map((b, idx) => (
                                        <div key={b.title}>
                                            <Typography sx={{ fontWeight: 700 }}>{b.title}</Typography>
                                            <Typography>{b.address}</Typography>
                                            {b.hours.map((line) => (
                                                <Typography key={line}>{line}</Typography>
                                            ))}

                                            {idx !== region.branches.length - 1 && (
                                                <Divider sx={{ my: 2 }} />
                                            )}
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    />
                </div>

                <div className="map-container">
                    <div className="map">
                        <MyComponent />
                    </div>
                </div>
            </div>
        </section>
    )
}
