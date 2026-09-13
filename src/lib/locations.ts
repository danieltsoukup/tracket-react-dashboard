/**
 * @file locations.ts
 * @description This file contains the functions and types for fetching sensor locations from the API.
 */
import { getLocationColor } from '../features/locations/locations.config.ts'

export const LOCATIONS_API_URL = 'https://api.tracket.info/v1/locations'

export type Location = {
  /**
   * Sensor location object.
   */
  id: number
  label: string
  latitude: number
  longitude: number
  radius: number
  active: boolean
  lastChecked: string
  latestTimestamp: string
  hourStart: string
  hourEnd: string
  hourMin: number
  hourMax: number
  hourMean: number
}

type LocationsResponse = {
  /**
   * Response object from the locations API.
   */
  locations: Location[]
}

const measurementDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatMeasurementDate(timestamp: string) {
  const date = new Date(timestamp)

  return Number.isNaN(date.getTime()) ? timestamp : measurementDateFormatter.format(date)
}

export function getLocationInfo(location: Location) {
  /**
   * Get the HTML content for a location marker tooltip.
   */
  const color = getLocationColor(location.active)
  const meanNoise = location.hourMean.toFixed(1)
  const sensorIcon = location.active ? 'sensors' : 'sensors_off'

  return `<div class="location-tooltip__label"><span class="material-symbols-outlined" style="color: ${color}" aria-hidden="true">${sensorIcon}</span><span class="location-tooltip__title">${location.label}</span></div><div class="location-tooltip__value" style="color: ${color}">${meanNoise} dB</div><div class="location-tooltip__timestamp">${formatMeasurementDate(location.latestTimestamp)}</div>`
}

function isLocation(value: unknown): value is Location {
  /**
   * Check if value is a proper Location object.
   */
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const location = value as Record<string, unknown>

  return (
    typeof location.id === 'number' &&
    typeof location.label === 'string' &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    typeof location.radius === 'number' &&
    typeof location.active === 'boolean' &&
    typeof location.lastChecked === 'string' &&
    typeof location.latestTimestamp === 'string' &&
    typeof location.hourStart === 'string' &&
    typeof location.hourEnd === 'string' &&
    typeof location.hourMin === 'number' &&
    typeof location.hourMax === 'number' &&
    typeof location.hourMean === 'number'
  )
}

function isLocationsResponse(value: unknown): value is LocationsResponse {
  /**
   * Check if value is a proper LocationsResponse object
   * by verifying every element is a Location.
   */
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>
  return Array.isArray(response.locations) && response.locations.every(isLocation)
}

export async function fetchLocations(signal?: AbortSignal): Promise<Location[]> {
  /**
   * Fetch the list of sensor locations from the API.
   */
  const response = await fetch(LOCATIONS_API_URL, { signal })

  if (!response.ok) {
    throw new Error(`Unable to load locations (${response.status})`)
  }

  const data: unknown = await response.json()

  if (!isLocationsResponse(data)) {
    throw new Error('The locations API returned an unexpected response.')
  }

  return data.locations
}