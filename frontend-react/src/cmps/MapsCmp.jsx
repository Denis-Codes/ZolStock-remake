import React from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'

import 'leaflet/dist/leaflet.css'
import pinPng from '../assets/styles/img/pin.png'

/**
 * The branch map.
 *
 * Runs on Leaflet + OpenStreetMap rather than Google Maps. Google's JS API
 * requires a billing account with a card on file, and its key would have to
 * ship inside the bundle as VITE_GOOGLE_MAPS_API_KEY — where any visitor can
 * read it and spend against it. OSM tiles need no key, no account and no card,
 * so the whole class of problem disappears along with the secret.
 *
 * The props, the class names and the interaction contract are unchanged from
 * the Google implementation, so BranchesPage and BranchesPage.scss did not have
 * to move.
 */

const israelCenter = { lat: 31.0461, lng: 34.8516 }
const ISRAEL_ZOOM = 7

/* OpenStreetMap's tile usage policy REQUIRES this attribution to be displayed.
   It is a condition of using the public tile servers, not a courtesy. */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/* Leaflet sizes marker icons in pixels rather than accepting a scaled size, so
   the two states are two icons. Anchor is the tip of the pin: half the width
   across, full height down, so the point sits on the coordinate rather than
   the image's centre. */
const pinIcon = L.icon({
  iconUrl: pinPng,
  iconSize: [44, 54],
  iconAnchor: [22, 54],
})

const pinIconActive = L.icon({
  iconUrl: pinPng,
  iconSize: [60, 74],
  iconAnchor: [30, 74],
  className: 'branch-pin--active',
})

/**
 * Imperative camera moves.
 *
 * react-leaflet exposes the map instance only through `useMap()`, which has to
 * be called from a component *inside* MapContainer — hence this child rather
 * than a ref on the parent.
 */
function MapCamera({ regions, selectedRegionId, selectedBranchId, markers }) {
  const map = useMap()

  /* The country's centre is not the network's centre. `israelCenter` is the
     geographic middle of Israel, but 58 of the 74 shops sit north of Jerusalem
     and the southern third of the frame is empty Negev — so a hardcoded
     center/zoom parked the pins against the top edge of the panel.
   *
     Fitting the markers' own bounds centres on the shops instead, and it is
     computed from the panel's real dimensions, so it stays right at any width,
     height or aspect ratio rather than being tuned for one of them. */
  const allBounds = React.useMemo(() => {
    if (!markers.length) return null
    return L.latLngBounds(markers.map(b => [b.lat, b.lng]))
  }, [markers])

  const fitAll = React.useCallback(() => {
    if (!allBounds) return
    // Not animated: this is the resting view, not a move between two views.
    map.fitBounds(allBounds, { padding: [28, 28], animate: false })
  }, [map, allBounds])

  React.useEffect(() => {
    const region = regions.find(r => r.id === selectedRegionId)

    // Collapsing the open region used to leave the camera wherever that region
    // had put it. Nothing selected now means the whole network again.
    if (!region) {
      fitAll()
      return
    }

    map.flyTo(region.center ?? israelCenter, region.zoom ?? 10, { duration: 0.6 })
  }, [map, regions, selectedRegionId, fitAll])

  React.useEffect(() => {
    if (!selectedBranchId) return

    const found = markers.find(b => b._uid === selectedBranchId)
    if (!found) return

    map.flyTo({ lat: found.lat, lng: found.lng }, Math.max(found._regionZoom ?? 10, 13), {
      duration: 0.6,
    })
  }, [map, selectedBranchId, markers])

  /* Read through a ref so re-measuring does not need the selection in its
     dependency list — otherwise every pin click would tear down and re-register
     the resize listener. */
  const selectionRef = React.useRef(null)
  selectionRef.current = { selectedRegionId, selectedBranchId }

  /* Leaflet measures its container once, on mount. The branch locator is a
     flex column that settles after first paint, and on the desktop two-column
     layout it is measured before the accordion beside it has sized — leaving
     the map rendering into stale dimensions with grey gaps where tiles should
     be. Re-measuring on the next frame, and on resize, keeps it correct. */
  React.useEffect(() => {
    const resync = () => {
      map.invalidateSize()

      // A new size fits a different area, so the resting view is recomputed —
      // but only while it IS the resting view. Re-fitting after a resize would
      // otherwise pull the camera off the region or branch someone picked.
      const { selectedRegionId: regionId, selectedBranchId: branchId } = selectionRef.current
      if (!regionId && !branchId) fitAll()
    }

    const raf = requestAnimationFrame(resync)

    window.addEventListener('resize', resync)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resync)
    }
  }, [map, fitAll])

  return null
}

/** Clicking bare map (not a pin) clears the selected branch. */
function MapBackgroundClick({ onBackgroundClick }) {
  useMapEvents({ click: onBackgroundClick })
  return null
}

export function MyComponent({
  regions = [],
  selectedRegionId,
  selectedBranchId,
  onSelectFromMap, // ({ regionId, branchId }) => void
}) {
  /* Tiles are fetched from a third party, so they can still fail where the
     library itself cannot. Falling back only once several tiles have errored
     *and* none have succeeded avoids swapping out a working map because one
     tile at the edge of the viewport timed out. */
  const [tileErrors, setTileErrors] = React.useState(0)
  const [hasTile, setHasTile] = React.useState(false)

  const markers = React.useMemo(() => {
    const out = []
    for (const region of regions) {
      for (const b of region.branches ?? []) {
        const lat = typeof b.lat === 'string' ? parseFloat(b.lat) : b.lat
        const lng = typeof b.lng === 'string' ? parseFloat(b.lng) : b.lng
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

        out.push({
          ...b,
          lat,
          lng,
          _regionId: region.id,
          _regionCenter: region.center,
          _regionZoom: region.zoom,
        })
      }
    }
    return out
  }, [regions])

  const tileHandlers = React.useMemo(
    () => ({
      tileload: () => setHasTile(true),
      tileerror: () => setTileErrors(n => n + 1),
    }),
    []
  )

  /* The map used to return `null` whenever it could not load — no key, no
     network, no quota — which left a silent blank rectangle the height of the
     map under the "הסניפים שלנו" heading. Nothing told anyone it had failed.
     Both states are authored now, and the failure keeps the shopper moving:
     the branch list beside it still works, and a map is one tap away. */
  if (tileErrors > 3 && !hasTile) {
    return (
      <div className="map-fallback" role="status">
        <p className="map-fallback__title">המפה לא נטענה</p>
        <p className="map-fallback__body">
          אפשר לבחור אזור ברשימה שלצד המפה ולראות את כל הכתובות ושעות הפתיחה.
        </p>
        <a
          className="map-fallback__link"
          href="https://www.openstreetmap.org/search?query=%D7%96%D7%95%D7%9C%20%D7%A1%D7%98%D7%95%D7%A7"
          target="_blank"
          rel="noopener noreferrer"
        >
          פתיחת הסניפים במפה
        </a>
      </div>
    )
  }

  return (
    <div dir="ltr" style={{ width: '100%', height: '100%' }}>
      <MapContainer
        center={israelCenter}
        zoom={ISRAEL_ZOOM}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} eventHandlers={tileHandlers} />

        <MapCamera
          regions={regions}
          selectedRegionId={selectedRegionId}
          selectedBranchId={selectedBranchId}
          markers={markers}
        />

        <MapBackgroundClick
          onBackgroundClick={() =>
            onSelectFromMap?.({ regionId: selectedRegionId, branchId: null })
          }
        />

        {markers.map(branch => {
          // `_uid` is assigned in BranchesPage; `_placeId` is not unique in the
          // source data and cannot identify a branch on its own.
          const isActive = selectedBranchId && branch._uid === selectedBranchId

          return (
            <Marker
              key={branch._uid}
              position={{ lat: branch.lat, lng: branch.lng }}
              icon={isActive ? pinIconActive : pinIcon}
              zIndexOffset={isActive ? 1000 : 0}
              title={branch.title}
              alt={branch.title}
              eventHandlers={{
                click: ev => {
                  // Without this the click also reaches the map beneath, whose
                  // handler immediately clears the branch that was just picked.
                  L.DomEvent.stopPropagation(ev)
                  onSelectFromMap?.({
                    regionId: branch._regionId,
                    branchId: branch._uid ?? null,
                  })
                },
              }}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}
