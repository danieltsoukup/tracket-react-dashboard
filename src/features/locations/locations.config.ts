/**
 * @file locations.config.ts
 * @description This file contains the configuration for the locations feature.
 */
import type L from 'leaflet'

export const LOCATION_STATUS_COLORS = {
  active: '#1d9b71',
  inactive: '#8a9691',
} as const

export const LOCATION_MARKER_OPTIONS: Omit<L.CircleMarkerOptions, 'color' | 'fillColor'> = {
  radius: 8,
  fillOpacity: 0.85,
  weight: 2,
}

export const LOCATION_TILE_URL = import.meta.env.STADIA_API_KEY
  ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(import.meta.env.STADIA_API_KEY)}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export const LOCATION_TILE_ATTRIBUTION = import.meta.env.STADIA_API_KEY
  ? '&copy; Stadia Maps, &copy; OpenMapTiles &copy; OpenStreetMap contributors'
  : '&copy; OpenStreetMap contributors'

export function getLocationColor(active: boolean) {
  return active ? LOCATION_STATUS_COLORS.active : LOCATION_STATUS_COLORS.inactive
}