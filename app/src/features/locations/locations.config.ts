/**
 * @file locations.config.ts
 * @description This file contains the configuration for the locations feature.
 */
import type L from 'leaflet'
import { getSensorLocalHour } from '../../utils/sensorLocalTime.ts'

export const LOCATION_STATUS_COLORS = {
  active: '#FB9500',
  alert: '#D64545',
  inactive: '#8a9691',
} as const

export const LOCATION_MARKER_OPTIONS: Omit<L.CircleMarkerOptions, 'color' | 'fillColor'> = {
  radius: 8,
  fillOpacity: 0.85,
  weight: 2,
}

const stadiaApiKey = import.meta.env.DEV
  ? import.meta.env.VITE_STADIA_API_KEY
  : undefined

export const LOCATION_TILE_URL =
  `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png` +
  (stadiaApiKey
    ? `?api_key=${encodeURIComponent(stadiaApiKey)}`
    : '')

export const LOCATION_TILE_ATTRIBUTION = '&copy; Stadia Maps, &copy; OpenMapTiles &copy; OpenStreetMap contributors'

export type LocationHealth = 'unhealthy' | 'active' | 'inactive'

export function getMostCommonLocationHealth(counts: Record<LocationHealth, number>): LocationHealth | null {
  const healthPriority: LocationHealth[] = ['unhealthy', 'active', 'inactive']
  const highestCount = Math.max(...healthPriority.map((health) => counts[health]))

  return highestCount > 0
    ? healthPriority.find((health) => counts[health] === highestCount) ?? null
    : null
}

const LOCATION_STATUS_ICONS: Record<LocationHealth, string> = {
  unhealthy: 'sensors',
  active: 'sensors',
  inactive: 'sensors_off',
}

export function getLocationIcon(health: LocationHealth): string {
  return LOCATION_STATUS_ICONS[health]
}

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000

export function isLocationActive(latestTimestamp: string, now = Date.now()): boolean {
  const timestamp = new Date(latestTimestamp).getTime()

  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp <= ACTIVE_WINDOW_MS
}

export const LOCATION_HEALTH_THRESHOLDS = {
  daytime: 55,
  nighttime: 40,
}

export const LOCATION_HEALTH_HOURS = {
  daytimeStart: 7,
  daytimeEnd: 23,
}


export function getLocationHealth(active: boolean, hourEnd: string, hourMean: number): LocationHealth {
  /**
   * Classify a location based on its active status and noise level.
   * Active sensors are red when hourMean is above 55 dB from 07:00 through
   * 22:59, or above 40 dB from 23:00 through 06:59. Inactive sensors remain
   * inactive regardless of their noise level.
   */
  if (!active) {
    return 'inactive'
  }

  const hour = getSensorLocalHour(hourEnd)
  const threshold = hour !== null && hour >= LOCATION_HEALTH_HOURS.daytimeStart && hour < LOCATION_HEALTH_HOURS.daytimeEnd ? LOCATION_HEALTH_THRESHOLDS.daytime : LOCATION_HEALTH_THRESHOLDS.nighttime

  return hourMean > threshold ? 'unhealthy' : 'active'
}

export function getLocationColor(active: boolean, hourEnd: string, hourMean: number) {
  /**
   * Get the color for a location marker based on its health classification.
   */
  const health = getLocationHealth(active, hourEnd, hourMean)

  return LOCATION_STATUS_COLORS[health === 'unhealthy' ? 'alert' : health]
}