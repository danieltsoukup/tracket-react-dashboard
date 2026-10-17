/**
 * @file locations.ts
 * @description This file contains the functions and types for fetching sensor locations from the API.
 */
import type { Location } from './locations.types.ts'
import { API_BASE_URL } from '../config.ts'

export const LOCATIONS_API_URL = `${API_BASE_URL}/locations`

export type { Location } from './locations.types.ts'

type LocationsResponse = {
  /**
   * Response object from the locations API.
   */
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

export async function fetchLocation(locationId: number, signal?: AbortSignal): Promise<Location> {
  const response = await fetch(`${LOCATIONS_API_URL}/${encodeURIComponent(String(locationId))}`, { signal })

  if (!response.ok) {
    throw new Error(`Unable to load location (${response.status})`)
  }

  const data: unknown = await response.json()

  if (!isLocationsResponse(data) || data.locations.length !== 1) {
    throw new Error('The location API returned an unexpected response.')
  }

  console.log(`Fetched location ${locationId}: ${data.locations[0].label}`)
  return data.locations[0]
}