/**
 * @file locations.ts
 * @description This file contains the functions and types for fetching sensor locations from the API.
 */
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
  locations: Location[]
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