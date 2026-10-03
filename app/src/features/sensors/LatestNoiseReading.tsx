import type { NoiseMeasurement } from './sensors.api.ts'
import { getLocationHealth } from '../locations/locations.config.ts'
import { formatSensorTimestamp } from '../../utils/sensorLocalTime.ts'

const measurementDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short',
})

type LatestNoiseReadingProps = {
  active: boolean
  measurements: NoiseMeasurement[]
}

function getChronologicalMeasurements(measurements: NoiseMeasurement[]) {
  return [...measurements].sort((first, second) => first.timestamp.localeCompare(second.timestamp))
}

function formatMeasurementDate(timestamp: string) {
  return formatSensorTimestamp(timestamp, measurementDateFormatter)
}

export function LatestNoiseReading({ active, measurements }: LatestNoiseReadingProps) {
  const chronologicalMeasurements = getChronologicalMeasurements(measurements)
  const latestMeasurement = chronologicalMeasurements.at(-1)
  const previousMeasurement = chronologicalMeasurements.at(-2)

  if (!latestMeasurement) {
    return null
  }

  const change = previousMeasurement
    ? latestMeasurement.mean - previousMeasurement.mean
    : null
  const percentageChange = previousMeasurement && previousMeasurement.mean !== 0
    ? (change !== null ? change : 0) / Math.abs(previousMeasurement.mean) * 100
    : null
  const direction = change === null || change === 0 ? 'steady' : change > 0 ? 'up' : 'down'
  const directionSymbol = direction === 'up' ? '\u2191' : direction === 'down' ? '\u2193' : '\u2192'
  const health = getLocationHealth(active, latestMeasurement.timestamp, latestMeasurement.mean)

  return (
    <section className="latest-noise-reading" aria-label="Latest hourly noise reading">
      <p className="sensor-panel__eyebrow">{formatMeasurementDate(latestMeasurement.timestamp)}</p>
      <div className={`latest-noise-reading__value latest-noise-reading__value--${health}`}>
        {latestMeasurement.mean.toFixed(1)} <span>dB</span>
      </div>
      {percentageChange !== null && (
        <p className={`latest-noise-reading__change latest-noise-reading__change--${direction}`}>
          <span aria-hidden="true">{directionSymbol}</span>
          <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          <span className="sensor-panel__muted">from the hour before</span>
        </p>
      )}
    </section>
  )
}
