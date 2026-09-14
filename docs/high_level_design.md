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
- location info for single location: `https://api.tracket.info/v1/locations/572227`

Example:

```
{
  "locations": [
    {
      "id": 572227,
      "label": "Scott St. & Wellington St.",
      "latitude": 43.64815606522,
      "longitude": -79.376049461048,
      "radius": 75.452213039348,
      "active": true,
      "lastChecked": "2026-09-07T17:11:22-04:00",
      "latestTimestamp": "2024-07-06T14:03:00-04:00",
      "hourStart": "2024-07-06T13:03:00-04:00",
      "hourEnd": "2024-07-06T14:03:00-04:00",
      "hourMin": 2,
      "hourMax": 5,
      "hourMean": 2.555
    },
    ...
}
```

- sensors: TBD

Return measurements for the given location.  The timestamps will be returned for the timezone where the device is located.

HTTP Get Parameters
* granularity - “raw”, “hourly”, “life-time”
* start - Optional start time in format recognized by strtotime (e.g. 2024-03-19 14:00:12).
* end - Optional end time in format recognized by strtotime (e.g. 2024-03-19 14:00:12).
* page - Optional zero-based  page index into long result sets (100 results per page).

Example HTTP Requests
https://api.tracket.info/v1/locations/572250/noise
https://api.tracket.info/v1/locations/572250/noise?granularity=hourly
https://api.tracket.info/v1/locations/572250/noise?granularity=life-time

```
{
  "measurements": [
    {
      "timestamp": "2024-02-04T23:32:58-04:00",
      "min": 48.605,
      "max": 62.834,
      "mean": 49.101
    },
    {
      "timestamp": "2024-02-04T23:37:59-04:00",
      "min": 48.667,
      "max": 50.021,
      "mean": 49.072
    },
    ...
}
```