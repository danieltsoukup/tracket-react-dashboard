/**
 * @file LocationsPage.tsx
 * @description This file contains the main page component for displaying sensor locations on the map.
 */
import '../../index.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import 'leaflet.markercluster'
import { useEffect, useRef, useState } from 'react'
import {
  LOCATION_MARKER_OPTIONS,
  LOCATION_STATUS_COLORS,
  LOCATION_TILE_ATTRIBUTION,
  LOCATION_TILE_URL,
  getLocationColor,
  getLocationHealth,
  isLocationActive,
  type LocationHealth,
} from './locations.config.ts'
import { fetchLocations } from './locations.api.ts'
import { LocationsOverlay } from './LocationsOverlay.tsx'
import type { Location } from './locations.types.ts'
import { formatSensorTimestamp } from '../../utils/sensorLocalTime.ts'

type LocationMarker = L.CircleMarker & {
  locationActive: boolean
  locationHourEnd: string
  locationHourMean: number
}

const INITIAL_MAP_CENTER: L.LatLngExpression = [43.6532, -79.3832]
const INITIAL_MAP_ZOOM = 3
const measurementDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatMeasurementDate(timestamp: string) {
  return formatSensorTimestamp(timestamp, measurementDateFormatter)
}

function getLocationInfo(location: Location) {
  const color = getLocationColor(location.active, location.hourEnd, location.hourMean)
  const meanNoise = location.hourMean.toFixed(1)
  const sensorIcon = location.active ? 'sensors' : 'sensors_off'

  return `<div class="location-tooltip__label"><span class="material-symbols-outlined" style="color: ${color}" aria-hidden="true">${sensorIcon}</span><span class="location-tooltip__title">${location.label}</span></div><div class="location-tooltip__value" style="color: ${color}">${meanNoise} dB</div><div class="location-tooltip__timestamp">${formatMeasurementDate(location.hourEnd)}</div>`
}

function LocationsPage() {
  /**
   * Component for displaying the list of sensor locations.
   */
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<Record<LocationHealth, boolean>>({
    unhealthy: true,
    active: true,
    inactive: false,
  })
  const [viewportBounds, setViewportBounds] = useState<L.LatLngBounds | null>(null)
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
        const now = Date.now()
        setLocations(loadedLocations.map((location) => ({
          ...location,
          active: isLocationActive(location.latestTimestamp, now),
        })))
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

    const clusterOptions: L.MarkerClusterGroupOptions = {
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const childMarkers = cluster.getAllChildMarkers() as unknown as LocationMarker[]
        const hasActiveLocation = childMarkers.some(
          (marker) => getLocationHealth(marker.locationActive, marker.locationHourEnd, marker.locationHourMean) === 'active',
        )
        const hasAlertLocation = childMarkers.some(
          (marker) => getLocationHealth(marker.locationActive, marker.locationHourEnd, marker.locationHourMean) === 'unhealthy',
        )
        const color = hasAlertLocation
          ? LOCATION_STATUS_COLORS.alert
          : hasActiveLocation
            ? LOCATION_STATUS_COLORS.active
            : LOCATION_STATUS_COLORS.inactive

        return L.divIcon({
          className: `marker-cluster marker-cluster-small location-cluster--${hasAlertLocation ? 'alert' : hasActiveLocation ? 'active' : 'inactive'}`,
          html: `<div style="background-color: ${color}"><span>${cluster.getChildCount()}</span></div>`,
          iconSize: [40, 40],
        })
      },
    }
    const markers = L.markerClusterGroup(clusterOptions).addTo(map)

    mapRef.current = map
    markersRef.current = markers

    const updateViewportBounds = () => setViewportBounds(map.getBounds())
    const handleWindowResize = () => {
      map.invalidateSize({ pan: false })
      updateViewportBounds()
    }

    map.on('moveend', updateViewportBounds)
    map.on('zoomend', updateViewportBounds)
    window.addEventListener('resize', handleWindowResize)
    updateViewportBounds()

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    /**
     * Update the markers on the map based on the current list of locations and selected health filters.
     */
    const map = mapRef.current
    const markers = markersRef.current

    if (!map || !markers) {
      return
    }

    markers.clearLayers()

    const bounds = L.latLngBounds([])
    locations.forEach((location) => {
      const health = getLocationHealth(location.active, location.hourEnd, location.hourMean)

      if (!selectedStatuses[health]) {
        return
      }

      const position: L.LatLngExpression = [location.latitude, location.longitude]
      const color = getLocationColor(location.active, location.hourEnd, location.hourMean)

      const marker = L.circleMarker(position, {
        ...LOCATION_MARKER_OPTIONS,
        color,
        fillColor: color,
      }) as LocationMarker

      marker.locationActive = location.active
      marker.locationHourEnd = location.hourEnd
      marker.locationHourMean = location.hourMean

      marker
        .bindTooltip(getLocationInfo(location), {
          className: 'location-tooltip',
          direction: 'top',
          offset: [0, -8],
        })
        .on('click', () => window.open(`/locations/${location.id}`, '_blank', 'noopener,noreferrer'))
        .addTo(markers)

      bounds.extend(position)
    })

  }, [locations, selectedStatuses])

  function resetMapView() {
    mapRef.current?.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM)
  }

  function toggleStatus(status: LocationHealth) {
    setSelectedStatuses((current) => ({
      ...current,
      [status]: !current[status],
    }))
  }

  const locationCounts = locations.reduce<Record<LocationHealth, number>>(
    (counts, location) => {
      const health = getLocationHealth(location.active, location.hourEnd, location.hourMean)
      counts[health] += 1
      return counts
    },
    { unhealthy: 0, active: 0, inactive: 0 },
  )
  const visibleLocations = viewportBounds
    ? locations.filter((location) => {
      const health = getLocationHealth(location.active, location.hourEnd, location.hourMean)
      return selectedStatuses[health] && viewportBounds.contains([location.latitude, location.longitude])
    })
    : []
  const visibleMeanAverage = visibleLocations.length > 0
    ? visibleLocations.reduce((total, location) => total + location.hourMean, 0) / visibleLocations.length
    : null

  return (
    <main className="map-page">
      <div ref={mapContainerRef} className="location-map" aria-label="Sensor locations map" />
      <LocationsOverlay
        unhealthy={locationCounts.unhealthy}
        active={locationCounts.active}
        inactive={locationCounts.inactive}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        isLoading={isLoading}
        error={error}
        onResetMap={resetMapView}
        averageMean={visibleMeanAverage}
        visibleSensorCount={visibleLocations.length}
      />
    </main>
  )
}

export default LocationsPage
