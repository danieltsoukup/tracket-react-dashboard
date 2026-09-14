import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import {
  LOCATION_TILE_ATTRIBUTION,
  LOCATION_TILE_URL,
  getLocationColor,
} from '../locations/locations.config.ts'
import type { Location } from '../locations/locations.types.ts'

type SensorLocationMapProps = {
  location: Location
}

export function SensorLocationMap({ location }: SensorLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const position: L.LatLngExpression = [location.latitude, location.longitude]
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(position, 15)

    L.tileLayer(LOCATION_TILE_URL, { attribution: LOCATION_TILE_ATTRIBUTION }).addTo(map)

    const color = getLocationColor(location.active, location.hourEnd, location.hourMean)
    const radius = L.circle(position, {
      color,
      fillColor: color,
      radius: Math.max(50, location.radius),
      fillOpacity: 0.25,
      weight: 2,
    }).addTo(map)

    map.fitBounds(radius.getBounds(), { padding: [28, 28], maxZoom: 16 })

    return () => {
      map.remove()
    }
  }, [location])

  return <div ref={mapContainerRef} className="sensor-location-map" aria-label={`Map showing ${location.label}`} />
}
