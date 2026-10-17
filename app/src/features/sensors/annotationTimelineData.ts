/**
 * Prepare and manipulate annotation timeline data for sensors.
 */
import type { Annotation } from './annotations.api.ts'
import { toSensorLocalPlotTimestamp } from '../../utils/sensorLocalTime.ts'

export type AnnotationTimelineInterval = {
  annotation: Annotation
  start: number
  end: number
  left: number
  width: number
}

export type AnnotationTimelineData = {
  intervals: AnnotationTimelineInterval[]
  rangeStart: number
  rangeEnd: number
}

function getNextDate(date: string): string {
  /*
    * Get the next date in YYYY-MM-DD format.
  */
  const timestamp = Date.parse(`${date}T00:00:00Z`)

  if (!Number.isFinite(timestamp)) {
    return ''
  }

  return new Date(timestamp + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function prepareAnnotationTimelineData(
  annotations: Annotation[],
  startDate: string,
  endDate: string,
): AnnotationTimelineData {
  /*
    * Prepare annotation timeline data for a given date range.
    * The startDate and endDate should be in YYYY-MM-DD format.
  */
  const rangeStart = Date.parse(`${startDate}T00:00:00Z`)
  const rangeEnd = Date.parse(`${getNextDate(endDate)}T00:00:00Z`)

  return prepareAnnotationTimelineDataForRange(annotations, rangeStart, rangeEnd)
}

export function prepareAnnotationTimelineDataForRange(
  annotations: Annotation[],
  rangeStart: number,
  rangeEnd: number,
): AnnotationTimelineData {
  /*
    * Prepare annotation timeline data by filtering and calculating intervals for a given timestamp range.
  */
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) {
    return { intervals: [], rangeStart: 0, rangeEnd: 0 }
  }

  const rangeDuration = rangeEnd - rangeStart
  const intervals = annotations.flatMap((annotation) => {
    const annotationStart = Date.parse(toSensorLocalPlotTimestamp(annotation.startTime))
    const annotationEnd = Date.parse(toSensorLocalPlotTimestamp(annotation.endTime))

    if (!Number.isFinite(annotationStart) || !Number.isFinite(annotationEnd) || annotationEnd <= annotationStart) {
      return []
    }

    const start = Math.max(annotationStart, rangeStart)
    const end = Math.min(annotationEnd, rangeEnd)

    if (end <= start) {
      return []
    }

    return [{
      annotation,
      start,
      end,
      left: ((start - rangeStart) / rangeDuration) * 100,
      width: ((end - start) / rangeDuration) * 100,
    }]
  })

  return { intervals, rangeStart, rangeEnd }
}

export function getAnnotationsAtTime(intervals: AnnotationTimelineInterval[], timestamp: number): Annotation[] {
  /*
    * Get annotations that are active at a specific timestamp.
  */
  if (!Number.isFinite(timestamp)) {
    return []
  }
  return intervals
    .filter((interval) => timestamp >= interval.start && timestamp < interval.end)
    .map((interval) => interval.annotation)
}
