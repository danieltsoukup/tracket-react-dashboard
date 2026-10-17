import { useEffect, useMemo, useRef } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseMeasurement } from './sensors.api.ts'
import { prepareHourlyProfileData } from './hourlyProfileData.ts'
import { chartColors } from '../config.ts'

type HourlyProfileProps = {
  measurements: NoiseMeasurement[]
}

export function HourlyProfile({ measurements }: HourlyProfileProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const profile = useMemo(() => prepareHourlyProfileData(measurements), [measurements])
  const hasProfileData = profile.some((point) => point.count > 0)

  useEffect(() => {
    const chart = chartRef.current

    if (!chart || !hasProfileData) {
      return
    }

    const hours = profile.map((point) => point.hour)
    const traces: Plotly.Data[] = [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Minimum',
        x: hours,
        y: profile.map((point) => point.min),
        line: { color: chartColors.min, width: 1 },
        hoverinfo: 'none',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Maximum',
        x: hours,
        y: profile.map((point) => point.max),
        line: { color: chartColors.max, width: 1 },
        fill: 'tonexty',
        fillcolor: chartColors.max,
        opacity: 0.35,
        hoverinfo: 'none',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Mean',
        x: hours,
        y: profile.map((point) => point.mean),
        line: { color: chartColors.mean, width: 3 },
        hoverinfo: 'none',
      },
    ]

    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      paper_bgcolor: chartColors.background,
      plot_bgcolor: chartColors.background,
      margin: { t: 20, r: 16, b: 48, l: 48 },
      showlegend: false,
      xaxis: {
        title: { text: 'Hour of day' },
        tickmode: 'array',
        tickvals: [0, 6, 12, 18, 23],
        ticktext: ['00:00', '06:00', '12:00', '18:00', '23:00'],
        range: [0, 23],
        gridcolor: chartColors.grid,
        zeroline: false,
      },
      yaxis: { title: { text: 'Noise (dB)' }, gridcolor: chartColors.grid, zeroline: false },
    }

    void Plotly.newPlot(chart, traces, layout, {
      responsive: true,
      displayModeBar: false,
      displaylogo: false,
    })

    return () => {
      void Plotly.purge(chart)
    }
  }, [hasProfileData, profile])

  if (!hasProfileData) {
    return <p className="hourly-profile__empty">No hourly profile data available.</p>
  }

  return <div ref={chartRef} className="hourly-profile-chart" aria-label="Average noise by hour of day" />
}