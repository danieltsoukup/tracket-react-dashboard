/**
 * @file SensorPage.tsx
 * @description Placeholder for the sensor details page.
 */
import { Link, useParams } from 'react-router-dom'

function SensorPage() {
  const { sensorId } = useParams<{ sensorId: string }>()

  return (
    <main className="sensor-page">
      <p className="sensor-page__eyebrow">Sensor {sensorId}</p>
      <h1>Sensor details</h1>
      <p>Sensor measurements and details will be added here.</p>
      <Link to="/locations">Back to locations</Link>
    </main>
  )
}

export default SensorPage