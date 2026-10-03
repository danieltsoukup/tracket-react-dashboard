import { describe, expect, it } from 'vitest'
import {
  formatSensorTimestamp,
  getSensorLocalDate,
  getSensorLocalHour,
  shiftSensorLocalDate,
  shiftSensorLocalTimestamp,
  toSensorLocalPlotTimestamp,
  toSensorLocalTimestamp,
} from './sensorLocalTime.ts'

describe('sensor-local timestamp helpers', () => {
  const timestamp = '2026-01-15T06:30:45.123-05:00'

  it('reads the timestamp date and hour without converting to browser time', () => {
    expect(getSensorLocalDate(timestamp)).toBe('2026-01-15')
    expect(getSensorLocalHour(timestamp)).toBe(6)
  })

  it('formats the sensor wall time independent of the browser timezone', () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })

    expect(formatSensorTimestamp(timestamp, formatter)).toBe('01/15/2026, 06:30')
  })

  it('uses calendar-day arithmetic and the sensor timestamp offset for query bounds', () => {
    expect(shiftSensorLocalDate(timestamp, -4)).toBe('2026-01-11')
    expect(shiftSensorLocalTimestamp(timestamp, -4)).toBe('2026-01-11T06:30:45.123-05:00')
    expect(toSensorLocalTimestamp('2026-01-11', '00:00:00', timestamp)).toBe('2026-01-11T00:00:00-05:00')
    expect(toSensorLocalTimestamp('2026-01-15', '23:59:00', timestamp)).toBe('2026-01-15T23:59:00-05:00')
  })

  it('converts chart timestamps to the sensor wall time without an offset', () => {
    expect(toSensorLocalPlotTimestamp(timestamp)).toBe('2026-01-15T06:30:45.123')
  })

  it('rejects invalid sensor timestamps for local date and hour calculations', () => {
    expect(getSensorLocalDate('not-a-date')).toBe('')
    expect(getSensorLocalHour('not-a-date')).toBeNull()
    expect(shiftSensorLocalDate('not-a-date', -4)).toBe('')
    expect(toSensorLocalTimestamp('2026-01-15', '00:00:00', 'not-a-date')).toBeUndefined()
  })
})
