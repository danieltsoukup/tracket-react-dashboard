import { describe, expect, it } from 'vitest'
import { prepareHourlyProfileData } from './hourlyProfileData.ts'
import type { NoiseMeasurement } from './sensors.api.ts'

describe('prepareHourlyProfileData', () => {
  it('averages min, max, and mean values for each sensor-local hour', () => {
    const measurements: NoiseMeasurement[] = [
      { timestamp: '2026-10-10T02:15:00+02:00', min: 20, max: 40, mean: 30 },
      { timestamp: '2026-10-11T02:15:00+02:00', min: 24, max: 44, mean: 34 },
      { timestamp: '2026-10-11T14:15:00+02:00', min: 10, max: 30, mean: 20 },
    ]

    const profile = prepareHourlyProfileData(measurements)

    expect(profile).toHaveLength(24)
    expect(profile[2]).toEqual({ hour: 2, min: 22, max: 42, mean: 32, count: 2 })
    expect(profile[14]).toEqual({ hour: 14, min: 10, max: 30, mean: 20, count: 1 })
    expect(profile[0]).toEqual({ hour: 0, min: null, max: null, mean: null, count: 0 })
  })

  it('returns empty hours when there are no measurements', () => {
    const profile = prepareHourlyProfileData([])

    expect(profile).toHaveLength(24)
    expect(profile.every((point) => point.count === 0)).toBe(true)
  })
})
