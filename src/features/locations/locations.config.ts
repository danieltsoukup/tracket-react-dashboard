/**
 * @file locations.config.ts
 * @description This file contains the configuration for the locations feature.
 */
import type L from 'leaflet'

export const LOCATION_STATUS_COLORS = {
  active: '#FB9500',
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

export function getLocationColor(active: boolean) {
  /**
   * Get the color for a location marker based on its active status.
   */
  return active ? LOCATION_STATUS_COLORS.active : LOCATION_STATUS_COLORS.inactive
}