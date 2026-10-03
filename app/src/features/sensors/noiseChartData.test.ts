import { describe, expect, it } from 'vitest'
import type { NoiseMeasurement } from './sensors.api.ts'
import { prepareNoiseChartData } from './noiseChartData.ts'

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
