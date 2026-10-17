import { describe, expect, it } from 'vitest'
import type { Annotation } from './annotations.api.ts'
import {
  getAnnotationsAtTime,
  prepareAnnotationTimelineData,
  prepareAnnotationTimelineDataForRange,
} from './annotationTimelineData.ts'

function annotation(id: number, startTime: string, endTime: string, note = `Note ${id}`): Annotation {
  return { id, startTime, endTime, note }
}

describe('prepareAnnotationTimelineData', () => {
  it('clips annotations to the selected range and excludes boundary-only overlaps', () => {
    const annotations = [
      annotation(1, '2026-09-12T23:00:00-04:00', '2026-09-13T01:00:00-04:00'),
      annotation(2, '2026-09-13T23:30:00-04:00', '2026-09-14T01:00:00-04:00'),
      annotation(3, '2026-09-12T22:00:00-04:00', '2026-09-13T00:00:00-04:00'),
      annotation(4, '2026-09-14T00:00:00-04:00', '2026-09-14T01:00:00-04:00'),
    ]

    const data = prepareAnnotationTimelineData(annotations, '2026-09-13', '2026-09-13')

    expect(data.intervals).toHaveLength(2)
    expect(data.intervals[0].annotation.id).toBe(1)
    expect(data.intervals[0].left).toBe(0)
    expect(data.intervals[0].width).toBeCloseTo((2 / 48) * 100)
    expect(data.intervals[1].annotation.id).toBe(2)
    expect(data.intervals[1].left).toBeCloseTo((47 / 48) * 100)
    expect(data.intervals[1].width).toBeCloseTo(100 / 48)
  })

  it('returns every annotation overlapping a time and treats interval ends as exclusive', () => {
    const annotations = [
      annotation(1, '2026-09-13T12:00:00Z', '2026-09-13T14:00:00Z'),
      annotation(2, '2026-09-13T13:00:00Z', '2026-09-13T15:00:00Z'),
    ]
    const { intervals } = prepareAnnotationTimelineData(annotations, '2026-09-13', '2026-09-13')

    expect(getAnnotationsAtTime(intervals, Date.parse('2026-09-13T13:30:00Z'))).toEqual(annotations)
    expect(getAnnotationsAtTime(intervals, Date.parse('2026-09-13T14:00:00Z'))).toEqual([annotations[1]])
  })

  it('clips overlapping annotations to the exact visible chart range', () => {
    const annotations = [
      annotation(1, '2026-09-13T12:00:00Z', '2026-09-13T14:00:00Z'),
      annotation(2, '2026-09-13T13:00:00Z', '2026-09-13T15:00:00Z'),
      annotation(3, '2026-09-13T15:00:00Z', '2026-09-13T16:00:00Z'),
    ]
    const rangeStart = Date.parse('2026-09-13T13:30:00Z')
    const rangeEnd = Date.parse('2026-09-13T14:30:00Z')

    const data = prepareAnnotationTimelineDataForRange(annotations, rangeStart, rangeEnd)

    expect(data.intervals.map(({ annotation: item }) => item.id)).toEqual([1, 2])
    expect(data.intervals[0]).toMatchObject({
      start: rangeStart,
      end: Date.parse('2026-09-13T14:00:00Z'),
      left: 0,
      width: 50,
    })
    expect(data.intervals[1]).toMatchObject({
      start: Date.parse('2026-09-13T13:30:00Z'),
      end: rangeEnd,
      left: 0,
      width: 100,
    })
    expect(data.rangeStart).toBe(rangeStart)
    expect(data.rangeEnd).toBe(rangeEnd)
  })

  it('ignores invalid intervals and invalid date ranges', () => {
    const invalid = annotation(1, 'invalid', '2026-09-13T14:00:00Z')
    expect(prepareAnnotationTimelineData([invalid], '2026-09-13', '2026-09-13').intervals).toEqual([])
    expect(prepareAnnotationTimelineData([], 'invalid', '2026-09-13').intervals).toEqual([])
  })
})
