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

export function MyComponent({ selectedRegion, selectedBranchId, onBranchSelect }) {
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

  React.useEffect(() => {
    if (!isMapReady) return
    const map = mapRef.current
    if (!map) return

    const target = selectedRegion?.center ?? israelCenter
    map.panTo(target)
    map.setZoom(selectedRegion?.zoom ?? 10)
  }, [isMapReady, selectedRegion])

  const branches = selectedRegion?.branches ?? []

  const markers = React.useMemo(() => {
    return branches
      .map((b) => ({
        ...b,
        lat: typeof b.lat === 'string' ? parseFloat(b.lat) : b.lat,
        lng: typeof b.lng === 'string' ? parseFloat(b.lng) : b.lng,
      }))
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
  }, [branches])

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

  // כשבוחרים סניף מהאקורדיון → קפיצה לנעץ
  React.useEffect(() => {
    if (!isMapReady || !selectedBranchId) return
    const found = markers.find((b) => b._placeId === selectedBranchId)
    if (!found) return

    const map = mapRef.current
    map.panTo({ lat: found.lat, lng: found.lng })
    map.setZoom(Math.max(selectedRegion?.zoom ?? 10, 13))
  }, [isMapReady, selectedBranchId, markers, selectedRegion])

  return isLoaded ? (
    <div dir="ltr" style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={israelCenter}
        zoom={7}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{ mapTypeControl: false }}
        onClick={() => onBranchSelect?.(null)}
      >
        {pinIcon &&
          markers.map((branch) => {
            const branchId = branch._placeId || `${branch.title}-${branch.address}`
            const isActive = selectedBranchId === branch._placeId

            return (
              <MarkerF
                key={branchId}
                position={{ lat: branch.lat, lng: branch.lng }}
                icon={isActive ? pinIconActive : pinIcon}
                zIndex={isActive ? 999 : 1}
                title={branch.title}
                onClick={() => onBranchSelect?.(branch._placeId)}
              />
            )
          })}
      </GoogleMap>
    </div>
  ) : null
}
