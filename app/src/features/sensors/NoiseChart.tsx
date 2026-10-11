import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseGranularity, NoiseMeasurement } from './sensors.api.ts'
import type { Annotation } from './annotations.api.ts'
import { getAnnotationsAtTime, prepareAnnotationTimelineData } from './annotationTimelineData.ts'
import type { AnnotationTimelineInterval } from './annotationTimelineData.ts'
import { getNoiseDownloadFilename, measurementsToCsv } from './noiseDownload.ts'
import type { NoiseChartData } from './noiseChartData.ts'
import { getLocationHealth } from '../locations/locations.config.ts'
import type { LocationHealth } from '../locations/locations.config.ts'
import { formatSensorTimestamp } from '../../utils/sensorLocalTime.ts'

type NoiseChartProps = {
  active: boolean
  measurements: NoiseMeasurement[]
  chartData: NoiseChartData
  granularity: NoiseGranularity
  isLoading: boolean
  annotations: Annotation[]
  areAnnotationsLoading: boolean
  annotationError: string | null
  start: string
  end: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onGranularityChange: (granularity: NoiseGranularity) => void
}

const chartColors = {
  min: '#FDCB80',
  fill: '#FDCB80',
  max: '#FDCB80',
  mean: '#E25100',
  background: '#F4F6F3',
}

type ChartTooltip = {
  left: number
  top: number
  timestamp: string
  measurement?: {
    min: number
    minHealth: LocationHealth
    mean: number
    meanHealth: LocationHealth
    max: number
    maxHealth: LocationHealth
  }
  notes: string[]
}

const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function NoiseChart({
  active,
  measurements,
  chartData,
  granularity,
  isLoading,
  annotations,
  areAnnotationsLoading,
  annotationError,
  start,
  end,
  onStartChange,
  onEndChange,
  onGranularityChange,
}: NoiseChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null)
  const timelineData = useMemo(
    () => prepareAnnotationTimelineData(annotations, start, end),
    [annotations, end, start],
  )

  function handleDownload() {
    const blob = new Blob([measurementsToCsv(measurements)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = getNoiseDownloadFilename(granularity, start, end)
    link.click()
    URL.revokeObjectURL(url)
  }

  function preventDateTyping(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key.length === 1 || ['Backspace', 'Delete', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
    }
  }

  useEffect(() => {
    const chart = chartRef.current

    if (!chart || chartData.points.length === 0 || !start || !end) {
      return
    }

    const lineWidths = granularity === 'hourly' ? { range: 1, mean: 3 } : { range: 0.5, mean: 1.5 }
    const traces: Plotly.Data[] = []
    chartData.rangeSegments.forEach((segment) => {
      traces.push(
        {
          type: 'scatter',
          mode: 'lines',
          name: 'Minimum',
          x: segment.timestamps,
          y: segment.minimum,
          connectgaps: false,
          line: { color: chartColors.min, width: lineWidths.range },
          hoverinfo: 'none',
        },
        {
          type: 'scatter',
          mode: 'lines',
          name: 'Maximum',
          x: segment.timestamps,
          y: segment.maximum,
          connectgaps: false,
          line: { color: chartColors.max, width: lineWidths.range },
          fill: 'tonexty',
          fillcolor: chartColors.fill,
          opacity: 0.35,
          hoverinfo: 'none',
        },
      )
    })

    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Mean',
      x: chartData.points.map((point) => point.timestamp),
      y: chartData.points.map((point) => point.measurement?.mean ?? null),
      connectgaps: false,
      line: { color: chartColors.mean, width: lineWidths.mean },
      hoverinfo: 'none',
    })

    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      paper_bgcolor: chartColors.background,
      plot_bgcolor: chartColors.background,
      margin: { t: 24, r: 24, b: 56, l: 56 },
      hovermode: 'x',
      showlegend: false,
      xaxis: {
        type: 'date',
        gridcolor: '#E3E8E4',
        showspikes: true,
        spikemode: 'across',
        spikesnap: 'data',
        spikecolor: '#718078',
        spikethickness: 1,
        spikedash: 'dot',
        zeroline: false,
        range: [new Date(timelineData.rangeStart).toISOString(), new Date(timelineData.rangeEnd).toISOString()],
      },
      yaxis: { title: { text: 'Noise (dB)' }, gridcolor: '#E3E8E4', zeroline: false },
    }

    const handleHover = (event: Plotly.PlotHoverEvent) => {
      const point = event.points[0]
      const measurement = chartData.points[point.pointNumber]?.measurement
      const mouseEvent = event.event

      if (!measurement || !mouseEvent) {
        return
      }

      const chartBounds = chart.getBoundingClientRect()
      const pointX = point.xPixel ?? mouseEvent.clientX - chartBounds.left
      const pointY = point.yPixel ?? mouseEvent.clientY - chartBounds.top
      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 180
      const placeLeft = pointX + 14 + tooltipWidth > chartBounds.width

      setTooltip({
        left: placeLeft ? pointX - tooltipWidth - 14 : pointX + 14,
        top: pointY - 12,
        timestamp: formatSensorTimestamp(measurement.timestamp, tooltipDateFormatter),
        measurement: {
          min: measurement.min,
          minHealth: getLocationHealth(active, measurement.timestamp, measurement.min),
          mean: measurement.mean,
          meanHealth: getLocationHealth(active, measurement.timestamp, measurement.mean),
          max: measurement.max,
          maxHealth: getLocationHealth(active, measurement.timestamp, measurement.max),
        },
        notes: getAnnotationsAtTime(timelineData.intervals, Date.parse(chartData.points[point.pointNumber].timestamp))
          .map((annotation) => annotation.note),
      })
    }

    const handleUnhover = () => setTooltip(null)
    const plot = chart as unknown as Plotly.PlotlyHTMLElement

    void Plotly.newPlot(chart, traces, layout, { responsive: true, displayModeBar: false, displaylogo: false }).then(() => {
      plot.on('plotly_hover', handleHover)
      plot.on('plotly_unhover', handleUnhover)
    })

    return () => {
      plot.removeAllListeners('plotly_hover')
      plot.removeAllListeners('plotly_unhover')
      setTooltip(null)
      void Plotly.purge(chart)
    }
  }, [active, chartData, granularity, measurements, start, end, timelineData])

  function showTimelineTooltip(interval: AnnotationTimelineInterval, clientX?: number, includeOverlaps = false) {
    const timeline = timelineRef.current
    const chart = chartRef.current

    if (!timeline || !chart) {
      return
    }

    const bounds = timeline.getBoundingClientRect()
    const fraction = clientX === undefined
      ? (interval.start + interval.end) / 2
      : timelineData.rangeStart +
        Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) *
          (timelineData.rangeEnd - timelineData.rangeStart)
    const notes = includeOverlaps
      ? timelineData.intervals
          .filter((candidate) => candidate.start < interval.end && candidate.end > interval.start)
          .map((candidate) => candidate.annotation.note)
      : getAnnotationsAtTime(timelineData.intervals, fraction).map((annotation) => annotation.note)
    const anchorX = clientX === undefined ? bounds.left + ((interval.left + interval.width / 2) / 100) * bounds.width : clientX
    const chartBounds = chart.getBoundingClientRect()
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 180
    const pointX = anchorX - chartBounds.left
    const left = pointX + 14 + tooltipWidth > chartBounds.width
      ? Math.max(0, pointX - tooltipWidth - 14)
      : pointX + 14

    setTooltip({
      left,
      top: chart.offsetHeight + 10,
      timestamp: formatSensorTimestamp(new Date(fraction).toISOString(), tooltipDateFormatter),
      notes,
    })
  }

  return (
    <section className="noise-chart-panel" aria-label="Sensor noise chart">
      <div className="noise-chart-panel__toolbar">
        <div className="noise-chart-range" aria-label="Chart date range">
          <label className="noise-chart-range__field">
            <input
              type="date"
              value={start}
              max={end || undefined}
              onKeyDown={preventDateTyping}
              onBeforeInput={(event) => event.preventDefault()}
              onPaste={(event) => event.preventDefault()}
              onChange={(event) => onStartChange(event.target.value)}
            />
          </label>
          <label className="noise-chart-range__field">
            <input
              type="date"
              value={end}
              min={start || undefined}
              onKeyDown={preventDateTyping}
              onBeforeInput={(event) => event.preventDefault()}
              onPaste={(event) => event.preventDefault()}
              onChange={(event) => onEndChange(event.target.value)}
            />
          </label>
        </div>
        <div className="noise-chart-toolbar-actions">
          <div className="noise-chart-toggle" role="group" aria-label="Measurement granularity">
            <button
              type="button"
              className={granularity === 'hourly' ? 'noise-chart-toggle__option noise-chart-toggle__option--active' : 'noise-chart-toggle__option'}
              aria-pressed={granularity === 'hourly'}
              onClick={() => onGranularityChange('hourly')}
            >
              Hourly
            </button>
            <button
              type="button"
              className={granularity === 'raw' ? 'noise-chart-toggle__option noise-chart-toggle__option--active' : 'noise-chart-toggle__option'}
              aria-pressed={granularity === 'raw'}
              onClick={() => onGranularityChange('raw')}
            >
              Raw
            </button>
          </div>
          <button
            type="button"
            className="noise-chart-download"
            onClick={handleDownload}
            disabled={isLoading || measurements.length === 0}
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="noise-chart-container">
        <div ref={chartRef} className="noise-chart" aria-label="Sensor noise over time" />
        <div className="noise-chart-notes">
          <span className="noise-chart-notes__label">Notes</span>
          <div
            ref={timelineRef}
            className="noise-chart-notes__track"
            role="group"
            aria-label="Notes timeline"
            onMouseLeave={() => setTooltip(null)}
            onMouseMove={(event) => {
              const activeInterval = timelineData.intervals.find((interval) => {
                const bounds = timelineRef.current?.getBoundingClientRect()
                if (!bounds) {
                  return false
                }
                const time = timelineData.rangeStart +
                  ((event.clientX - bounds.left) / bounds.width) * (timelineData.rangeEnd - timelineData.rangeStart)
                return time >= interval.start && time < interval.end
              })

              if (activeInterval) {
                showTimelineTooltip(activeInterval, event.clientX)
              } else {
                setTooltip(null)
              }
            }}
          >
            {timelineData.intervals.map((interval) => (
              <button
                key={interval.annotation.id}
                type="button"
                className="noise-chart-notes__interval"
                style={{ left: `${interval.left}%`, width: `${interval.width}%` }}
                aria-label={`${interval.annotation.note}, ${formatSensorTimestamp(interval.annotation.startTime, tooltipDateFormatter)} to ${formatSensorTimestamp(interval.annotation.endTime, tooltipDateFormatter)}`}
                title={interval.annotation.note}
                onFocus={() => showTimelineTooltip(interval, undefined, true)}
                onBlur={() => setTooltip(null)}
                onMouseEnter={(event) => showTimelineTooltip(interval, event.clientX)}
              />
            ))}
          </div>
          <span aria-hidden="true" />
        </div>
        {areAnnotationsLoading && (
          <p className="noise-chart-notes__status" role="status">Loading notes...</p>
        )}
        {!areAnnotationsLoading && !annotationError && timelineData.intervals.length === 0 && (
          <p className="noise-chart-notes__status">No notes available.</p>
        )}
        {tooltip && (
          <div
            ref={tooltipRef}
            className="noise-chart-tooltip"
            style={{ left: tooltip.left, top: tooltip.top }}
            role="status"
          >
            <div className="noise-chart-tooltip__date">{tooltip.timestamp}</div>
            {tooltip.measurement && (
              <>
                <div className="noise-chart-tooltip__value">
                  <span className="noise-chart-tooltip__label">Max</span>
                  <span
                    className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${tooltip.measurement.maxHealth}`}
                    style={{ width: `${tooltip.measurement.max.toFixed(1).length}ch` }}
                  >
                    {tooltip.measurement.max.toFixed(1)}
                  </span>
                  <span className="noise-chart-tooltip__unit">dB</span>
                </div>
                <div className="noise-chart-tooltip__value">
                  <span className="noise-chart-tooltip__label">Avg</span>
                  <span
                    className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${tooltip.measurement.meanHealth}`}
                    style={{ width: `${tooltip.measurement.mean.toFixed(1).length}ch` }}
                  >
                    {tooltip.measurement.mean.toFixed(1)}
                  </span>
                  <span className="noise-chart-tooltip__unit">dB</span>
                </div>
                <div className="noise-chart-tooltip__value">
                  <span className="noise-chart-tooltip__label">Min</span>
                  <span
                    className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${tooltip.measurement.minHealth}`}
                    style={{ width: `${tooltip.measurement.min.toFixed(1).length}ch` }}
                  >
                    {tooltip.measurement.min.toFixed(1)}
                  </span>
                  <span className="noise-chart-tooltip__unit">dB</span>
                </div>
              </>
            )}
            {tooltip.notes.length > 0 && (
              <div className="noise-chart-tooltip__notes">
                <span className="noise-chart-tooltip__label">Notes</span>
                {tooltip.notes.map((note, index) => <p key={`${index}:${note}`}>{note}</p>)}
              </div>
            )}
          </div>
        )}
        {isLoading && (
          <div className="noise-chart__loading" role="status" aria-live="polite">
            Loading {granularity} measurements...
          </div>
        )}
      </div>
    </section>
  )
}