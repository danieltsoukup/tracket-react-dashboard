/**
 * @file locations.config.ts
 * @description This file contains the configuration for the locations feature.
 */
import type L from 'leaflet'

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

const stadiaApiKey = import.meta.env.STADIA_API_KEY

export const LOCATION_TILE_URL = `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png${
  stadiaApiKey ? `?api_key=${encodeURIComponent(stadiaApiKey)}` : ''
}`

export const LOCATION_TILE_ATTRIBUTION = '&copy; Stadia Maps, &copy; OpenMapTiles &copy; OpenStreetMap contributors'

export type LocationHealth = 'unhealthy' | 'active' | 'inactive'

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

  const hour = new Date(hourEnd).getHours()
  const threshold = hour >= 7 && hour < 23 ? 55 : 40

  return hourMean > threshold ? 'unhealthy' : 'active'
}

export function getLocationColor(active: boolean, hourEnd: string, hourMean: number) {
  /**
   * Get the color for a location marker based on its health classification.
   */
  const health = getLocationHealth(active, hourEnd, hourMean)

  return LOCATION_STATUS_COLORS[health === 'unhealthy' ? 'alert' : health]
}