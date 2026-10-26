# Project Structure

## Repository layout

```text
tracket-react-dashboard/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/                 # CI, CodeQL, and Vercel deployment workflows
├── app/                            # React/Vite application root
│   ├── public/                     # Static assets copied into the build
│   ├── src/
│   │   ├── features/
│   │   │   ├── locations/          # Location map, overlay, API, types, status config
│   │   │   ├── sensors/            # Sensor detail page, maps, charts, APIs, data helpers
│   │   │   ├── config.ts           # Shared API and chart configuration
│   │   │   └── infoModal.tsx       # Shared informational content
│   │   ├── utils/                  # Sensor-local time and API timezone correction
│   │   ├── App.tsx                 # Router and route fallback
│   │   ├── index.css               # Application styles
│   │   └── main.tsx                # React entry point
│   ├── .env.development.local.example
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig*.json
│   ├── vite.config.ts
│   └── vercel.json
├── docs/
│   ├── DEV-README.md
│   ├── high_level_design.md
│   └── project_structure.md
├── README.md
├── LICENSE
└── .gitignore
```

The local `.env.development.local` file is intentionally not listed; it is
machine-specific and should not be committed. `node_modules/` and build output
are generated and are not committed.

## Application source

### App entry and routing

- `app/src/main.tsx` mounts the React application.
- `app/src/App.tsx` configures the browser router: `/locations` renders the
  locations map, `/locations/:sensorId` renders a sensor detail page, and
  unknown paths redirect to `/locations`.
- `app/src/index.css` contains the shared and feature-level application styles.
- `app/public/` contains static files served from the site root, including the
  Tracket logo and favicon.

### `app/src/features/locations/`

- `LocationsPage.tsx` loads location data and owns the Leaflet map, clustered
  markers, status filters, viewport statistics, and loading/error states.
- `LocationsOverlay.tsx` renders map controls and summary information.
- `locations.api.ts` fetches and validates location responses.
- `locations.types.ts` defines the location data type.
- `locations.config.ts` contains tile configuration, activity and health
  classification, and marker status colors.
- `locations.*.test.ts` covers the API and status/configuration behavior.

### `app/src/features/sensors/`

- `SensorPage.tsx` loads location, noise, and annotation data and composes the
  sensor detail view.
- `SensorPanel.tsx`, `LatestNoiseReading.tsx`, and `SensorLocationMap.tsx`
  provide reusable detail panels and latest-reading/map views.
- `HourlyProfile.tsx` renders the recent hourly noise profile.
- `NoiseChart.tsx` renders noise history, date/granularity controls, threshold
  indicators, annotations, range statistics, and CSV download.
- `sensors.api.ts` fetches paginated noise measurements; `annotations.api.ts`
  fetches annotations for a location and time range.
- `noiseChartData.ts`, `hourlyProfileData.ts`,
  `annotationTimelineData.ts`, `noiseDownload.ts`, and `chartTooltip.ts`
  prepare chart, timeline, download, and tooltip data.
- `*.test.ts` files colocated in this feature cover API clients and data
  preparation/download behavior.

`app/src/features/config.ts` contains shared API and chart presentation
settings; `app/src/features/infoModal.tsx` contains shared informational
content.

### `app/src/utils/`

- `sensorLocalTime.ts` parses and formats timestamp wall-clock fields, shifts
  sensor-local calendar dates, and prepares chart/request timestamps.
- `locationTimezoneCorrection.ts` temporarily corrects timestamps for a small
  set of locations until the API returns each location's local time.
- The colocated tests cover the time helpers and timezone correction.

## Application configuration

- `app/package.json` defines dependencies and npm scripts. Run commands from
  the `app/` directory:

  ```bash
  npm run dev
  npm run test
  npm run lint
  npm run build
  npm run preview
  ```

- `app/package-lock.json` pins npm dependency versions.
- `app/vite.config.ts` configures Vite and the React plugin.
- `app/tsconfig.json`, `app/tsconfig.app.json`, and
  `app/tsconfig.node.json` configure TypeScript for the project, browser app,
  and Node/Vite configuration.
- `app/.oxlintrc.json` configures Oxlint.
- `app/.env.development.local.example` documents the optional development-only
  Stadia tile API key variable.
- `app/vercel.json` configures Vercel behavior for the app.

## Repository documentation and automation

- `README.md` describes the Tracket project and dashboard.
- `docs/high_level_design.md` describes routes, features, APIs, timestamps, and
  the technology choices.
- `docs/DEV-README.md` contains developer and Vercel deployment notes.
- `.github/workflows/` contains CI, CodeQL, and preview/production deployment
  workflows.
- `.github/ISSUE_TEMPLATE/` contains issue templates.
- `.gitignore` defines files and generated output that should not be tracked.
