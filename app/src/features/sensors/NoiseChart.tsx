import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseGranularity, NoiseMeasurement } from './sensors.api.ts'
import type { Annotation } from './annotations.api.ts'
import {
  getAnnotationsAtTime,
  prepareAnnotationTimelineData,
  prepareAnnotationTimelineDataForRange,
} from './annotationTimelineData.ts'
import type { AnnotationTimelineInterval } from './annotationTimelineData.ts'
import { getNoiseDownloadFilename, measurementsToCsv } from './noiseDownload.ts'
import type { NoiseChartData } from './noiseChartData.ts'
import { getLocationHealth } from '../locations/locations.config.ts'
import { formatSensorTimestamp } from '../../utils/sensorLocalTime.ts'
import { chartColors } from '../config.ts'
import type { ChartTooltip } from './chartTooltip.ts'

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

type PlotlyChartElement = Plotly.PlotlyHTMLElement & {
  _fullLayout?: {
    xaxis?: {
      range?: [unknown, unknown]
    }
  }
}

const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short',
})

function getMaximumIndicatorLayout(maximum: number | null): Partial<Plotly.Layout> {
  /*
    * Generate layout configuration for indicating the maximum measured noise level on the chart.
  */
  if (maximum === null) {
    return { shapes: [], annotations: [] }
  }

  return {
    shapes: [{
      type: 'line',
      xref: 'paper',
      x0: 0,
      x1: 1,
      yref: 'y',
      y0: maximum,
      y1: maximum,
      line: { color: chartColors.spike, width: 1, dash: 'dash' },
    }],
    annotations: [{
      xref: 'paper',
      x: 0,
      yref: 'y',
      y: maximum,
      text: `Maximum measured ${maximum.toFixed(1)} dB`,
      showarrow: false,
      xanchor: 'left',
      yanchor: 'bottom',
      yshift: 4,
      font: { color: chartColors.spike },
      bgcolor: chartColors.background,
    }],
  }
}

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
  const [visibleRange, setVisibleRange] = useState<[number, number] | null>(null)
  const chartRangeData = useMemo(
    () => prepareAnnotationTimelineData(annotations, start, end),
    [annotations, end, start],
  )
  const timelineData = useMemo(
    () => visibleRange
      ? prepareAnnotationTimelineDataForRange(annotations, visibleRange[0], visibleRange[1])
      : chartRangeData,
    [annotations, chartRangeData, visibleRange],
  )
  const timelineDataRef = useRef(timelineData)

  useEffect(() => {
    timelineDataRef.current = timelineData
  }, [timelineData])

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
      setVisibleRange(null)
      return
    }

    setVisibleRange(null)

    const lineWidths = granularity === 'hourly' ? { range: 1, mean: 3 } : { range: 0.5, mean: 1.5 }
    const traces: Plotly.Data[] = []
    let displayedMaximum = measurements.reduce<number | null>(
      (largest, measurement) => largest === null ? measurement.max : Math.max(largest, measurement.max),
      null,
    )
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
      hoveranywhere: true,
      clickanywhere: true,
      showlegend: false,
      xaxis: {
        type: 'date',
        gridcolor: chartColors.grid,
        showspikes: true,
        spikemode: 'across',
        spikesnap: 'data',
        spikecolor: chartColors.spike,
        spikethickness: 1,
        spikedash: 'dot',
        zeroline: false,
        range: [new Date(chartRangeData.rangeStart).toISOString(), new Date(chartRangeData.rangeEnd).toISOString()],
      },
      yaxis: { title: { text: 'Noise (dB)' }, gridcolor: chartColors.grid, zeroline: false },
      ...getMaximumIndicatorLayout(displayedMaximum),
    }

    function showMeasurementTooltip(
      pointNumber: number | undefined,
      xValue: unknown,
      xPixel: number | undefined,
      yPixel: number | undefined,
      mouseEvent: MouseEvent | undefined,
    ) {
      /*
        * Show the tooltip for a specific measurement point in the chart.
        * The function determines the closest measurement point to the given xValue and displays the tooltip with its details.
      */ 
      let resolvedPointNumber = pointNumber
      if (resolvedPointNumber === undefined || !chartData.points[resolvedPointNumber]?.measurement) {
        const targetTimestamp = typeof xValue === 'number' ? xValue : Date.parse(String(xValue))
        if (!Number.isFinite(targetTimestamp)) {
          return
        }

        let closestDistance = Number.POSITIVE_INFINITY
        chartData.points.forEach((candidate, index) => {
          if (!candidate.measurement) {
            return
          }

          const distance = Math.abs(Date.parse(candidate.timestamp) - targetTimestamp)
          if (distance < closestDistance) {
            closestDistance = distance
            resolvedPointNumber = index
          }
        })
      }

      if (resolvedPointNumber === undefined) {
        return
      }

      const measurement = chartData.points[resolvedPointNumber]?.measurement
      if (!measurement) {
        return
      }

      const chartElement = chartRef.current
      if (!chartElement) {
        return
      }

      const chartBounds = chartElement.getBoundingClientRect()
      const pointX = xPixel ?? (mouseEvent ? mouseEvent.clientX - chartBounds.left : chartBounds.width / 2)
      const pointY = yPixel ?? (mouseEvent ? mouseEvent.clientY - chartBounds.top : chartBounds.height / 2)
      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 180
      const placeLeft = pointX + 14 + tooltipWidth > chartBounds.width
      const preferredLeft = placeLeft ? pointX - tooltipWidth - 14 : pointX + 14
      const left = Math.max(8, Math.min(preferredLeft, chartBounds.width - tooltipWidth - 8))

      setTooltip({
        left,
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
        notes: getAnnotationsAtTime(
          timelineDataRef.current.intervals,
          Date.parse(chartData.points[resolvedPointNumber].timestamp),
        )
          .map((annotation) => annotation.note),
      })
    }

    const handleHover = (event: Plotly.PlotHoverEvent) => {
      /*
        * Handle chart hover events to show the tooltip for the hovered measurement.
        * This is used to allow users to hover over a point in the chart and see the tooltip with the measurement details.
      */
      const point = event.points[0]
      showMeasurementTooltip(point?.pointNumber, event.xvals[0], event.xPixel ?? point?.xPixel, event.yPixel ?? point?.yPixel, event.event)
    }
    const handleClick = (event: Plotly.PlotMouseEvent) => {
      /*
        * Handle chart click events to show the tooltip for the clicked measurement.
        * This is used to allow users to click on a point in the chart and see the tooltip with the measurement details.
      */
      const clickEvent = event as Plotly.PlotMouseEvent & { xvals?: Plotly.PlotHoverEvent['xvals'] }
      const point = event.points[0]
      showMeasurementTooltip(point?.pointNumber, clickEvent.xvals?.[0], event.xPixel ?? point?.xPixel, event.yPixel ?? point?.yPixel, event.event)
    }

    const plot = chart as unknown as PlotlyChartElement
    let relayoutFrame: number | null = null
    let touchInteraction = false
    const handleTouchStart = () => {
      touchInteraction = true
    }
    const handleMouseMove = () => {
      touchInteraction = false
    }
    const handleUnhover = () => {
      if (!touchInteraction) {
        setTooltip(null)
      }
    }
    const handleRelayout = () => {
      if (relayoutFrame !== null) {
        cancelAnimationFrame(relayoutFrame)
      }

      relayoutFrame = requestAnimationFrame(() => {
        /*
          * Handle chart relayout events to update the visible range of the chart.
          * This is used to update the timeline data for the notes timeline.
        */
        relayoutFrame = null
        const axisRange = plot._fullLayout?.xaxis?.range
        const parseRangeValue = (value: unknown) => (
          typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : Number.NaN
        )
        const rangeStart = parseRangeValue(axisRange?.[0])
        const rangeEnd = parseRangeValue(axisRange?.[1])

        if (Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && rangeEnd > rangeStart) {
          setVisibleRange([rangeStart, rangeEnd])
          const visibleMaximum = measurements.reduce<number | null>((largest, measurement) => {
            const timestamp = Date.parse(measurement.timestamp)
            if (!Number.isFinite(timestamp) || timestamp < rangeStart || timestamp > rangeEnd) {
              return largest
            }

            return largest === null ? measurement.max : Math.max(largest, measurement.max)
          }, null)

          if (visibleMaximum !== displayedMaximum) {
            displayedMaximum = visibleMaximum
            void Plotly.relayout(plot, getMaximumIndicatorLayout(displayedMaximum))
          }
        }
      })
    }

    void Plotly.newPlot(chart, traces, layout, { responsive: true, displayModeBar: false, displaylogo: false }).then(() => {
      plot.on('plotly_hover', handleHover)
      plot.on('plotly_click', handleClick)
      plot.on('plotly_unhover', handleUnhover)
      plot.on('plotly_relayout', handleRelayout)
    })
    chart.addEventListener('touchstart', handleTouchStart, { passive: true })
    chart.addEventListener('mousemove', handleMouseMove)

    return () => {
      plot.removeAllListeners('plotly_hover')
      plot.removeAllListeners('plotly_click')
      plot.removeAllListeners('plotly_unhover')
      plot.removeAllListeners('plotly_relayout')
      chart.removeEventListener('touchstart', handleTouchStart)
      chart.removeEventListener('mousemove', handleMouseMove)
      if (relayoutFrame !== null) {
        cancelAnimationFrame(relayoutFrame)
      }
      setTooltip(null)
      void Plotly.purge(chart)
    }
  }, [active, chartData, chartRangeData, granularity, measurements, start, end])

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