import { useEffect, useMemo, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist'
import type { NoiseMeasurement } from './sensors.api.ts'
import { prepareHourlyProfileData } from './hourlyProfileData.ts'
import { chartColors, chartFont, dayNightIcons } from '../config.ts'
import { getTimeOfDayIcon } from './chartTooltip.ts'
import type { TimeOfDayIcon } from './chartTooltip.ts'
import {
  getLocationHealth,
  LOCATION_HEALTH_HOURS,
  LOCATION_HEALTH_THRESHOLDS,
} from '../locations/locations.config.ts'
import type { LocationHealth } from '../locations/locations.config.ts'
import { getSensorLocalDate } from '../../utils/sensorLocalTime.ts'

type HourlyProfileTooltip = {
  left: number
  top: number
  hour: number
  timeOfDayIcon: TimeOfDayIcon
  min: number
  max: number
  mean: number
  minHealth: LocationHealth
  maxHealth: LocationHealth
  meanHealth: LocationHealth
}

type HourlyProfileProps = {
  active: boolean
  measurements: NoiseMeasurement[]
}

const profileDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const profileYearFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  timeZone: 'UTC',
})

function formatProfileDateRange(measurements: NoiseMeasurement[]) {
  const dates = measurements
    .map((measurement) => getSensorLocalDate(measurement.timestamp))
    .filter(Boolean)
    .sort()
  const startDate = dates[0]
  const endDate = dates.at(-1)

  if (!startDate || !endDate) {
    return ''
  }

  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  const startLabel = profileDateFormatter.format(start)
  const endLabel = profileDateFormatter.format(end)
  const startYear = profileYearFormatter.format(start)
  const endYear = profileYearFormatter.format(end)

  if (startDate === endDate) {
    return `${startLabel}, ${startYear}`
  }

  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${startLabel}, ${startYear}-${endLabel}, ${endYear}`
  }

  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${startLabel}-${endLabel}, ${endYear}`
  }

  return `${startLabel}-${end.getUTCDate()}, ${endYear}`
}

export function HourlyProfile({ active, measurements }: HourlyProfileProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<HourlyProfileTooltip | null>(null)
  const profile = useMemo(() => prepareHourlyProfileData(measurements), [measurements])
  const hasProfileData = profile.some((point) => point.count > 0)
  const profileDateRange = formatProfileDateRange(measurements)

  useEffect(() => {
    const chart = chartRef.current

    if (!chart || !hasProfileData) {
      return
    }

    const loopedProfile = [...profile, { ...profile[0], hour: 24 }]
    const hours = loopedProfile.map((point) => point.hour)
    const minimumValue = Math.min(
      30,
      ...profile
        .flatMap((point) => [point.min, point.max, point.mean])
        .filter((value): value is number => value !== null),
    )
    const traces: Plotly.Data[] = [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Minimum',
        x: hours,
        y: loopedProfile.map((point) => point.min),
        line: { color: chartColors.min, width: 1 },
        hoverinfo: 'none',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Maximum',
        x: hours,
        y: loopedProfile.map((point) => point.max),
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
        y: loopedProfile.map((point) => point.mean),
        line: { color: chartColors.mean, width: 3 },
        hoverinfo: 'none',
      },
    ]

    const healthThresholdLines = [
      {
        value: LOCATION_HEALTH_THRESHOLDS.nighttime,
        icon: dayNightIcons.night,
      },
      {
        value: LOCATION_HEALTH_THRESHOLDS.daytime,
        icon: dayNightIcons.day,
      },
    ]

    const nightZones = [
      { start: 0, end: LOCATION_HEALTH_HOURS.daytimeStart },
      { start: LOCATION_HEALTH_HOURS.daytimeEnd, end: 24 },
    ]

    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      paper_bgcolor: chartColors.background,
      plot_bgcolor: chartColors.background,
      font: chartFont,
      margin: { t: 32, r: 16, b: 48, l: 48 },
      showlegend: false,
      xaxis: {
        title: {
          text: profileDateRange,
          standoff: 10,
          font: chartFont,
        },
        tickfont: chartFont,
        tickmode: 'array',
        tickvals: [0, 6, 12, 18, 24],
        ticktext: ['00:00', '06:00', '12:00', '18:00', '00:00'],
        range: [0, 24],
        gridcolor: chartColors.grid,
        zeroline: false,
        fixedrange: true,
        showspikes: true,
        spikemode: 'across',
        spikesnap: 'cursor',
        spikecolor: chartColors.spike,
        spikethickness: 1,
        spikedash: 'dot',
      },
      yaxis: {
        title: { text: 'Noise (dB)', font: chartFont },
        tickfont: chartFont,
        range: [minimumValue, null],
        autorange: 'max',
        gridcolor: chartColors.grid,
        zeroline: false,
        fixedrange: true,
      },
      shapes: [
        ...nightZones.map(({ start, end }) => ({
          type: 'rect' as const,
          xref: 'x' as const,
          x0: start,
          x1: end,
          yref: 'paper' as const,
          y0: 0,
          y1: 1,
          fillcolor: '#E9ECEA',
          line: { width: 0 },
          layer: 'below' as const,
        })),
        ...healthThresholdLines.map(({ value }) => ({
          type: 'line' as const,
          xref: 'x' as const,
          x0: 0,
          x1: 24,
          yref: 'y' as const,
          y0: value,
          y1: value,
          line: { color: chartColors.spike, width: 1, dash: 'dash' as const },
        })),
        ...healthThresholdLines.map(({ value }) => ({
          type: 'circle' as const,
          xref: 'x' as const,
          xsizemode: 'pixel' as const,
          xanchor: 0.15,
          x0: 0,
          x1: 22,
          yref: 'y' as const,
          ysizemode: 'pixel' as const,
          yanchor: value,
          y0: -11,
          y1: 11,
          fillcolor: 'rgba(255, 255, 255, 0.55)',
          line: { width: 0 },
          layer: 'above' as const,
        })),
      ],
      annotations: [
        ...healthThresholdLines.map(({ value, icon }) => ({
          xref: 'x' as const,
          x: 0.15,
          xshift: 11,
          yref: 'y' as const,
          y: value,
          text: `<span style="font-family: 'Material Symbols Outlined'; font-weight: 400">${icon}</span>`,
          showarrow: false,
          xanchor: 'center' as const,
          yanchor: 'middle' as const,
          font: { color: chartColors.spike, size: 14 },
        })),
      ],
      hovermode: 'x',
      hoveranywhere: true,
      clickanywhere: true,
    }

      const plot = chart as unknown as Plotly.PlotlyHTMLElement
      let disposed = false

      function showHourTooltip(
        pointNumber: number | undefined,
        xValue: unknown,
        xPixel: number | undefined,
        yPixel: number | undefined,
        mouseEvent: MouseEvent | undefined,
      ) {
        if (!chart) {
          return
        }

        let hour = pointNumber === undefined ? undefined : pointNumber % profile.length

        if (hour === undefined || !profile[hour]?.count) {
          const targetHour = typeof xValue === 'number' ? xValue : Number(xValue)
          if (!Number.isFinite(targetHour)) {
            return
          }

          const normalizedTargetHour = ((targetHour % 24) + 24) % 24
          let closestDistance = Number.POSITIVE_INFINITY
          profile.forEach((point) => {
            if (point.count === 0) {
              return
            }

            const directDistance = Math.abs(point.hour - normalizedTargetHour)
            const distance = Math.min(directDistance, 24 - directDistance)
            if (distance < closestDistance) {
              closestDistance = distance
              hour = point.hour
            }
          })
        }

        if (hour === undefined) {
          return
        }

        const point = profile[hour]
        if (!point || point.count === 0 || point.min === null || point.max === null || point.mean === null) {
          return
        }

        const bounds = chart.getBoundingClientRect()
        const pointX = xPixel ?? (mouseEvent ? mouseEvent.clientX - bounds.left : bounds.width / 2)
        const pointY = yPixel ?? (mouseEvent ? mouseEvent.clientY - bounds.top : bounds.height / 2)
        const tooltipWidth = tooltipRef.current?.offsetWidth ?? 180
        const preferredLeft = pointX + 14 + tooltipWidth > bounds.width ? pointX - tooltipWidth - 14 : pointX + 14
        const left = Math.max(8, Math.min(preferredLeft, bounds.width - tooltipWidth - 8))

        setTooltip({
          left,
          top: pointY - 12,
          hour: point.hour,
          timeOfDayIcon: getTimeOfDayIcon(`2000-01-01T${String(point.hour).padStart(2, '0')}:00:00Z`) ?? dayNightIcons.night,
          min: point.min,
          max: point.max,
          mean: point.mean,
          minHealth: getLocationHealth(active, `2000-01-01T${String(point.hour).padStart(2, '0')}:00:00Z`, point.min),
          maxHealth: getLocationHealth(active, `2000-01-01T${String(point.hour).padStart(2, '0')}:00:00Z`, point.max),
          meanHealth: getLocationHealth(active, `2000-01-01T${String(point.hour).padStart(2, '0')}:00:00Z`, point.mean),
        })
      }

      const handleHover = (event: Plotly.PlotHoverEvent) => {
        const point = event.points[0]
        showHourTooltip(point?.pointNumber, event.xvals[0], event.xPixel ?? point?.xPixel, event.yPixel ?? point?.yPixel, event.event)
      }
      const handleClick = (event: Plotly.PlotMouseEvent) => {
        const clickEvent = event as Plotly.PlotMouseEvent & { xvals?: Plotly.PlotHoverEvent['xvals'] }
        const point = event.points[0]
        showHourTooltip(point?.pointNumber, clickEvent.xvals?.[0], event.xPixel ?? point?.xPixel, event.yPixel ?? point?.yPixel, event.event)
      }
      const handleUnhover = () => setTooltip(null)

      void Plotly.newPlot(chart, traces, layout, {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
      }).then(() => {
        if (!disposed) {
          plot.on('plotly_hover', handleHover)
          plot.on('plotly_click', handleClick)
          plot.on('plotly_unhover', handleUnhover)
        }
      })

      return () => {
        disposed = true
        plot.removeAllListeners('plotly_hover')
        plot.removeAllListeners('plotly_click')
        plot.removeAllListeners('plotly_unhover')
        setTooltip(null)
        void Plotly.purge(chart)
      }
  }, [active, hasProfileData, profile])

  if (!hasProfileData) {
    return <p className="hourly-profile__empty">No hourly profile data available.</p>
  }

  return (
    <div className="hourly-profile">
      <div ref={chartRef} className="hourly-profile-chart" aria-label="Average noise by hour of day" />
      {tooltip && (
        <div
          ref={tooltipRef}
          className="noise-chart-tooltip hourly-profile-tooltip"
          style={{ left: tooltip.left, top: tooltip.top }}
          role="status"
        >
          <div className="noise-chart-tooltip__date">
            {`${String(tooltip.hour).padStart(2, '0')}:00–${String((tooltip.hour + 1) % 24).padStart(2, '0')}:00`}
            <span className="material-symbols-outlined" aria-hidden="true">{tooltip.timeOfDayIcon}</span>
          </div>
          {([
            ['Max', tooltip.max, tooltip.maxHealth],
            ['Mean', tooltip.mean, tooltip.meanHealth],
            ['Min', tooltip.min, tooltip.minHealth],
          ] as const).map(([label, value, health]) => (
            <div className="noise-chart-tooltip__value" key={label}>
              <span className="noise-chart-tooltip__label">{label}</span>
              <span
                className={`noise-chart-tooltip__reading noise-chart-tooltip__reading--${health}`}
                style={{ width: `${value.toFixed(1).length}ch` }}
              >
                {value.toFixed(1)}
              </span>
              <span className="noise-chart-tooltip__unit">dB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}