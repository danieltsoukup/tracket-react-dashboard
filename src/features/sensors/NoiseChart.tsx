import { useEffect, useRef } from 'react'
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

export function NoiseChart({ measurements, granularity, isLoading, onGranularityChange }: NoiseChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const chart = chartRef.current

    if (!chart || measurements.length === 0) {
      return
    }

    const timestamps = measurements.map((measurement) => measurement.timestamp)
    const traces: Plotly.Data[] = [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Minimum',
        x: timestamps,
        y: measurements.map((measurement) => measurement.min),
        line: { color: chartColors.min, width: 0.5 },
        hovertemplate: 'Min: %{y:.1f} dB<extra></extra>',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Maximum',
        x: timestamps,
        y: measurements.map((measurement) => measurement.max),
        line: { color: chartColors.max, width: 0.5 },
        fill: 'tonexty',
        fillcolor: chartColors.fill,
        opacity: 0.35,
        hovertemplate: 'Max: %{y:.1f} dB<extra></extra>',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Mean',
        x: timestamps,
        y: measurements.map((measurement) => measurement.mean),
        line: { color: chartColors.mean, width: 1.5 },
        hovertemplate: 'Mean: %{y:.1f} dB<extra></extra>',
      },
    ]

    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      paper_bgcolor: chartColors.background,
      plot_bgcolor: chartColors.background,
      margin: { t: 24, r: 24, b: 56, l: 56 },
      hovermode: 'x unified',
      showlegend: false,
      xaxis: { type: 'date', gridcolor: '#F0DDC2', zeroline: false },
      yaxis: { title: { text: 'Noise (dB)' }, gridcolor: '#F0DDC2', zeroline: false },
    }

    void Plotly.newPlot(chart, traces, layout, { responsive: true, displayModeBar: false, displaylogo: false })

    return () => {
      void Plotly.purge(chart)
    }
  }, [measurements])

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
        {isLoading && (
          <div className="noise-chart__loading" role="status" aria-live="polite">
            Loading {granularity} measurements...
          </div>
        )}
      </div>
    </section>
  )
}