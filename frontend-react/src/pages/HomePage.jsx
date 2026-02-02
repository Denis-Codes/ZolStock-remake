import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { EmblaCarousel } from '../cmps/EmblaCarousel.jsx'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { AppAccordion } from '../cmps/AppAccordion'
import { MyComponent } from '../cmps/MapsCmp.jsx'
import regions from '../data/branches.withLatLng.json'

export function HomePage() {
  const location = useLocation()

  const [selectedRegionId, setSelectedRegionId] = useState('sharon')
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const branchRefs = useRef({})

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === selectedRegionId),
    [selectedRegionId]
  )

  function handleRegionChange(id) {
    setSelectedRegionId(id)
    setSelectedBranchId(null)
  }

  function handleBranchClick(branch) {
    setSelectedBranchId(branch?._placeId ?? null)
  }

  function handleSelectFromMap({ regionId, branchId }) {
    if (regionId) setSelectedRegionId(regionId)
    setSelectedBranchId(branchId ?? null)
  }

  function getScrollParent(node) {
    let parent = node?.parentElement
    while (parent) {
      const style = window.getComputedStyle(parent)
      const overflowY = style.overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') return parent
      parent = parent.parentElement
    }
    return null
  }

  useEffect(() => {
    if (location.state?.scrollTo !== 'branches-map') return

    const el = document.getElementById('branches-map')
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [location.state])

  useEffect(() => {
    if (!selectedBranchId) return
    const el = branchRefs.current[selectedBranchId]
    if (!el) return

    const container = getScrollParent(el)
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const elTopInContainer = elRect.top - containerRect.top + container.scrollTop

    const targetTop =
      elTopInContainer - (container.clientHeight / 2 - el.clientHeight / 2)

    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
  }, [selectedBranchId, selectedRegionId])

  return (
    <section>
      <div className="gallery full-viewport">
        <EmblaCarousel />
      </div>

      <div className="section-separator full-viewport">
        <h2>חדש על המדף</h2>
      </div>

      <div className="gallery2">
        <img
          src="https://zolstock.co.il/wp-content/uploads/2025/10/456456454565.jpg"
          alt="new-products1"
        />
        <img
          src="https://zolstock.co.il/wp-content/uploads/2025/10/575676567.jpg"
          alt="new-products2"
        />
        <img
          src="https://zolstock.co.il/wp-content/uploads/2025/10/9909090.jpg"
          alt="new-products3"
        />
        <img
          src="https://zolstock.co.il/wp-content/uploads/2025/10/23423424.jpg"
          alt="new-products4"
        />
        <img
          src="https://zolstock.co.il/wp-content/uploads/2025/10/23321323123.jpg"
          alt="new-products5"
        />
        <img
          src="https://zolstock.co.il/wp-content/uploads/2025/10/788989.jpg"
          alt="new-products6"
        />
      </div>

      <div className="welcome full-viewport">
        <h1>ברוכים הבאים לרשת זול סטוק!</h1>
        <p>
          רשת זול סטוק מציעה חוויית קנייה משתלמת עם מגוון עצום של מוצרי צריכה לבית
          ולמשפחה במחירים זולים במיוחד. ברשת תוכלו למצוא צעצועים, כלי בית, טקסטיל,
          מוצרי פארם וניקיון, ציוד משרדי, מוצרי חשמל ועוד – הכול מתחדש באופן קבוע.
          בזול סטוק שמים את הלקוח והמחיר במרכז, עם שירות מקצועי והתאמה לכל תקציב.
        </p>
        <h2>
          <strong> "זול סטוק – כשמחיר וחוויה נפגשים"</strong>
        </h2>
      </div>

      <div className="section-separator full-viewport">
        <h2>הסניפים שלנו</h2>
      </div>

      <div className="branches-container" id="branches-map">
        <div className="branches-menu">
          <AppAccordion
            items={regions}
            allowMultiple={false}
            defaultExpandedId="sharon"
            expandedId={selectedRegionId}
            getId={(r) => r.id}
            onExpandedChange={handleRegionChange}
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
                  region.branches.map((b, idx) => {
                    const isActive =
                      selectedBranchId && b._placeId === selectedBranchId

                    return (
                      <div
                        key={b._placeId || `${b.title}-${b.address}`}
                        ref={(node) => {
                          if (!node) return
                          if (b._placeId) branchRefs.current[b._placeId] = node
                        }}
                        onClick={() => handleBranchClick(b)}
                        style={{
                          cursor: 'pointer',
                          padding: '10px 10px',
                          borderRadius: 10,
                          background: isActive ? '#f2f2f2' : 'transparent',
                          border: isActive
                            ? '1px solid #d0d0d0'
                            : '1px solid transparent',
                        }}
                      >
                        <Typography sx={{ fontWeight: 700 }}>{b.title}</Typography>
                        <Typography>{b.address}</Typography>

                        {b.hours.map((line) => (
                          <Typography key={line}>{line}</Typography>
                        ))}

                        {idx !== region.branches.length - 1 && (
                          <Divider sx={{ my: 2 }} />
                        )}
                      </div>
                    )
                  })
                )}
              </>
            )}
          />
        </div>

        <div className="map-container">
          <div className="map">
            <MyComponent
              regions={regions}
              selectedRegionId={selectedRegionId}
              selectedBranchId={selectedBranchId}
              onSelectFromMap={handleSelectFromMap}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
