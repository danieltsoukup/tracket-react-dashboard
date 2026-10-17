import type { NoiseMeasurement } from './sensors.api.ts'
import { toSensorLocalPlotTimestamp } from '../../utils/sensorLocalTime.ts'

export type NoiseChartPoint = {
  timestamp: string
  measurement: NoiseMeasurement | null
}

export type NoiseRangeSegment = {
  timestamps: string[]
  minimum: number[]
  maximum: number[]
}

export type NoiseChartData = {
  points: NoiseChartPoint[]
  rangeSegments: NoiseRangeSegment[]
}

export function getMaximumNoiseLevelInRange(
  points: NoiseChartPoint[],
  rangeStart: number,
  rangeEnd: number,
): number | null {
  /*
    * Returns the maximum noise level in the given range of timestamps.
  */
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd < rangeStart) {
    return null
  }

  return points.reduce<number | null>((largest, point) => {
    if (!point.measurement) {
      return largest
    }

    const timestamp = Date.parse(point.timestamp)
    if (!Number.isFinite(timestamp) || timestamp < rangeStart || timestamp > rangeEnd) {
      return largest
    }

    return largest === null ? point.measurement.max : Math.max(largest, point.measurement.max)
  }, null)
}

export function prepareNoiseChartData(measurements: NoiseMeasurement[]): NoiseChartData {
  const intervals = measurements
    .slice(1)
    .map((measurement, index) => Date.parse(measurement.timestamp) - Date.parse(measurements[index].timestamp))
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((a, b) => a - b)
  const typicalInterval = intervals.length > 0 ? intervals[Math.floor((intervals.length - 1) / 2)] : null
  const points: NoiseChartPoint[] = []

  measurements.forEach((measurement, index) => {
    const previousMeasurement = measurements[index - 1]
    const interval = previousMeasurement
      ? Date.parse(measurement.timestamp) - Date.parse(previousMeasurement.timestamp)
      : 0
    const timestamp = toSensorLocalPlotTimestamp(measurement.timestamp)

    if (typicalInterval !== null && interval > typicalInterval * 1.5) {
      points.push({ timestamp, measurement: null })
    }

    points.push({ timestamp, measurement })
  })

  const rangeSegments: NoiseRangeSegment[] = []
  let segmentTimestamps: string[] = []
  let minimum: number[] = []
  let maximum: number[] = []

  function addRangeSegment() {
    if (segmentTimestamps.length === 0) {
      return
    }

    rangeSegments.push({ timestamps: segmentTimestamps, minimum, maximum })
    segmentTimestamps = []
    minimum = []
    maximum = []
  }

  points.forEach(({ timestamp, measurement }) => {
    if (measurement === null) {
      addRangeSegment()
      return
    }

    segmentTimestamps.push(timestamp)
    minimum.push(measurement.min)
    maximum.push(measurement.max)
  })
  addRangeSegment()

  return { points, rangeSegments }
}
