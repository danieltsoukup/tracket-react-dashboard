import './index.css'
import { useEffect, useState } from 'react'
import { fetchLocations, type Location } from './lib/locations.ts'

function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let isCurrentRequest = true

    fetchLocations(controller.signal)
      .then((loadedLocations) => {
        if (!isCurrentRequest) {
          return
        }

        setLocations(loadedLocations)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!isCurrentRequest || (loadError instanceof DOMException && loadError.name === 'AbortError')) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load locations.')
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
  }, [])

  const activeLocations = locations.filter((location) => location.active)

  return (
    <main className="page-content">
      <p className="eyebrow">Tracket dashboard</p>
      <h1>Locations</h1>
      {isLoading && <p className="status-message">Loading sensor locations...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}
      {!isLoading && !error && (
        <>
          <section className="stats" aria-label="Location statistics">
            <div className="stat">
              <span className="stat-label">Total sensors</span>
              <strong>{locations.length}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">Active sensors</span>
              <strong>{activeLocations.length}</strong>
            </div>
          </section>
          <ul className="location-list">
            {locations.map((location) => (
              <li className="location-row" key={location.id}>
                <span className={`sensor-status ${location.active ? 'sensor-status--active' : ''}`} />
                <span>
                  <strong>{location.label}</strong>
                  <small>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </small>
                </span>
                <span className="location-noise">{location.hourMean.toFixed(1)} dB</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}

function App() {
  return (
    <>
      <header className="app-header">
        <a className="brand" href="/locations">
          Tracket
        </a>
      </header>
      <LocationsPage />
    </>
  )
}

export default App
