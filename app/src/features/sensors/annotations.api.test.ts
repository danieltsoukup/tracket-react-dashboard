import { afterEach, describe, expect, it, vi } from 'vitest'
import { ANNOTATIONS_API_URL, fetchSensorAnnotations } from './annotations.api.ts'

const annotation = {
  id: 123,
  startTime: '2026-09-13T12:00:00-04:00',
  endTime: '2026-09-13T12:10:00-04:00',
  note: 'Concert',
  user: 234,
  app: 'My App',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchSensorAnnotations', () => {
  it('requests annotations with the location and time range', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ annotations: [annotation] }), { status: 200 }),
    )
    const signal = new AbortController().signal

    await expect(
      fetchSensorAnnotations(
        572250,
        '2026-09-13T00:00:00-04:00',
        '2026-09-14T00:00:00-04:00',
        signal,
      ),
    ).resolves.toEqual([annotation])

    const query = new URLSearchParams({
      location: '572250',
      startTime: '2026-09-13T00:00:00-04:00',
      endTime: '2026-09-14T00:00:00-04:00',
    })
    expect(fetchMock).toHaveBeenCalledWith(`${ANNOTATIONS_API_URL}?${query}`, { signal })
  })

  it('returns mock September annotations for sensor 1251390 without making a request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      fetchSensorAnnotations(1251390, '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
    ).resolves.toEqual([
      {
        id: 900001,
        startTime: '2026-09-03T18:00:00-04:00',
        endTime: '2026-09-03T21:00:00-04:00',
        note: 'Outdoor concert',
      },
      {
        id: 900002,
        startTime: '2026-09-09T07:00:00-04:00',
        endTime: '2026-09-09T11:00:00-04:00',
        note: 'Road construction nearby',
      },
      {
        id: 900005,
        startTime: '2026-09-09T09:00:00-04:00',
        endTime: '2026-09-09T12:00:00-04:00',
        note: 'Delivery trucks at nearby shops',
      },
      {
        id: 900003,
        startTime: '2026-09-17T16:00:00-04:00',
        endTime: '2026-09-17T19:00:00-04:00',
        note: 'Farmers market',
      },
      {
        id: 900004,
        startTime: '2026-09-26T12:00:00-04:00',
        endTime: '2026-09-26T16:00:00-04:00',
        note: 'Community festival',
      },
    ])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('filters mock September annotations to the requested interval', async () => {
    const result = await fetchSensorAnnotations(
      1251390,
      '2026-09-08T00:00:00Z',
      '2026-09-10T00:00:00Z',
    )

    expect(result.map(({ id }) => id)).toEqual([900002, 900005])
  })

  it('throws when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))

    await expect(fetchSensorAnnotations(572250, 'start', 'end')).rejects.toThrow(
      'Unable to load annotations (503)',
    )
  })

  it('rejects unexpected response data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ annotations: [{ ...annotation, note: 1 }] }), { status: 200 }),
    )

    await expect(fetchSensorAnnotations(572250, 'start', 'end')).rejects.toThrow(
      'The annotations API returned an unexpected response.',
    )
  })
})
