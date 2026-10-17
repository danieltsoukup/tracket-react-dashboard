import { describe, expect, it } from 'vitest'
import { correctLocationTimestamp } from './locationTimezoneCorrection.ts'

describe('correctLocationTimestamp', () => {
  it('converts Eastern winter timestamps to the configured location time zones', () => {
    const timestamp = '2026-01-15T12:30:00.123Z'

    expect(correctLocationTimestamp(3162198, timestamp)).toBe('2026-01-15T09:30:00.123-08:00')
    expect(correctLocationTimestamp(3270474, timestamp)).toBe('2026-01-15T17:30:00.123+00:00')
    expect(correctLocationTimestamp(3495893, timestamp)).toBe('2026-01-15T11:30:00.123-06:00')
  })

  it('accounts for daylight saving time in both source and destination zones', () => {
    const timestamp = '2026-07-15T12:30:00-04:00'

    expect(correctLocationTimestamp(3162198, timestamp)).toBe('2026-07-15T09:30:00-07:00')
    expect(correctLocationTimestamp(3270474, timestamp)).toBe('2026-07-15T17:30:00+01:00')
    expect(correctLocationTimestamp(3495893, timestamp)).toBe('2026-07-15T11:30:00-05:00')
  })

  it('leaves other locations and invalid timestamps unchanged', () => {
    const timestamp = '2026-01-15T12:30:00Z'

    expect(correctLocationTimestamp(1, timestamp)).toBe(timestamp)
    expect(correctLocationTimestamp(3162198, 'not-a-timestamp')).toBe('not-a-timestamp')
  })
})
