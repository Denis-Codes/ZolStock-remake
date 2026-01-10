import React from 'react'
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api'
import pinPng from '../assets/styles/img/pin.png'

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const israelCenter = { lat: 31.0461, lng: 34.8516 }

const loaderOptions = {
  id: 'google-map-script',
  googleMapsApiKey: apiKey,
  language: 'he',
  region: 'IL',
}

export function MyComponent({
  regions = [],
  selectedRegionId,
  selectedBranchId,
  onSelectFromMap, // ({ regionId, branchId }) => void
}) {
  const { isLoaded } = useJsApiLoader(loaderOptions)

  const mapRef = React.useRef(null)
  const [isMapReady, setIsMapReady] = React.useState(false)

  const onLoad = React.useCallback((map) => {
    mapRef.current = map
    setIsMapReady(true)
  }, [])

  const onUnmount = React.useCallback(() => {
    mapRef.current = null
    setIsMapReady(false)
  }, [])

  const allMarkers = React.useMemo(() => {
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

  React.useEffect(() => {
    if (!isMapReady) return
    const map = mapRef.current
    if (!map) return

    const region = regions.find((r) => r.id === selectedRegionId)
    if (!region) return

    const target = region.center ?? israelCenter
    map.panTo(target)
    map.setZoom(region.zoom ?? 10)
  }, [isMapReady, regions, selectedRegionId])

  React.useEffect(() => {
    if (!isMapReady || !selectedBranchId) return
    const map = mapRef.current
    if (!map) return

    const found = allMarkers.find((b) => b._placeId === selectedBranchId)
    if (!found) return

    map.panTo({ lat: found.lat, lng: found.lng })
    map.setZoom(Math.max(found._regionZoom ?? 10, 13))
  }, [isMapReady, selectedBranchId, allMarkers])

  const pinIcon = React.useMemo(() => {
    if (!isLoaded || !window.google) return null
    return {
      url: pinPng,
      scaledSize: new window.google.maps.Size(44, 54),
      anchor: new window.google.maps.Point(22, 54),
    }
  }, [isLoaded])

  const pinIconActive = React.useMemo(() => {
    if (!isLoaded || !window.google) return null
    return {
      url: pinPng,
      scaledSize: new window.google.maps.Size(60, 74),
      anchor: new window.google.maps.Point(30, 74),
    }
  }, [isLoaded])

  return isLoaded ? (
    <div dir="ltr" style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={israelCenter}
        zoom={7}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{ mapTypeControl: false }}
        onClick={() => onSelectFromMap?.({ regionId: selectedRegionId, branchId: null })}
      >
        {pinIcon &&
          allMarkers.map((branch) => {
            const branchId = branch._placeId || `${branch.title}-${branch.address}`
            const isActive = selectedBranchId && branch._placeId === selectedBranchId

            return (
              <MarkerF
                key={branchId}
                position={{ lat: branch.lat, lng: branch.lng }}
                icon={isActive ? pinIconActive : pinIcon}
                zIndex={isActive ? 999 : 1}
                title={branch.title}
                onClick={() =>
                  onSelectFromMap?.({
                    regionId: branch._regionId,
                    branchId: branch._placeId ?? null,
                  })
                }
              />
            )
          })}
      </GoogleMap>
    </div>
  ) : null
}
