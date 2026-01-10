import React from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'

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

  return isLoaded ? (
    <div dir="ltr" style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={israelCenter}
        zoom={7}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{ mapTypeControl: false }}
      />
    </div>
  ) : null
}
