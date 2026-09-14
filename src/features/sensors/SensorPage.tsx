/**
 * @file SensorPage.tsx
 * @description Page for displaying sensor details.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLocation } from '../locations/locations.api.ts'
import type { Location } from '../locations/locations.types.ts'

function SensorPage() {
  const { sensorId } = useParams<{ sensorId: string }>()
  const [location, setLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const parsedSensorId = Number(sensorId)
  const hasValidSensorId = Number.isInteger(parsedSensorId) && parsedSensorId > 0

  useEffect(() => {
    const controller = new AbortController()
    let isCurrentRequest = true

    if (!hasValidSensorId) {
      setLocation(null)
      setError('The sensor ID is invalid.')
      setIsLoading(false)

      return () => {
        isCurrentRequest = false
        controller.abort()
      }
    }

    setIsLoading(true)
    setError(null)

    fetchLocation(parsedSensorId, controller.signal)
      .then((loadedLocation) => {
        if (isCurrentRequest) {
          setLocation(loadedLocation)
        }
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        setLocation(null)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load sensor location.')
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false)
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
        {isLoading && <p>Loading sensor location...</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && location && (
          <>
            <p className="sensor-page__eyebrow">Sensor {location.id}</p>
            <h1>{location.label}</h1>
            <p>
              {location.latitude}, {location.longitude}
            </p>
            <p>Latest hourly mean: {location.hourMean.toFixed(1)} dB</p>
          </>
        )}
        <Link to="/locations">Back to locations</Link>
      </section>
    </main>
  )
}

export default SensorPage