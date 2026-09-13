import './index.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LocationsPage from './features/locations/LocationsPage.tsx'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/locations" element={<LocationsPage />} />
				<Route path="*" element={<Navigate to="/locations" replace />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
