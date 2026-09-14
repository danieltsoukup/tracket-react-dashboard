/**
 * @file SensorPage.tsx
 * @description Page for displaying sensor details.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchLocation } from '../locations/locations.api.ts'
import type { Location } from '../locations/locations.types.ts'
import { fetchSensorNoise, type NoiseGranularity, type NoiseMeasurement } from './sensors.api.ts'
import { LatestNoiseReading } from './LatestNoiseReading.tsx'
import { NoiseChart } from './NoiseChart.tsx'
import { SensorLocationMap } from './SensorLocationMap.tsx'
import { SensorPanel } from './SensorPanel.tsx'

function SensorPage() {
  const { sensorId } = useParams<{ sensorId: string }>()
  const [location, setLocation] = useState<Location | null>(null)
  const [measurements, setMeasurements] = useState<NoiseMeasurement[]>([])
  const [hourlyMeasurements, setHourlyMeasurements] = useState<NoiseMeasurement[]>([])
  const [granularity, setGranularity] = useState<NoiseGranularity>('hourly')
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const [isNoiseLoading, setIsNoiseLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [noiseError, setNoiseError] = useState<string | null>(null)
  const measurementsCache = useRef(new Map<string, NoiseMeasurement[]>())
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

        setLocation(loadedLocation)
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
      setHourlyMeasurements([])
      setIsNoiseLoading(false)
      return
    }

    const controller = new AbortController()
    let isCurrentRequest = true
    const cacheKey = `${parsedSensorId}:${location.latestTimestamp}:${granularity}`
    const cachedMeasurements = measurementsCache.current.get(cacheKey)

    if (cachedMeasurements) {
      setMeasurements(cachedMeasurements)
      if (granularity === 'hourly') {
        setHourlyMeasurements(cachedMeasurements)
      }
      setIsNoiseLoading(false)
      setNoiseError(null)
      return
    }

    setIsNoiseLoading(true)
    setNoiseError(null)

    fetchSensorNoise(parsedSensorId, {
      granularity,
      latestTimestamp: location.latestTimestamp,
      signal: controller.signal,
    })
      .then((loadedMeasurements) => {
        if (isCurrentRequest) {
          measurementsCache.current.set(cacheKey, loadedMeasurements)
          setMeasurements(loadedMeasurements)
          if (granularity === 'hourly') {
            setHourlyMeasurements(loadedMeasurements)
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
  }, [granularity, hasValidSensorId, location, parsedSensorId])

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
            {measurements.length > 0 && (
              <>
                <div className="sensor-insights">
                  <SensorPanel title="Latest hourly recording">
                    <LatestNoiseReading measurements={hourlyMeasurements} />
                  </SensorPanel>
                  <SensorPanel title={location.label}>
                    <SensorLocationMap location={location} />
                  </SensorPanel>
                </div>
                <NoiseChart
                  measurements={measurements}
                  granularity={granularity}
                  isLoading={isNoiseLoading}
                  onGranularityChange={setGranularity}
                />
              </>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default SensorPage