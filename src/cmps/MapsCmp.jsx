import React from 'react'
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api'
import pinPng from '../assets/styles/img/pin.png'

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const israelCenter = { lat: 31.0461, lng: 34.8516 }

const loaderOptions = {
  id: 'google-map-script',
  googleMapsApiKey: apiKey,
  language: 'he',
  region: 'IL',
}

export function MyComponent({ selectedRegion }) {
  const { isLoaded } = useJsApiLoader(loaderOptions)

  const mapRef = React.useRef(null)
  const [isMapReady, setIsMapReady] = React.useState(false)

  const [activeBranch, setActiveBranch] = React.useState(null)

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

  // סניפים להצגה: של האזור הנבחר
  const branches = selectedRegion?.branches ?? []

  // המרה בטוחה: גם אם lat/lng מגיעים כמחרוזות
  const markers = React.useMemo(() => {
    return (branches ?? [])
      .map((b) => {
        const lat = typeof b.lat === 'string' ? parseFloat(b.lat) : b.lat
        const lng = typeof b.lng === 'string' ? parseFloat(b.lng) : b.lng
        return { ...b, lat, lng }
      })
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
  }, [branches])

  // דיבאג קצר (אפשר למחוק אחרי שמופיע)
  React.useEffect(() => {
    // אם אתה לא רואה נעצים, זה יגיד לך אם מגיעים קואורדינטות בכלל
    console.log('selectedRegion:', selectedRegion?.id)
    console.log('branches:', branches?.length, branches?.[0])
    console.log('markers:', markers.length)
  }, [selectedRegion, branches, markers])

  // אייקון הנעץ
  const pinIcon = React.useMemo(() => {
    if (!isLoaded || !window.google) return null
    return {
      url: pinPng,
      scaledSize: new window.google.maps.Size(44, 54),
      anchor: new window.google.maps.Point(22, 54), // “מחט” למטה באמצע
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
        onClick={() => setActiveBranch(null)}
      >
        {pinIcon &&
          markers.map((b) => (
            <MarkerF
              key={`${b.title}-${b.address}`}
              position={{ lat: b.lat, lng: b.lng }}
              icon={pinIcon}
              title={b.title}
              onClick={() => setActiveBranch(b)}
            />
          ))}

        {activeBranch && Number.isFinite(activeBranch.lat) && Number.isFinite(activeBranch.lng) && (
          <InfoWindowF
            position={{ lat: activeBranch.lat, lng: activeBranch.lng }}
            onCloseClick={() => setActiveBranch(null)}
          >
            <div style={{ direction: 'rtl', minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>{activeBranch.title}</div>
              <div style={{ marginTop: 4 }}>{activeBranch.address}</div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  ) : null
}
