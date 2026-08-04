import { useEffect, useMemo, useRef, useState } from 'react'

import { AppAccordion } from '../cmps/AppAccordion'
import { MyComponent } from '../cmps/MapsCmp.jsx'
import rawRegions from '../data/branches.withLatLng.json'

/**
 * The branch locator, on its own route.
 *
 * It used to be the last block of the homepage — a 62vh map plus 74 branch
 * rows, roughly half the page's scroll, which meant a shopping homepage closed
 * on "here is where to drive". Peak-end says the final moment colours the
 * whole visit, and this was the wrong final moment for a storefront. It is the
 * same map and the same list; it is simply somewhere a shopper goes when they
 * want it, reachable from the header, the drawer and the homepage's closing
 * band.
 *
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

export function BranchesPage() {
  const regions = useMemo(() => withBranchIds(rawRegions), [])

  const branchCount = useMemo(
    () => regions.reduce((total, region) => total + (region.branches?.length ?? 0), 0),
    [regions]
  )

  // Every region starts collapsed, so the map is the first thing you meet and
  // the list stays a short, scannable set of region names underneath it.
  const [selectedRegionId, setSelectedRegionId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const branchRefs = useRef({})

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
    <section className="branches-page">
      <header className="branches-page__head">
        <h1>הסניפים שלנו</h1>
        <p>
          {branchCount} סניפים ברחבי הארץ. בחרו אזור כדי לראות כתובות ושעות פתיחה,
          או סמנו סניף על המפה.
        </p>
      </header>

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
            renderSummary={(region) => (
              <span className="branch-region-name">
                {region.name}
                <span className="branch-region-count">{region.branches.length}</span>
              </span>
            )}
            renderDetails={(region) => (
              <>
                {region.branches.length === 0 ? (
                  <p className="branch-empty">אין סניפים להצגה</p>
                ) : (
                  /* Real buttons, not clickable divs. All 74 rows used to be
                     `<div onClick>` with no role, no tabIndex and no focus
                     state, so a keyboard or switch user could not reach the
                     locator at all. */
                  <ul className="branch-list">
                    {region.branches.map((b) => {
                      const isActive = selectedBranchId && b._uid === selectedBranchId

                      return (
                        <li key={b._uid}>
                          <button
                            type="button"
                            className={`branch-row ${isActive ? 'is-active' : ''}`}
                            aria-pressed={!!isActive}
                            ref={(node) => {
                              if (node) branchRefs.current[b._uid] = node
                            }}
                            onClick={() => handleBranchClick(b)}
                          >
                            <span className="branch-row__title">{b.title}</span>
                            <span className="branch-row__address">{b.address}</span>

                            {b.hours.map((line) => (
                              <span className="branch-row__hours" key={line}>
                                {line}
                              </span>
                            ))}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
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
