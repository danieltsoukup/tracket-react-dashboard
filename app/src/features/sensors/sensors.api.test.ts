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

  it('corrects timestamps for configured locations when loading chart data', async () => {
    const measurement = { ...validMeasurement, timestamp: '2026-07-15T12:00:00Z' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ measurements: [measurement] }), { status: 200 }),
    )

    await expect(fetchSensorNoise(3270474)).resolves.toEqual([
      { ...measurement, timestamp: '2026-07-15T17:00:00+01:00' },
    ])
  })

  it('uses the latest timestamp for a four-day range and fetches every page', async () => {
    const fullPage = Array.from({ length: 1000 }, () => validMeasurement)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ measurements: fullPage }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ measurements: [validMeasurement] }), { status: 200 }))

    await expect(
      fetchSensorNoise(572250, {
        granularity: 'hourly',
        latestTimestamp: '2026-09-13T12:00:00.000Z',
      }),
    ).resolves.toEqual([...fullPage, validMeasurement])

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${SENSOR_NOISE_API_URL}/572250/noise?granularity=hourly&start=2026-09-09T12%3A00%3A00.000Z&end=2026-09-13T12%3A00%3A00.000Z&page=0`,
      {},
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${SENSOR_NOISE_API_URL}/572250/noise?granularity=hourly&start=2026-09-09T12%3A00%3A00.000Z&end=2026-09-13T12%3A00%3A00.000Z&page=1`,
      {},
    )
  })

  it('uses sensor-local timestamps when deriving a default range from an offset timestamp', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ measurements: [validMeasurement] }), { status: 200 }),
    )

    await fetchSensorNoise(572250, {
      granularity: 'hourly',
      latestTimestamp: '2026-09-13T12:00:00-04:00',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${SENSOR_NOISE_API_URL}/572250/noise?granularity=hourly&start=2026-09-09T12%3A00%3A00-04%3A00&end=2026-09-13T12%3A00%3A00-04%3A00&page=0`,
      {},
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