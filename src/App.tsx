/**
 * @file App.tsx
 * @description This file contains the main application component for the tRacket dashboard.
 */
import './index.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import 'leaflet.markercluster'
import { useEffect, useRef, useState } from 'react'
import {
  LOCATION_MARKER_OPTIONS,
  LOCATION_TILE_ATTRIBUTION,
  LOCATION_TILE_URL,
  getLocationColor,
} from './features/locations/locations.config.ts'
import { fetchLocations, getLocationInfo, type Location } from './lib/locations.ts'

type LocationMarker = L.CircleMarker & {
  locationActive: boolean
}

const INITIAL_MAP_CENTER: L.LatLngExpression = [43.6532, -79.3832]
const INITIAL_MAP_ZOOM = 3

function LocationsPage() {
  /**
   * Component for displaying the list of sensor locations.
   */
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    /**
     * Fetch the list of sensor locations from the API and update the component state.
     */
    setIsLoading(true)
    setError(null)
    const controller = new AbortController()
    let isCurrentRequest = true

    fetchLocations(controller.signal)
      .then((loadedLocations) => {
        if (!isCurrentRequest) {
          return
        }

        console.info(`Loaded ${loadedLocations.length} locations.`)
        setLocations(loadedLocations)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load locations.')
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    /**
     * Initialize the Leaflet map and set up the tile layer and markers.
     */
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM)

    L.tileLayer(LOCATION_TILE_URL, { attribution: LOCATION_TILE_ATTRIBUTION }).addTo(map)

    mapRef.current = map
    markersRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const hasActiveLocation = cluster
          .getAllChildMarkers()
          .some((marker) => (marker as unknown as LocationMarker).locationActive)
        const color = getLocationColor(hasActiveLocation)

        return L.divIcon({
          className: `marker-cluster marker-cluster-small location-cluster--${hasActiveLocation ? 'active' : 'inactive'}`,
          html: `<div style="background-color: ${color}"><span>${cluster.getChildCount()}</span></div>`,
          iconSize: [40, 40],
        })
      },
    }).addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    /**
     * Update the markers on the map based on the current list of locations.
     */
    const map = mapRef.current
    const markers = markersRef.current

    if (!map || !markers) {
      return
    }

    markers.clearLayers()

    const bounds = L.latLngBounds([])
    locations.forEach((location) => {
      const position: L.LatLngExpression = [location.latitude, location.longitude]
      const color = getLocationColor(location.active)

      const marker = L.circleMarker(position, {
        ...LOCATION_MARKER_OPTIONS,
        color,
        fillColor: color,
      }) as LocationMarker

      marker.locationActive = location.active
      marker
        .bindTooltip(getLocationInfo(location), {
          className: 'location-tooltip',
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(markers)

      bounds.extend(position)
    })

    if (locations.length > 0) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 })
    }
  }, [locations])

  function resetMapView() {
    mapRef.current?.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM)
  }

  return (
    <main className="map-page">
      <div ref={mapContainerRef} className="location-map" aria-label="Sensor locations map" />
      <button
        className="map-reset-button"
        type="button"
        aria-label="Reset map view"
        title="Reset map view"
        onClick={resetMapView}
      >
        <span className="material-symbols-outlined" aria-hidden="true">public</span>
      </button>
      <div className="map-status" aria-live="polite">
        {isLoading && <span>Loading locations...</span>}
        {error && <span className="map-status--error">{error}</span>}
        {!isLoading && !error && locations.length > 0 && (
          <span>{locations.length} locations loaded</span>
        )}
      </div>
    </main>
  )
}

function App() {
  return (
    <>
      <LocationsPage />
    </>
  )
}

export default App
