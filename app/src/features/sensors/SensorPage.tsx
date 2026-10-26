/**
 * @file SensorPage.tsx
 * @description Page for displaying sensor details.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchLocation } from '../locations/locations.api.ts'
import { isLocationActive } from '../locations/locations.config.ts'
import type { Location } from '../locations/locations.types.ts'
import { fetchSensorNoise, type NoiseGranularity, type NoiseMeasurement } from './sensors.api.ts'
import { fetchSensorAnnotations, type Annotation } from './annotations.api.ts'
import { LatestNoiseReading } from './LatestNoiseReading.tsx'
import { HourlyProfile } from './HourlyProfile.tsx'
import { NoiseChart } from './NoiseChart.tsx'
import { prepareNoiseChartData, type NoiseChartData } from './noiseChartData.ts'
import { SensorLocationMap } from './SensorLocationMap.tsx'
import { SensorPanel } from './SensorPanel.tsx'
import { getSensorLocalDate, shiftSensorLocalDate, toSensorLocalTimestamp } from '../../utils/sensorLocalTime.ts'
import { dayNightIcons } from '../config.ts'
import { WHOReference } from '../infoModal.tsx'

function SensorPage() {
  const { sensorId } = useParams<{ sensorId: string }>()
  const [location, setLocation] = useState<Location | null>(null)
  const [measurements, setMeasurements] = useState<NoiseMeasurement[]>([])
  const [chartData, setChartData] = useState<NoiseChartData>(() => prepareNoiseChartData([]))
  const [hourlyMeasurements, setHourlyMeasurements] = useState<NoiseMeasurement[]>([])
  const [profileMeasurements, setProfileMeasurements] = useState<NoiseMeasurement[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [granularity, setGranularity] = useState<NoiseGranularity>('hourly')
  const [chartStart, setChartStart] = useState('')
  const [chartEnd, setChartEnd] = useState('')
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const [isNoiseLoading, setIsNoiseLoading] = useState(false)
  const [areAnnotationsLoading, setAreAnnotationsLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [noiseError, setNoiseError] = useState<string | null>(null)
  const [annotationError, setAnnotationError] = useState<string | null>(null)
  const measurementsCache = useRef(new Map<string, NoiseMeasurement[]>())
  const annotationsCache = useRef(new Map<string, Annotation[]>())
  const parsedSensorId = Number(sensorId)
  const hasValidSensorId = Number.isInteger(parsedSensorId) && parsedSensorId > 0
  const isInitialLoading = isLocationLoading || (location !== null && measurements.length === 0 && isNoiseLoading)

  useEffect(() => {
    /**
     * Fetch the sensor location when the component mounts or when the sensorId changes.
     */
    const controller = new AbortController()
    let isCurrentRequest = true

    if (!hasValidSensorId) {
      setLocation(null)
      setLocationError('The sensor ID is invalid.')
      setIsLocationLoading(false)

      return () => {
        isCurrentRequest = false
        controller.abort()
      }
    }

    setLocation(null)
    setIsLocationLoading(true)
    setLocationError(null)

    fetchLocation(parsedSensorId, controller.signal)
      .then((loadedLocation) => {
        if (!isCurrentRequest) {
          return
        }

        setLocation({
          ...loadedLocation,
          active: isLocationActive(loadedLocation.latestTimestamp),
        })
        setChartEnd(getSensorLocalDate(loadedLocation.latestTimestamp))
        setChartStart(shiftSensorLocalDate(loadedLocation.latestTimestamp, -7))
        setIsLocationLoading(false)
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        setLocationError(loadError instanceof Error ? loadError.message : 'Unable to load sensor location.')
        setIsLocationLoading(false)
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [hasValidSensorId, parsedSensorId])

  useEffect(() => {
    if (!hasValidSensorId || !location || location.id !== parsedSensorId) {
      setMeasurements([])
      setChartData(prepareNoiseChartData([]))
      setHourlyMeasurements([])
      setProfileMeasurements([])
      setIsNoiseLoading(false)
      return
    }

    if (!chartStart || !chartEnd || chartStart > chartEnd) {
      setMeasurements([])
      setChartData(prepareNoiseChartData([]))
      setIsNoiseLoading(false)
      return
    }

    const controller = new AbortController()
    let isCurrentRequest = true
    const start = toSensorLocalTimestamp(chartStart, '00:00:00', location.latestTimestamp)
    const end = toSensorLocalTimestamp(chartEnd, '23:59:00', location.latestTimestamp)
    const cacheKey = `${parsedSensorId}:${location.latestTimestamp}:${granularity}:${start}:${end}`
    const isDefaultHourlyRange = granularity === 'hourly' &&
      chartStart === shiftSensorLocalDate(location.latestTimestamp, -7) &&
      chartEnd === getSensorLocalDate(location.latestTimestamp)
    const cachedMeasurements = measurementsCache.current.get(cacheKey)

    if (cachedMeasurements) {
      setMeasurements(cachedMeasurements)
      setChartData(prepareNoiseChartData(cachedMeasurements))
      if (granularity === 'hourly') {
        setHourlyMeasurements(cachedMeasurements)
      }
      if (isDefaultHourlyRange) {
        setProfileMeasurements(cachedMeasurements)
      }
      setIsNoiseLoading(false)
      setNoiseError(null)
      return
    }

    setIsNoiseLoading(true)
    setNoiseError(null)

    fetchSensorNoise(parsedSensorId, {
      granularity,
      start,
      end,
      signal: controller.signal,
    })
      .then((loadedMeasurements) => {
        if (isCurrentRequest) {
          measurementsCache.current.set(cacheKey, loadedMeasurements)
          setMeasurements(loadedMeasurements)
          setChartData(prepareNoiseChartData(loadedMeasurements))
          if (granularity === 'hourly') {
            setHourlyMeasurements(loadedMeasurements)
          }
          if (isDefaultHourlyRange) {
            setProfileMeasurements(loadedMeasurements)
          }
          setIsNoiseLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        setNoiseError(loadError instanceof Error ? loadError.message : 'Unable to load sensor measurements.')
        setIsNoiseLoading(false)
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [chartEnd, chartStart, granularity, hasValidSensorId, location, parsedSensorId])

  useEffect(() => {
    if (!hasValidSensorId || !location || location.id !== parsedSensorId) {
      setAnnotations([])
      setAreAnnotationsLoading(false)
      setAnnotationError(null)
      return
    }

    if (!chartStart || !chartEnd || chartStart > chartEnd) {
      setAnnotations([])
      setAreAnnotationsLoading(false)
      setAnnotationError(null)
      return
    }

    const startTime = toSensorLocalTimestamp(chartStart, '00:00:00', location.latestTimestamp)
    const endDateTimestamp = Date.parse(`${chartEnd}T00:00:00Z`)
    const endDate = Number.isFinite(endDateTimestamp)
      ? new Date(endDateTimestamp + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : ''
    const endTime = toSensorLocalTimestamp(endDate, '00:00:00', location.latestTimestamp)

    if (!startTime || !endTime) {
      setAnnotations([])
      setAreAnnotationsLoading(false)
      setAnnotationError('Unable to determine the annotation time range.')
      console.error('Unable to determine the annotation time range.')
      return
    }

    const cacheKey = `${parsedSensorId}:${startTime}:${endTime}`
    const cachedAnnotations = annotationsCache.current.get(cacheKey)

    if (cachedAnnotations) {
      setAnnotations(cachedAnnotations)
      setAreAnnotationsLoading(false)
      setAnnotationError(null)
      return
    }

    const controller = new AbortController()
    let isCurrentRequest = true
    setAnnotations([])
    setAreAnnotationsLoading(true)
    setAnnotationError(null)

    fetchSensorAnnotations(parsedSensorId, startTime, endTime, controller.signal)
      .then((loadedAnnotations) => {
        if (isCurrentRequest) {
          annotationsCache.current.set(cacheKey, loadedAnnotations)
          setAnnotations(loadedAnnotations)
          setAreAnnotationsLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        setAnnotationError(loadError instanceof Error ? loadError.message : 'Unable to load annotations.')
        console.error('Failed to load sensor annotations.', loadError)
        setAreAnnotationsLoading(false)
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [chartEnd, chartStart, hasValidSensorId, location, parsedSensorId])

  return (
    <main className="sensor-page">
      <header className="sensor-header">
        <a className="sensor-header__brand" href="https://tracket.info/" aria-label="Tracket">
          <img src="/tracket_logo.svg" alt="Tracket" />
        </a>
        <nav className="sensor-header__actions" aria-label="Account links">
          <a href="/locations" target="_blank" rel="noreferrer">
            Locations
          </a>
          <a href="https://opencollective.com/tRacket" target="_blank" rel="noreferrer">
            Donate
          </a>
          <a href="https://tracket.info/sensor/" target="_blank" rel="noreferrer">
            Get Sensor
          </a>
          <a className="sensor-header__login" href="https://manage.tracket.info/" target="_blank" rel="noreferrer">
            Login
          </a>
        </nav>
      </header>

      <section className="sensor-page__content">
        {isInitialLoading && !locationError && <p className="sensor-page__loading" role="status">Loading sensor...</p>}
        {locationError && <p role="alert">{locationError}</p>}
        {!isInitialLoading && !isLocationLoading && !locationError && location && (
          <>
            {noiseError && <p role="alert">{noiseError}</p>}
            <>
              {(measurements.length > 0 || profileMeasurements.length > 0) && (
                <div className="sensor-insights">
                  <SensorPanel title="Last hourly record" icon="last_page">
                    <LatestNoiseReading active={location.active} measurements={hourlyMeasurements} />
                  </SensorPanel>
                  <SensorPanel
                    title="Daily noise profile"
                    icon="show_chart"
                    infoContent={(
                      <>
                        <p>
                          This chart shows typical noise levels for each hour of the day, averaged across the most recent seven days of hourly measurements.
                        </p>
                        <p>
                          The shading highlights nighttime. WHO outdoor noise health limits are:
                        </p>
                        <ul>
                          <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.day}</span><span><strong>07:00-23:00:</strong> keep below 55 dB</span></li>
                          <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.night}</span><span><strong>23:00-07:00:</strong> keep below 40 dB</span></li>
                        </ul>
                        <WHOReference />
                      </>
                    )}
                  >
                    <HourlyProfile active={location.active} measurements={profileMeasurements} />
                  </SensorPanel>
                  <SensorPanel title={location.label} icon="location_on">
                    <SensorLocationMap location={location} />
                  </SensorPanel>
                </div>
              )}
              <SensorPanel
                title="Noise history"
                icon="calendar_month"
                infoContent={(
                  <>
                    <p>
                      Explore this sensor&apos;s noise measurements over a selected date range.
                    </p>
                    <p>
                      You can swap between hourly aggregates and the raw measurements - we recommend loading a shorter date range for raw measurements to avoid long load times. Use the date fields to change the displayed period; annotations, when available, appear below the chart.
                    </p>
                    <p>
                      The dashed lines mark the WHO outdoor noise health limits. The cards below the chart show the maximum recorded value and the percentage of measurements above each limit:
                    </p>
                    <ul>
                      <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.day}</span><span><strong>07:00-23:00:</strong> keep below 55 dB</span></li>
                      <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.night}</span><span><strong>23:00-07:00:</strong> keep below 40 dB</span></li>
                    </ul>
                    <p>
                      <WHOReference />
                    </p>
                  </>
                )}
              >
                <NoiseChart
                  active={location.active}
                  measurements={measurements}
                  chartData={chartData}
                  granularity={granularity}
                  isLoading={isNoiseLoading}
                  annotations={annotations}
                  areAnnotationsLoading={areAnnotationsLoading}
                  annotationError={annotationError}
                  start={chartStart}
                  end={chartEnd}
                  onStartChange={setChartStart}
                  onEndChange={setChartEnd}
                  onGranularityChange={setGranularity}
                />
              </SensorPanel>
            </>
          </>
        )}
      </section>
    </main>
  )
}

export default SensorPage