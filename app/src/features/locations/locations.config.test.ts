import { describe, expect, it } from 'vitest'
import { LOCATION_STATUS_COLORS, getLocationColor, getLocationHealth, getLocationIcon, getMostCommonLocationHealth, isLocationActive } from './locations.config.ts'

function timestampAtHour(hour: number) {
  return new Date(Date.UTC(2026, 0, 15, hour, 0, 0)).toISOString()
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

  it('applies thresholds using the sensor-local hour in offset timestamps', () => {
    expect(getLocationHealth(true, '2026-01-15T06:30:00-05:00', 50)).toBe('unhealthy')
    expect(getLocationHealth(true, '2026-01-15T07:00:00-05:00', 50)).toBe('active')
    expect(getLocationHealth(true, '2026-01-15T22:59:00-05:00', 50)).toBe('active')
    expect(getLocationHealth(true, '2026-01-15T23:00:00-05:00', 50)).toBe('unhealthy')
  })
})

describe('getMostCommonLocationHealth', () => {
  it('returns the status with the highest sensor count', () => {
    expect(getMostCommonLocationHealth({ unhealthy: 3, active: 2, inactive: 1 })).toBe('unhealthy')
    expect(getMostCommonLocationHealth({ unhealthy: 1, active: 4, inactive: 2 })).toBe('active')
    expect(getMostCommonLocationHealth({ unhealthy: 1, active: 2, inactive: 3 })).toBe('inactive')
  })

  it('breaks ties by prioritizing unhealthy, then active sensors', () => {
    expect(getMostCommonLocationHealth({ unhealthy: 2, active: 2, inactive: 1 })).toBe('unhealthy')
    expect(getMostCommonLocationHealth({ unhealthy: 0, active: 2, inactive: 2 })).toBe('active')
  })

  it('returns null when there are no sensors', () => {
    expect(getMostCommonLocationHealth({ unhealthy: 0, active: 0, inactive: 0 })).toBeNull()
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

describe('getLocationIcon', () => {
  it('maps each health classification to its status icon', () => {
    expect(getLocationIcon('unhealthy')).toBe('warning')
    expect(getLocationIcon('active')).toBe('sensors')
    expect(getLocationIcon('inactive')).toBe('sensors_off')
  })
})
