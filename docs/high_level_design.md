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
- Plotly.js for interactive time-series visualizations
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

The sensor noise chart displays a synchronized Notes timeline beneath the x-axis. Orange intervals represent annotation time ranges, clipped to the selected chart range. Hovering a chart point or a note interval shows every matching note in the chart tooltip; intervals are also keyboard-focusable. The timeline displays loading and empty states.

- sensors: TBD

Return measurements for the given location.  The timestamps will be returned for the timezone where the device is located.

The client must preserve the timestamp's sensor-local date and time, including its UTC offset. Threshold classification uses the hour written in that timestamp: readings above 55 dB are unhealthy from 07:00 through 22:59, and readings above 40 dB are unhealthy from 23:00 through 06:59. Date labels, chart tooltips, and chart date-range requests should likewise use the sensor-local date and time rather than the viewer's browser timezone.

For now, date-range calculations use calendar-day arithmetic and reuse the UTC offset on the latest timestamp. This deliberately does not account for a sensor's offset changing across a daylight-saving transition; handling that correctly requires an IANA timezone identifier from the API.

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

- notes/annotations: fetch one or more annotations at a specific location with a time range that overlaps with a given time range.

HTTP GET Parameters
location - The location id, as provided by the locations endpoint.
startTime - Optional start time of the sample period for annotations.
endTime - Optional end time of the sample period for annotations.
reAnnotation - Optional annotation id.  If specified, only annotations regarding the specified annotation will be included in the response.
app - Optional regular expression that will be used to filter annotations based on the app.

Example HTTP Requests
https://api.tracket.info/v1/annotations?location=123&startTime=2024-04-14T00:00:00-04:00&endTime=2024-04-20T00:00:00-04:00&app=%5EWebsite%20%5Cd%2B%5C.%5Cd%2B%24

HTTP Response Example (JSON)
{
    "annotations": [
        {
            "id": 123,
            "startTime": "2024-04-14T12:04:26-04:00",
            "endTime": "2024-04-14T12:06:26-04:00",
            "note": "Concert",
            "user": 234,
            "app": "My App 1.0"
        },{
            "id": 456,
            "startTime": "2024-04-17T14:04:00-04:00",
            "endTime": "2024-04-17T15:07:00-04:00",
            "note": "Protest",
            "reAnnotation": 123,
            "user": 345,
            "app": "My App 1.1"
        }
    ]
}
