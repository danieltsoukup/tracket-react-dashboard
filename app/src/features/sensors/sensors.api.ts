/**
 * @file sensors.api.ts
 * @description Utilities for fetching sensor measurements from the API.
 */
export const SENSOR_NOISE_API_URL = 'https://api.tracket.info/v1/locations'
const MEASUREMENTS_PAGE_SIZE = 1000

export type NoiseGranularity = 'raw' | 'hourly' | 'life-time'

export type NoiseMeasurement = {
  timestamp: string
  min: number
  max: number
  mean: number
}

export type NoiseQueryOptions = {
  granularity?: NoiseGranularity
  start?: string
  end?: string
  latestTimestamp?: string
  page?: number
  signal?: AbortSignal
}

type NoiseResponse = {
  measurements: NoiseMeasurement[]
}

function isNoiseMeasurement(value: unknown): value is NoiseMeasurement {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const measurement = value as Record<string, unknown>

  return (
    typeof measurement.timestamp === 'string' &&
    typeof measurement.min === 'number' &&
    typeof measurement.max === 'number' &&
    typeof measurement.mean === 'number'
  )
}

function isNoiseResponse(value: unknown): value is NoiseResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>
  return Array.isArray(response.measurements) && response.measurements.every(isNoiseMeasurement)
}

export async function fetchSensorNoise(sensorId: number, options: NoiseQueryOptions = {}): Promise<NoiseMeasurement[]> {
  const { signal, latestTimestamp, ...queryOptions } = options
  const end = queryOptions.end ?? latestTimestamp
  const start =
    queryOptions.start ?? (end ? new Date(new Date(end).getTime() - 4 * 24 * 60 * 60 * 1000).toISOString() : undefined)
  const measurements: NoiseMeasurement[] = []
  let page = queryOptions.page ?? 0

  while (true) {
    const query = new URLSearchParams()
    const pageOptions = { ...queryOptions, start, end, page }

    Object.entries(pageOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        query.set(key, String(value))
      }
    })

    const queryString = query.toString()
    const url = `${SENSOR_NOISE_API_URL}/${encodeURIComponent(String(sensorId))}/noise${queryString ? `?${queryString}` : ''}`
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(`Unable to load noise measurements (${response.status})`)
    }

    const data: unknown = await response.json()

    if (!isNoiseResponse(data)) {
      throw new Error('The noise API returned an unexpected response.')
    }

    if (data.measurements.length < MEASUREMENTS_PAGE_SIZE) {
      measurements.push(...data.measurements)
      console.log(`${measurements.length} measeurements fetched for sensor ${sensorId}.`)
      return measurements
    }

    measurements.push(...data.measurements)
    page += 1
  }
}