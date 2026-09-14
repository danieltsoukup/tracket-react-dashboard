/**
 * @file SensorPage.tsx
 * @description Page for displaying sensor details.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLocation } from '../locations/locations.api.ts'
import type { Location } from '../locations/locations.types.ts'
import { fetchSensorNoise, type NoiseMeasurement } from './sensors.api.ts'

function SensorPage() {
  const { sensorId } = useParams<{ sensorId: string }>()
  const [location, setLocation] = useState<Location | null>(null)
  const [measurements, setMeasurements] = useState<NoiseMeasurement[]>([])
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const [isNoiseLoading, setIsNoiseLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [noiseError, setNoiseError] = useState<string | null>(null)
  const parsedSensorId = Number(sensorId)
  const hasValidSensorId = Number.isInteger(parsedSensorId) && parsedSensorId > 0

  useEffect(() => {
    /**
     * Fetches the sensor location data when the component mounts or when the sensorId changes.
     */
    const controller = new AbortController()
    let isCurrentRequest = true
    let hasLoadedLocation = false

    if (!hasValidSensorId) {
      setLocation(null)
      setMeasurements([])
      setLocationError('The sensor ID is invalid.')
      setNoiseError(null)
      setIsLocationLoading(false)
      setIsNoiseLoading(false)

      return () => {
        isCurrentRequest = false
        controller.abort()
      }
    }

    setLocation(null)
    setMeasurements([])
    setIsLocationLoading(true)
    setIsNoiseLoading(false)
    setLocationError(null)
    setNoiseError(null)

    fetchLocation(parsedSensorId, controller.signal)
      .then((loadedLocation) => {
        if (!isCurrentRequest) {
          return
        }

        setLocation(loadedLocation)
        hasLoadedLocation = true
        setIsLocationLoading(false)
        setIsNoiseLoading(true)

        return fetchSensorNoise(parsedSensorId, {
          granularity: 'raw',
          latestTimestamp: loadedLocation.latestTimestamp,
          signal: controller.signal,
        })
      })
      .then((loadedMeasurements) => {
        if (isCurrentRequest && loadedMeasurements) {
          setMeasurements(loadedMeasurements)
          setIsNoiseLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        if (!hasLoadedLocation) {
          setLocationError(loadError instanceof Error ? loadError.message : 'Unable to load sensor location.')
          setIsLocationLoading(false)
        } else {
          setNoiseError(loadError instanceof Error ? loadError.message : 'Unable to load sensor measurements.')
          setIsNoiseLoading(false)
        }
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [hasValidSensorId, parsedSensorId])

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
        {isLocationLoading && <p>Loading sensor location...</p>}
        {locationError && <p role="alert">{locationError}</p>}
        {!isLocationLoading && !locationError && location && (
          <>
            <p className="sensor-page__eyebrow">Sensor {location.id}</p>
            <h1>{location.label}</h1>
            <p>
              {location.latitude}, {location.longitude}
            </p>
            <p>Latest hourly mean: {location.hourMean.toFixed(1)} dB</p>
            {isNoiseLoading && <p>Loading sensor measurements...</p>}
            {noiseError && <p role="alert">{noiseError}</p>}
            {!isNoiseLoading && !noiseError && <p>{measurements.length} measurements loaded.</p>}
          </>
        )}
        <Link to="/locations">Back to locations</Link>
      </section>
    </main>
  )
}

export default SensorPage