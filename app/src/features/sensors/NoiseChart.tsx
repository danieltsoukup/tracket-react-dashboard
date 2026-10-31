import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
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
import {
  getMaximumNoiseLevelInRange,
  getMeanAboveHealthLimitPercentagesInRange,
} from './noiseChartData.ts'
import type { NoiseChartData } from './noiseChartData.ts'
import {
  getReadingHealth,
  LOCATION_HEALTH_HOURS,
  LOCATION_HEALTH_THRESHOLDS,
} from '../locations/locations.config.ts'
import { formatSensorTimestamp } from '../../utils/sensorLocalTime.ts'
import { chartColors, chartFont } from '../config.ts'
import { getTimeOfDayIcon } from './chartTooltip.ts'
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

function NoiseFactCard({ value, description }: { value: ReactNode; description: string }) {
  return (
    <div className="noise-chart-fact">
      <div className="noise-chart-fact__value">{value}</div>
      <p className="noise-chart-fact__description">{description}</p>
    </div>
  )
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
  const [showHealthThresholds, setShowHealthThresholds] = useState(true)
  const showHealthThresholdsRef = useRef(showHealthThresholds)
  const getChartIndicatorLayoutRef = useRef<
    ((showThresholds: boolean) => Partial<Plotly.Layout>) | null
  >(null)
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
  const factRangeStart = visibleRange?.[0] ?? chartRangeData.rangeStart
  const factRangeEnd = visibleRange?.[1] ?? chartRangeData.rangeEnd
  const maximumNoise = useMemo(
    () => getMaximumNoiseLevelInRange(chartData.points, factRangeStart, factRangeEnd),
    [chartData.points, factRangeEnd, factRangeStart],
  )
  const aboveLimitPercentages = useMemo(
    () => getMeanAboveHealthLimitPercentagesInRange(chartData.points, factRangeStart, factRangeEnd),
    [chartData.points, factRangeEnd, factRangeStart],
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

  function handleToggleHealthThresholds() {
    const nextShowHealthThresholds = !showHealthThresholds
    showHealthThresholdsRef.current = nextShowHealthThresholds
    setShowHealthThresholds(nextShowHealthThresholds)

    const chart = chartRef.current as PlotlyChartElement | null
    const getChartIndicatorLayout = getChartIndicatorLayoutRef.current
    if (chart && getChartIndicatorLayout) {
      void Plotly.relayout(chart, getChartIndicatorLayout(nextShowHealthThresholds))
    }
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
    const dayNightShapes: NonNullable<Plotly.Layout['shapes']> = []
    const healthThresholdLines = [
      {
        period: 'nighttime' as const,
        value: LOCATION_HEALTH_THRESHOLDS.nighttime,
      },
      {
        period: 'daytime' as const,
        value: LOCATION_HEALTH_THRESHOLDS.daytime,
      },
    ]
    const healthThresholdShapes: NonNullable<Plotly.Layout['shapes']> = healthThresholdLines.map(({ value }) => ({
      type: 'line',
      xref: 'paper',
      x0: 0,
      x1: 1,
      yref: 'y',
      y0: value,
      y1: value,
      line: { color: chartColors.spike, width: 1, dash: 'dash' },
    }))
    const dayDuration = 24 * 60 * 60 * 1000

    for (let dayStart = chartRangeData.rangeStart; dayStart < chartRangeData.rangeEnd; dayStart += dayDuration) {
      const sunrise = new Date(dayStart + LOCATION_HEALTH_HOURS.daytimeStart * 60 * 60 * 1000).toISOString()
      const sunset = new Date(dayStart + LOCATION_HEALTH_HOURS.daytimeEnd * 60 * 60 * 1000).toISOString()
      const nextMidnight = new Date(dayStart + dayDuration).toISOString()

      dayNightShapes.push(
        {
          type: 'rect',
          xref: 'x',
          x0: new Date(dayStart).toISOString(),
          x1: sunrise,
          yref: 'paper',
          y0: 0,
          y1: 1,
          fillcolor: chartColors.nightzone,
          line: { width: 0 },
          layer: 'below',
        },
        {
          type: 'rect',
          xref: 'x',
          x0: sunset,
          x1: nextMidnight,
          yref: 'paper',
          y0: 0,
          y1: 1,
          fillcolor: chartColors.nightzone,
          line: { width: 0 },
          layer: 'below',
        },
      )
    }

    function getChartIndicatorLayout(showThresholds: boolean): Partial<Plotly.Layout> {
      const thresholdAnnotations: NonNullable<Plotly.Layout['annotations']> = showThresholds
        ? healthThresholdLines.map(({ period, value }) => ({
          xref: 'paper' as const,
          x: 1,
          yref: 'y' as const,
          y: value,
          text: `${period === 'daytime' ? 'Daytime' : 'Nighttime'} health limit`,
          showarrow: false,
          xanchor: 'right' as const,
          yanchor: 'bottom' as const,
          yshift: 4,
          font: { ...chartFont, color: chartColors.spike },
          bgcolor: chartColors.background,
          opacity: 0.8,
          borderpad: 2,
        }))
        : []

      return {
        shapes: [
          ...dayNightShapes,
          ...(showThresholds ? healthThresholdShapes : []),
        ],
        annotations: [
          ...thresholdAnnotations,
        ],
      }
    }

    getChartIndicatorLayoutRef.current = getChartIndicatorLayout

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

    const chartIndicatorLayout = getChartIndicatorLayout(showHealthThresholdsRef.current)
    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      paper_bgcolor: chartColors.background,
      plot_bgcolor: chartColors.background,
      font: chartFont,
      margin: { t: 48, r: 24, b: 56, l: 56 },
      hovermode: 'x',
      hoveranywhere: true,
      clickanywhere: true,
      showlegend: false,
      xaxis: {
        type: 'date',
        tickfont: chartFont,
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
      yaxis: {
        title: { text: 'Noise (dB)', font: chartFont },
        tickfont: chartFont,
        gridcolor: chartColors.grid,
        zeroline: false,
      },
      ...chartIndicatorLayout,
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
        timeOfDayIcon: getTimeOfDayIcon(measurement.timestamp),
        measurement: {
          min: measurement.min,
          minHealth: getReadingHealth(measurement.timestamp, measurement.min),
          mean: measurement.mean,
          meanHealth: getReadingHealth(measurement.timestamp, measurement.mean),
          max: measurement.max,
          maxHealth: getReadingHealth(measurement.timestamp, measurement.max),
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
      getChartIndicatorLayoutRef.current = null
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
      timeOfDayIcon: getTimeOfDayIcon(new Date(fraction).toISOString()),
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
          <button
            type="button"
            className="noise-chart-download"
            onClick={handleToggleHealthThresholds}
            aria-pressed={showHealthThresholds}
          >
            {showHealthThresholds ? 'Hide limits' : 'Show limits'}
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
        <div className="noise-chart-facts" aria-label="Noise history statistics">
          <NoiseFactCard
            value={maximumNoise === null ? '—' : <>{maximumNoise.toFixed(1)} <span style={{ fontSize: '0.6em' }}>dB</span></>}
            description="highest noise level recorded"
          />
          <NoiseFactCard
            value={aboveLimitPercentages.daytime === null ? '—' : `${Math.round(aboveLimitPercentages.daytime)}%`}
            description="of daytime measurements (07:00–23:00) exceed the 55 dB health limit set by the WHO"
          />
          <NoiseFactCard
            value={aboveLimitPercentages.nighttime === null ? '—' : `${Math.round(aboveLimitPercentages.nighttime)}%`}
            description="of nighttime measurements (23:00–07:00) exceed the 40 dB health limit set by the WHO"
          />
        </div>
        {tooltip && (
          <div
            ref={tooltipRef}
            className="noise-chart-tooltip"
            style={{ left: tooltip.left, top: tooltip.top }}
            role="status"
          >
            <div className="noise-chart-tooltip__date">
              {tooltip.timestamp}
              {tooltip.timeOfDayIcon && (
                <span className="material-symbols-outlined" aria-hidden="true">
                  {tooltip.timeOfDayIcon}
                </span>
              )}
            </div>
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