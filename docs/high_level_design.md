# High Level App Design

## Feature summary

Frontend-only web application to present location and time-series data in a simple dashboard. Main pages are
- a `/locations` page showing a map with markers for each sensor
    - marker color encodes if the sensor is active (received data in the last hour)
    - hover tooltip to show basic information about the sensor
    - layer control to toggle active-only sensor markers
    - a floating card to show network level statistics (total number of sensors, active sensors)
- a `/locations/{sensor_id}` page for each sensor. Main components are
    - a card to show most recent noise measurement and trend (% change since last hour)
    - a card to show the map zoomed into the sensor, same marker and color coding as main page but showing the location precision circle
    - a line chart of the past 3-days of mean noise with date picker to adjust
        - a band for showing the min/max range around the mean

## Tech stack

- Vite for development and production builds
- React Router for map and object-detail routes
- React-Leaflet for the interactive map, markers, popups, and layer controls
- TanStack Query for API requests, caching, loading states, and refetching
- Plotly.js for interactive time-series visualizations
- Zustand for lightweight shared state such as selected marker, active layers, and map filters
- Tailwind CSS library for consistent UI styling
- npm for package management

## Data APIs

- locations: `https://api.tracket.info/v1/locations`
- sensors: TBD