import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSensorNoise, SENSOR_NOISE_API_URL, type NoiseMeasurement } from './sensors.api.ts'

const validMeasurement: NoiseMeasurement = {
  timestamp: '2026-09-13T12:00:00.000Z',
  min: 35,
  max: 60,
  mean: 48,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchSensorNoise', () => {
  it('returns measurements and serializes query options', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ measurements: [validMeasurement] }), { status: 200 }),
    )
    const signal = new AbortController().signal

    await expect(
      fetchSensorNoise(572250, {
        granularity: 'hourly',
        start: '2026-09-12 12:00:00',
        end: '2026-09-13 12:00:00',
        page: 2,
        signal,
      }),
    ).resolves.toEqual([validMeasurement])
    expect(fetchMock).toHaveBeenCalledWith(
      `${SENSOR_NOISE_API_URL}/572250/noise?granularity=hourly&start=2026-09-12+12%3A00%3A00&end=2026-09-13+12%3A00%3A00&page=2`,
      { signal },
    )
  })

  it('throws the response status when the API request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))

    await expect(fetchSensorNoise(572250)).rejects.toThrow('Unable to load noise measurements (503)')
  })

  it('rejects responses without a measurements array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ measurements: {} }), { status: 200 }),
    )

    await expect(fetchSensorNoise(572250)).rejects.toThrow('The noise API returned an unexpected response.')
  })

  it('rejects measurements with invalid fields', async () => {
    const invalidMeasurement = { ...validMeasurement, mean: '48' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ measurements: [invalidMeasurement] }), { status: 200 }),
    )

    await expect(fetchSensorNoise(572250)).rejects.toThrow('The noise API returned an unexpected response.')
  })
})