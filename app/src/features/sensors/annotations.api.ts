export const ANNOTATIONS_API_URL = 'https://api.tracket.info/v1/annotations'

export type Annotation = {
  id: number
  startTime: string
  endTime: string
  note: string
  user?: number
  app?: string
  reAnnotation?: number
}

const MOCK_ANNOTATION_SENSOR_ID = 1251390
const mockSeptemberAnnotations: Annotation[] = [
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
]

type AnnotationResponse = {
  annotations: Annotation[]
}

function isAnnotation(value: unknown): value is Annotation {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const annotation = value as Record<string, unknown>

  return (
    typeof annotation.id === 'number' &&
    typeof annotation.startTime === 'string' &&
    typeof annotation.endTime === 'string' &&
    typeof annotation.note === 'string'
  )
}

function isAnnotationResponse(value: unknown): value is AnnotationResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>
  return Array.isArray(response.annotations) && response.annotations.every(isAnnotation)
}

export async function fetchSensorAnnotations(
  locationId: number,
  startTime: string,
  endTime: string,
  signal?: AbortSignal,
): Promise<Annotation[]> {
  const query = new URLSearchParams({
    location: String(locationId),
    startTime,
    endTime,
  })

  const rangeStart = Date.parse(startTime)
  const rangeEnd = Date.parse(endTime)
  const septemberStart = Date.parse('2026-09-01T00:00:00Z')
  const octoberStart = Date.parse('2026-10-01T00:00:00Z')

  if (
    locationId === MOCK_ANNOTATION_SENSOR_ID &&
    Number.isFinite(rangeStart) &&
    Number.isFinite(rangeEnd) &&
    rangeStart < octoberStart &&
    rangeEnd > septemberStart
  ) {
    return mockSeptemberAnnotations.filter(
      (annotation) => Date.parse(annotation.startTime) < rangeEnd && Date.parse(annotation.endTime) > rangeStart,
    )
  }

  const response = await fetch(`${ANNOTATIONS_API_URL}?${query}`, { signal })

  if (!response.ok) {
    throw new Error(`Unable to load annotations (${response.status})`)
  }

  const data: unknown = await response.json()

  if (!isAnnotationResponse(data)) {
    throw new Error('The annotations API returned an unexpected response.')
  }

  return data.annotations
}
