/*
    * Configs used across the app.
*/

export const API_BASE_URL = 'https://api.tracket.info/v1';

export const chartColors = {
  min: '#FDCB80',
  fill: '#FDCB80',
  max: '#FDCB80',
  mean: '#E25100',
  background: '#F4F6F3',
  grid: '#E3E8E4',
  spike: '#718078',
  nightzone: '#E3E8E4',
  alert: '#D64545',
}

export const chartFont = {
  family: 'Inter, sans-serif',
  size: 12,
  color: 'rgb(113, 128, 120)',
  weight: 600,
} as const

export const dayNightIcons = {
  day: 'sunny',
  night: 'bedtime',
} as const