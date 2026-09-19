import { useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseGranularity, NoiseMeasurement } from './sensors.api.ts'

type NoiseChartProps = {
  measurements: NoiseMeasurement[]
  granularity: NoiseGranularity
  isLoading: boolean
  onGranularityChange: (granularity: NoiseGranularity) => void
}

const chartColors = {
  min: '#FDCB80',
  fill: '#FDCB80',
  max: '#FDCB80',
  mean: '#E25100',
  background: '#FFF9F0',
}

type ChartTooltip = {
  left: number
  top: number
  timestamp: string
  min: number
  mean: number
  max: number
}

const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function NoiseChart({ measurements, granularity, isLoading, onGranularityChange }: NoiseChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null)

  useEffect(() => {
    const chart = chartRef.current

    if (!chart || measurements.length === 0) {
      return
    }

    const lineWidths = granularity === 'hourly' ? { range: 1, mean: 3 } : { range: 0.5, mean: 1.5 }
    const timestamps = measurements.map((measurement) => measurement.timestamp)
    const traces: Plotly.Data[] = [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Minimum',
        x: timestamps,
        y: measurements.map((measurement) => measurement.min),
        line: { color: chartColors.min, width: lineWidths.range },
        hoverinfo: 'none',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Maximum',
        x: timestamps,
        y: measurements.map((measurement) => measurement.max),
        line: { color: chartColors.max, width: lineWidths.range },
        fill: 'tonexty',
        fillcolor: chartColors.fill,
        opacity: 0.35,
        hoverinfo: 'none',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Mean',
        x: timestamps,
        y: measurements.map((measurement) => measurement.mean),
        line: { color: chartColors.mean, width: lineWidths.mean },
        hoverinfo: 'none',
      },
    ]

    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      paper_bgcolor: chartColors.background,
      plot_bgcolor: chartColors.background,
      margin: { t: 24, r: 24, b: 56, l: 56 },
      hovermode: 'x',
      showlegend: false,
      xaxis: {
        type: 'date',
        gridcolor: '#F0DDC2',
        showspikes: true,
        spikemode: 'across',
        spikesnap: 'cursor',
        spikecolor: '#718078',
        spikethickness: 1,
        spikedash: 'dot',
        zeroline: false,
      },
      yaxis: { title: { text: 'Noise (dB)' }, gridcolor: '#F0DDC2', zeroline: false },
    }

    const handleHover = (event: Plotly.PlotHoverEvent) => {
      const point = event.points[0]
      const measurement = measurements[point.pointNumber]
      const mouseEvent = event.event

      if (!measurement || !mouseEvent) {
        return
      }

      const chartBounds = chart.getBoundingClientRect()
      setTooltip({
        left: mouseEvent.clientX - chartBounds.left + 14,
        top: mouseEvent.clientY - chartBounds.top - 12,
        timestamp: tooltipDateFormatter.format(new Date(measurement.timestamp)),
        min: measurement.min,
        mean: measurement.mean,
        max: measurement.max,
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
  }, [granularity, measurements])

  return (
    <section className="noise-chart-panel" aria-label="Sensor noise chart">
      <div className="noise-chart-panel__toolbar">
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
      </div>
      <div className="noise-chart-container">
        <div ref={chartRef} className="noise-chart" aria-label="Sensor noise over time" />
        {tooltip && (
          <div className="noise-chart-tooltip" style={{ left: tooltip.left, top: tooltip.top }} role="status">
            <div className="noise-chart-tooltip__date">{tooltip.timestamp}</div>
            <div className="noise-chart-tooltip__mean">{tooltip.mean.toFixed(1)} dB</div>
            <div className="noise-chart-tooltip__range">
              <span>Min {tooltip.min.toFixed(1)} dB</span>
              <span>Max {tooltip.max.toFixed(1)} dB</span>
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