import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseGranularity, NoiseMeasurement } from './sensors.api.ts'
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
  min: number
  minHealth: LocationHealth
  mean: number
  meanHealth: LocationHealth
  max: number
  maxHealth: LocationHealth
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
  start,
  end,
  onStartChange,
  onEndChange,
  onGranularityChange,
}: NoiseChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null)

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

    if (!chart || chartData.points.length === 0) {
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
        min: measurement.min,
        minHealth: getLocationHealth(active, measurement.timestamp, measurement.min),
        mean: measurement.mean,
        meanHealth: getLocationHealth(active, measurement.timestamp, measurement.mean),
        max: measurement.max,
        maxHealth: getLocationHealth(active, measurement.timestamp, measurement.max),
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
  }, [active, chartData, granularity, measurements])

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
        {tooltip && (
          <div
            ref={tooltipRef}
            className="noise-chart-tooltip"
            style={{ left: tooltip.left, top: tooltip.top }}
            role="status"
          >
            <div className="noise-chart-tooltip__date">{tooltip.timestamp}</div>
            <div className="noise-chart-tooltip__value">
              <span className="noise-chart-tooltip__label">Max</span>
              <span
                className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${tooltip.maxHealth}`}
                style={{ width: `${tooltip.max.toFixed(1).length}ch` }}
              >
                {tooltip.max.toFixed(1)}
              </span>
              <span className="noise-chart-tooltip__unit">dB</span>
            </div>
            <div className="noise-chart-tooltip__value">
              <span className="noise-chart-tooltip__label">Avg</span>
              <span
                className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${tooltip.meanHealth}`}
                style={{ width: `${tooltip.mean.toFixed(1).length}ch` }}
              >
                {tooltip.mean.toFixed(1)}
              </span>
              <span className="noise-chart-tooltip__unit">dB</span>
            </div>
            <div className="noise-chart-tooltip__value">
              <span className="noise-chart-tooltip__label">Min</span>
              <span
                className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${tooltip.minHealth}`}
                style={{ width: `${tooltip.min.toFixed(1).length}ch` }}
              >
                {tooltip.min.toFixed(1)}
              </span>
              <span className="noise-chart-tooltip__unit">dB</span>
            </div>
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