import { describe, expect, it } from 'vitest'
import { LOCATION_STATUS_COLORS, getLocationColor, getLocationHealth, isLocationActive } from './locations.config.ts'

function timestampAtHour(hour: number) {
  return new Date(2026, 0, 15, hour, 0, 0).toISOString()
}

describe('getLocationHealth', () => {
  it('keeps inactive sensors inactive regardless of noise level', () => {
    expect(getLocationHealth(false, timestampAtHour(12), 100)).toBe('inactive')
  })

  it('classifies daytime readings above 55 dB as unhealthy', () => {
    expect(getLocationHealth(true, timestampAtHour(7), 55.1)).toBe('unhealthy')
    expect(getLocationHealth(true, timestampAtHour(22), 55.1)).toBe('unhealthy')
  })

  it('classifies daytime readings at or below 55 dB as active', () => {
    expect(getLocationHealth(true, timestampAtHour(7), 55)).toBe('active')
    expect(getLocationHealth(true, timestampAtHour(12), 40)).toBe('active')
  })

  it('classifies nighttime readings above 40 dB as unhealthy', () => {
    expect(getLocationHealth(true, timestampAtHour(23), 40.1)).toBe('unhealthy')
    expect(getLocationHealth(true, timestampAtHour(6), 40.1)).toBe('unhealthy')
  })

  it('classifies nighttime readings at or below 40 dB as active', () => {
    expect(getLocationHealth(true, timestampAtHour(23), 40)).toBe('active')
    expect(getLocationHealth(true, timestampAtHour(6), 40)).toBe('active')
  })
})

describe('isLocationActive', () => {
  const now = new Date('2026-09-27T12:00:00.000Z').getTime()

  it('returns true for timestamps within the last 24 hours, including the cutoff', () => {
    expect(isLocationActive('2026-09-27T11:00:00.000Z', now)).toBe(true)
    expect(isLocationActive('2026-09-26T12:00:00.000Z', now)).toBe(true)
  })

  it('returns false for stale, future, or invalid timestamps', () => {
    expect(isLocationActive('2026-09-26T11:59:59.999Z', now)).toBe(false)
    expect(isLocationActive('2026-09-27T12:00:00.001Z', now)).toBe(false)
    expect(isLocationActive('invalid timestamp', now)).toBe(false)
  })
})

describe('getLocationColor', () => {
  it('maps each health classification to its configured color', () => {
    expect(getLocationColor(false, timestampAtHour(12), 0)).toBe(LOCATION_STATUS_COLORS.inactive)
    expect(getLocationColor(true, timestampAtHour(12), 55)).toBe(LOCATION_STATUS_COLORS.active)
    expect(getLocationColor(true, timestampAtHour(12), 55.1)).toBe(LOCATION_STATUS_COLORS.alert)
  })
})
