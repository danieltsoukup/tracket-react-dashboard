import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseMeasurement } from './sensors.api.ts'

type NoiseChartProps = {
  measurements: NoiseMeasurement[]
}

const chartColors = {
  min: '#FDCB80',
  fill: '#FDCB80',
  max: '#FDCB80',
  mean: '#E25100',
  background: '#FFF9F0',
}

export function NoiseChart({ measurements }: NoiseChartProps) {
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

  return <div ref={chartRef} className="noise-chart" aria-label="Sensor noise over time" />
}