import { describe, expect, it } from 'vitest'
import type { NoiseMeasurement } from './sensors.api.ts'
import {
  getMaximumNoiseLevelInRange,
  getMeanAboveHealthLimitPercentagesInRange,
  prepareNoiseChartData,
} from './noiseChartData.ts'

function measurement(timestamp: string, value: number): NoiseMeasurement {
  return {
    timestamp,
    min: value - 5,
    max: value + 5,
    mean: value,
  }
}

describe('prepareNoiseChartData', () => {
  it('keeps regularly sampled measurements in one range segment', () => {
    const measurements = [
      measurement('2026-09-13T12:00:00.000Z', 40),
      measurement('2026-09-13T12:01:00.000Z', 41),
      measurement('2026-09-13T12:02:00.000Z', 42),
    ]

    const chartData = prepareNoiseChartData(measurements)

    expect(chartData.points.map((point) => point.measurement)).toEqual(measurements)
    expect(chartData.rangeSegments).toEqual([
      {
        timestamps: [
          '2026-09-13T12:00:00.000',
          '2026-09-13T12:01:00.000',
          '2026-09-13T12:02:00.000',
        ],
        minimum: [35, 36, 37],
        maximum: [45, 46, 47],
      },
    ])
  })

  it('inserts a line break and separates filled range segments after a sampling gap', () => {
    const measurements = [
      measurement('2026-09-13T12:00:00.000Z', 40),
      measurement('2026-09-13T12:05:00.000Z', 41),
      measurement('2026-09-13T12:20:00.000Z', 42),
      measurement('2026-09-13T12:25:00.000Z', 43),
    ]

    const chartData = prepareNoiseChartData(measurements)

    expect(chartData.points.map((point) => point.measurement)).toEqual([
      measurements[0],
      measurements[1],
      null,
      measurements[2],
      measurements[3],
    ])
    expect(chartData.rangeSegments).toEqual([
      {
        timestamps: ['2026-09-13T12:00:00.000', '2026-09-13T12:05:00.000'],
        minimum: [35, 36],
        maximum: [45, 46],
      },
      {
        timestamps: ['2026-09-13T12:20:00.000', '2026-09-13T12:25:00.000'],
        minimum: [37, 38],
        maximum: [47, 48],
      },
    ])
  })

  it('handles an empty dataset', () => {
    expect(prepareNoiseChartData([])).toEqual({ points: [], rangeSegments: [] })
  })
})

describe('getMaximumNoiseLevelInRange', () => {
  it('uses plotted sensor-local timestamps when finding the visible maximum', () => {
    const chartData = prepareNoiseChartData([
      measurement('2026-09-13T22:50:00-04:00', 40),
      measurement('2026-09-13T23:50:00-04:00', 80),
    ])

    expect(
      getMaximumNoiseLevelInRange(
        chartData.points,
        Date.parse('2026-09-13T00:00:00Z'),
        Date.parse('2026-09-14T00:00:00Z'),
      ),
    ).toBe(85)
  })

  it('includes a measurement at the visible range end and excludes later measurements', () => {
    const points = prepareNoiseChartData([
      measurement('2026-09-13T23:59:00Z', 40),
      measurement('2026-09-14T00:00:00Z', 80),
      measurement('2026-09-14T00:01:00Z', 100),
    ]).points

    expect(
      getMaximumNoiseLevelInRange(
        points,
        Date.parse('2026-09-13T00:00:00Z'),
        Date.parse('2026-09-14T00:00:00Z'),
      ),
    ).toBe(85)
  })
})

describe('getMeanAboveHealthLimitPercentagesInRange', () => {
  it('calculates separate daytime and nighttime rates using their respective limits', () => {
    const points = prepareNoiseChartData([
      measurement('2026-09-13T06:00:00Z', 41),
      measurement('2026-09-13T07:00:00Z', 56),
      measurement('2026-09-13T22:00:00Z', 55),
      measurement('2026-09-13T23:00:00Z', 40.1),
      measurement('2026-09-14T00:00:00Z', 80),
    ]).points

    expect(
      getMeanAboveHealthLimitPercentagesInRange(
        points,
        Date.parse('2026-09-13T00:00:00Z'),
        Date.parse('2026-09-13T23:00:00Z'),
      ),
    ).toEqual({ daytime: 50, nighttime: 100 })
  })

  it('returns null rates for an empty visible range or invalid range bounds', () => {
    const points = prepareNoiseChartData([measurement('2026-09-13T12:00:00Z', 60)]).points

    expect(
      getMeanAboveHealthLimitPercentagesInRange(
        points,
        Date.parse('2026-09-14T00:00:00Z'),
        Date.parse('2026-09-15T00:00:00Z'),
      ),
    ).toEqual({ daytime: null, nighttime: null })
    expect(getMeanAboveHealthLimitPercentagesInRange(points, Number.NaN, 0))
      .toEqual({ daytime: null, nighttime: null })
  })

  it('excludes inserted gap points and includes measurements at the range boundaries', () => {
    const points = prepareNoiseChartData([
      measurement('2026-09-13T12:00:00Z', 60),
      measurement('2026-09-13T12:01:00Z', 40),
    ]).points

    expect(
      getMeanAboveHealthLimitPercentagesInRange(
        points,
        Date.parse('2026-09-13T12:00:00Z'),
        Date.parse('2026-09-13T12:01:00Z'),
      ),
    ).toEqual({ daytime: 50, nighttime: null })
  })
})
