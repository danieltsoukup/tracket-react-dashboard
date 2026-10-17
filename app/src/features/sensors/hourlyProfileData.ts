import type { NoiseMeasurement } from './sensors.api.ts'
import { getSensorLocalHour } from '../../utils/sensorLocalTime.ts'

export type HourlyProfilePoint = {
  hour: number
  min: number | null
  max: number | null
  mean: number | null
  count: number
}

type HourlyTotals = {
  min: number
  max: number
  mean: number
  count: number
}

export function prepareHourlyProfileData(measurements: NoiseMeasurement[]): HourlyProfilePoint[] {
  const hourlyTotals: HourlyTotals[] = Array.from({ length: 24 }, () => ({
    min: 0,
    max: 0,
    mean: 0,
    count: 0,
  }))

  measurements.forEach((measurement) => {
    const hour = getSensorLocalHour(measurement.timestamp)

    if (hour === null) {
      return
    }

    const totals = hourlyTotals[hour]
    totals.min += measurement.min
    totals.max += measurement.max
    totals.mean += measurement.mean
    totals.count += 1
  })

  return hourlyTotals.map((totals, hour) => ({
    hour,
    min: totals.count > 0 ? totals.min / totals.count : null,
    max: totals.count > 0 ? totals.max / totals.count : null,
    mean: totals.count > 0 ? totals.mean / totals.count : null,
    count: totals.count,
  }))
}
