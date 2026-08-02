import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { EmblaCarousel } from '../cmps/EmblaCarousel.jsx'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { AppAccordion } from '../cmps/AppAccordion'
import { MyComponent } from '../cmps/MapsCmp.jsx'
import rawRegions from '../data/branches.withLatLng.json'
import { productService } from '../services/product'
import { DEPARTMENTS, departmentPath } from '../services/taxonomy.service'
import { onProductImageError } from '../services/util.service'

/**
 * Three branches in branches.withLatLng.json share one `_placeId`
 * (ChIJi8mnMiRJABURuiw1EyBCa2o) — אום אל פחם, ירכא and בית אל all failed to
 * geocode and fell back to the same record. That id was doing three jobs at
 * once: React key, ref lookup, and selected-branch identity, so the list threw
 * duplicate-key warnings and clicking a pin scrolled to the wrong shop.
 *
 * A positional id is unique by construction and independent of the data's
 * quality. `_placeId` stays on the object for anything that genuinely needs
 * the Google reference.
 *
 * NOTE: those three branches also share fallback coordinates in the Negev, so
 * their pins sit far from their real addresses. That is a data fix (re-run
 * src/scripts/geocode-branches.mjs), not a UI one.
 */
function withBranchIds(regions) {
  return regions.map((region) => ({
    ...region,
    branches: (region.branches ?? []).map((branch, idx) => ({
      ...branch,
      _uid: `${region.id}:${idx}`,
    })),
  }))
}

function HomePage() {
  const location = useLocation()
  const regions = useMemo(() => withBranchIds(rawRegions), [])

  const [categoryTiles, setCategoryTiles] = useState([])

  // Every region starts collapsed, so the map is the first thing you meet and
  // the list stays a short, scannable set of region names underneath it.
  const [selectedRegionId, setSelectedRegionId] = useState('')
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
    setSelectedBranchId(branch?._uid ?? null)
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
    let isCancelled = false

    Promise.all(
      DEPARTMENTS.map(async (def) => {
        const products = await productService.query({ category: def.slug })
        const withImage = products.find((p) => p.images?.[0] || p.imgUrl || p.image)
        if (!withImage) return null

        const image = withImage.images?.[0] || withImage.imgUrl || withImage.image
        return { ...def, image }
      })
    ).then((tiles) => {
      if (!isCancelled) setCategoryTiles(tiles.filter(Boolean))
    })

    return () => {
      isCancelled = true
    }
  }, [])

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

    // On mobile the list is no longer its own scroller, so there is no
    // scroll parent to move — bring the branch into view on the page instead.
    if (!container) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const elTopInContainer = elRect.top - containerRect.top + container.scrollTop

    const targetTop =
      elTopInContainer - (container.clientHeight / 2 - el.clientHeight / 2)

    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
  }, [selectedBranchId, selectedRegionId])

  return (
    <section>
      <div className="gallery">
        <EmblaCarousel />
      </div>

      <div className="section-separator">
        <h2>קנייה לפי קטגוריה</h2>
      </div>

      <div className="category-tiles">
        {categoryTiles.map((tile) => (
          <Link key={tile.slug} to={departmentPath(tile.slug)} className="category-tile">
            <img src={tile.image} alt={tile.labelHe} loading="lazy" onError={onProductImageError} />
            <span className="category-tile-label">{tile.labelHe}</span>
          </Link>
        ))}
      </div>

      <div className="welcome">
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

      <div className="section-separator">
        <h2>הסניפים שלנו</h2>
      </div>

      <div className="branches-container" id="branches-map">
        <div className="branches-menu" data-testid="branch-accordion">
          <AppAccordion
            items={regions}
            allowMultiple={false}
            defaultExpandedId={null}
            expandedId={selectedRegionId}
            getId={(r) => r.id}
            onExpandedChange={handleRegionChange}
            /* Height is capped in CSS on the desktop two-column layout only.
               Passing it here applied a nested scroller at every width. */
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
                      selectedBranchId && b._uid === selectedBranchId

                    return (
                      <div
                        key={b._uid}
                        ref={(node) => {
                          if (node) branchRefs.current[b._uid] = node
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

        <div className="map-container" data-testid="branch-map">
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

export default HomePage
