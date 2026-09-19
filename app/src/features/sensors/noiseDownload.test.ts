import { describe, expect, it } from 'vitest'
import type { NoiseMeasurement } from './sensors.api.ts'
import { getNoiseDownloadFilename, measurementsToCsv } from './noiseDownload.ts'

const measurements: NoiseMeasurement[] = [
  {
    timestamp: '2026-09-13T12:00:00.000Z',
    min: 35,
    max: 60,
    mean: 48,
  },
]

describe('measurementsToCsv', () => {
  it('serializes the chart measurements with a header', () => {
    expect(measurementsToCsv(measurements)).toBe(
      'timestamp,min,max,mean\n2026-09-13T12:00:00.000Z,35,60,48',
    )
  })

  it('serializes an empty dataset with only the header', () => {
    expect(measurementsToCsv([])).toBe('timestamp,min,max,mean')
  })
})

describe('getNoiseDownloadFilename', () => {
  it('includes the active granularity and chart range', () => {
    expect(getNoiseDownloadFilename('raw', '2026-09-09', '2026-09-13')).toBe(
      'noise-raw-2026-09-09-2026-09-13.csv',
    )
  })
})