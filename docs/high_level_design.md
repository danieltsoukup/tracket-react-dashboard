# High-Level Application Design

## Overview

The Tracket dashboard is a client-side React application for exploring locations
of urban noise sensors, their recent readings, and historical measurements.
Sensor locations and measurements are loaded from the Tracket v1 API; maps use
Leaflet tiles and historical charts use Plotly.

## Routes and user experience

### `/locations`

The locations page displays sensor locations on an interactive, clustered map.
Each marker shows the latest hourly mean and uses status colors to distinguish
inactive sensors, active sensors, and readings over the applicable noise
threshold. Selecting a marker opens that sensor's detail page.

The map overlay provides status filters, counts for the current map viewport,
loading and error feedback, and the average hourly mean and most common status
of the visible, selected locations.

A location is considered active when its latest reading is no more than 24
hours old. The status thresholds are based on the hour in the sensor-local
timestamp:

- Daytime (07:00 through 22:59): unhealthy above 55 dB.
- Nighttime (23:00 through 06:59): unhealthy above 40 dB.

Inactive sensors remain inactive regardless of their latest reading.

### `/locations/:sensorId`

The sensor detail page loads the selected location and presents:

- Sensor status and the latest available hourly noise reading.
- A daily noise profile, averaged by hour across the most recent seven days of
  hourly measurements, with nighttime shading.
- A map centered on the sensor, including its location-precision circle.
- A noise-history chart with selectable start and end dates and hourly or raw
  measurement granularity. The chart shows the mean and min/max range, optional
  day/night health-threshold lines, and summary facts for the visible range.
- A Notes timeline synchronized with the chart. Annotation intervals are
  clipped to the selected/visible range; matching notes can be inspected from
  chart points or intervals, and intervals are keyboard-focusable. Annotation
  loading, empty, and error states are represented.
- CSV download of the measurements currently loaded for the chart.

The initial history range is the latest sensor-local date and the preceding
seven calendar days. Requests and labels use the sensor's local date and time
rather than the viewer's browser timezone.

Unknown routes redirect to `/locations`.

## Technology

- React and TypeScript for the application and UI.
- Vite for local development and production builds.
- React Router for client-side routing.
- Leaflet and Leaflet MarkerCluster for interactive maps and clustered markers.
- Plotly.js for time-series and hourly-profile charts.
- npm for package management; Vitest and Oxlint for tests and linting.

## API integration

The base URL is `https://api.tracket.info/v1`.

### Locations

- `GET /locations` returns the available locations.
- `GET /locations/{locationId}` returns the requested location.

The response contains a `locations` array. A location includes its numeric ID,
label, latitude, longitude, location radius, activity and latest-reading
timestamps, and the latest hourly min, max, and mean.

### Noise measurements

- `GET /locations/{locationId}/noise`

Supported query parameters are `granularity` (`raw`, `hourly`, or `life-time`),
optional `start` and `end` timestamps, and a zero-based `page` for paginated
results. Each measurement contains a timestamp and numeric `min`, `max`, and
`mean` values. The client fetches result pages as needed.

The sensor page requests hourly measurements for the daily profile and uses
the selected granularity and date range for noise history.

### Annotations

- `GET /annotations?location={locationId}&startTime={timestamp}&endTime={timestamp}`

The endpoint returns annotations whose intervals overlap the requested time
range. Each annotation includes an ID, start and end timestamps, and note text;
user, app, and related-annotation IDs may also be present. The endpoint also
supports optional `reAnnotation` and `app` filters, though the dashboard
currently requests annotations by location and time range.

The API client currently supplies mock September 2026 annotations for location
`1251390`; remove this development data before production use.

## Timestamp handling

API timestamps include a UTC offset and represent sensor-local time. The
dashboard preserves that local date, clock time, and offset for threshold
classification, date labels, chart tooltips, and date-range requests. Date
range shifts use calendar-day arithmetic and currently reuse the offset from
the latest sensor timestamp. This does not account for an offset change across
a daylight-saving transition; an IANA timezone identifier from the API would
be needed to handle that reliably.

There is also a temporary client-side correction for API timestamps that are
not returned in each location's local timezone. It uses a small location-ID to
timezone mapping and should be removed once the API supplies correct
location-local timestamps.

## Configuration and deployment

The map uses Stadia Maps' Alidade Smooth tiles with OpenMapTiles and
OpenStreetMap attribution. A local `VITE_STADIA_API_KEY` may be supplied in
`app/.env.development.local` for development; the key is only added to tile
requests in development builds. The example environment file is
`app/.env.development.local.example`.

Vercel configuration and deployment workflows are in the repository. The
application itself is under `app/`; see [Developer Notes](./DEV-README.md) for
local development, validation, and deployment commands.
