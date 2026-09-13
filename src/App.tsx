import './index.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LocationsPage from './features/locations/LocationsPage.tsx'
import SensorPage from './features/sensors/SensorPage.tsx'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/locations" element={<LocationsPage />} />
				<Route path="/locations/:sensorId" element={<SensorPage />} />
				<Route path="*" element={<Navigate to="/locations" replace />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
