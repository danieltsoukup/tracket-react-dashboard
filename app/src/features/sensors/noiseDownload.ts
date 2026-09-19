import type { NoiseGranularity, NoiseMeasurement } from './sensors.api.ts'

export function measurementsToCsv(measurements: NoiseMeasurement[]) {
  const header = 'timestamp,min,max,mean'
  const rows = measurements.map(({ timestamp, min, max, mean }) => [timestamp, min, max, mean].join(','))

  return [header, ...rows].join('\n')
}

export function getNoiseDownloadFilename(granularity: NoiseGranularity, start: string, end: string) {
  return `noise-${granularity}-${start || 'all'}-${end || 'all'}.csv`
}