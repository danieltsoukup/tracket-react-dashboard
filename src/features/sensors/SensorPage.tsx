/**
 * @file SensorPage.tsx
 * @description Placeholder for the sensor details page.
 */
import { Link, useParams } from 'react-router-dom'

function SensorPage() {
  const { sensorId } = useParams<{ sensorId: string }>()

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
        <p className="sensor-page__eyebrow">Sensor {sensorId}</p>
        <h1>Sensor details</h1>
        <p>Sensor measurements and details will be added here.</p>
        <Link to="/locations">Back to locations</Link>
      </section>
    </main>
  )
}

export default SensorPage