import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCATIONS_API_URL, fetchLocations, type Location } from './locations.api.ts'

const validLocation: Location = {
  id: 1,
  label: 'Downtown',
  latitude: 43.6532,
  longitude: -79.3832,
  radius: 100,
  active: true,
  lastChecked: '2026-09-13T12:00:00.000Z',
  latestTimestamp: '2026-09-13T11:00:00.000Z',
  hourStart: '2026-09-13T10:00:00.000Z',
  hourEnd: '2026-09-13T11:00:00.000Z',
  hourMin: 35,
  hourMax: 60,
  hourMean: 48,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchLocations', () => {
  it('returns locations from a valid API response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ locations: [validLocation] }), { status: 200 }),
    )
    const signal = new AbortController().signal

    await expect(fetchLocations(signal)).resolves.toEqual([validLocation])
    expect(fetchMock).toHaveBeenCalledWith(LOCATIONS_API_URL, { signal })
  })

  it('throws the response status when the API request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))

    await expect(fetchLocations()).rejects.toThrow('Unable to load locations (503)')
  })

  it('rejects responses without a locations array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ locations: {} }), { status: 200 }),
    )

    await expect(fetchLocations()).rejects.toThrow('The locations API returned an unexpected response.')
  })

  it('rejects locations with invalid fields', async () => {
    const invalidLocation = { ...validLocation, hourMean: '48' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ locations: [invalidLocation] }), { status: 200 }),
    )

    await expect(fetchLocations()).rejects.toThrow('The locations API returned an unexpected response.')
  })
})
