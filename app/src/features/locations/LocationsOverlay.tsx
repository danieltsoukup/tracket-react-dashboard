/**
 * @file LocationsOverlay.tsx
 * @description This file contains the overlay component for the locations map, including status display and noise level guidance dialog.
 */
import { useEffect, useRef, useState } from 'react'
import { getLocationIcon, type LocationHealth } from './locations.config.ts'
import { dayNightIcons } from '../config.ts'

type LocationCounts = {
  unhealthy: number
  active: number
  inactive: number
}

type LocationsOverlayProps = LocationCounts & {
  /**
   * The selected statuses for filtering locations on the map.
   */
  selectedStatuses: Record<LocationHealth, boolean>
  onToggleStatus: (status: LocationHealth) => void
  isLoading: boolean
  error: string | null
  averageMean: number | null
  averageHealth: LocationHealth | null
}

type LocationStatusProps = LocationCounts & {
  /**
   * The selected statuses for filtering locations on the map.
   */
  selectedStatuses: Record<LocationHealth, boolean>
  onToggleStatus: (status: LocationHealth) => void
  isLoading: boolean
  error: string | null
  averageMean: number | null
  averageHealth: LocationHealth | null
  onOpenInfo: () => void
}

type NoiseInfoDialogProps = {
  isOpen: boolean
  onClose: () => void
}

function LocationStatus({
  unhealthy,
  active,
  inactive,
  selectedStatuses,
  onToggleStatus,
  isLoading,
  error,
  averageMean,
  averageHealth,
  onOpenInfo,
}: LocationStatusProps) {
  const statusConfig: Array<{ key: LocationHealth; label: string; count: number }> = [
    { key: 'unhealthy', label: 'Over limit', count: unhealthy },
    { key: 'active', label: 'Active', count: active },
    { key: 'inactive', label: 'Inactive', count: inactive },
  ]
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={isCollapsed ? 'map-status map-status--collapsed' : 'map-status'} aria-live="polite">
      {isLoading && <span>Loading locations...</span>}
      {error && <span className="map-status--error">{error}</span>}
      {!isLoading && !error && (
        <span className="map-status__counts">
          <button
            className="map-status__layer-button"
            type="button"
            aria-label={isCollapsed ? 'Expand location status' : 'Collapse location status'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand location status' : 'Collapse location status'}
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">layers</span>
          </button>
          {!isCollapsed && (
            <>
              {statusConfig.map(({ key, label, count }) => {
                const isSelected = selectedStatuses[key]

                return (
                  <button
                    key={key}
                    type="button"
                    className={isSelected ? 'map-status__count map-status__count--selected' : 'map-status__count map-status__count--unselected'}
                    aria-label={`${label}: ${count}`}
                    aria-pressed={isSelected}
                    title={`${label}: ${count}`}
                    onClick={() => onToggleStatus(key)}
                  >
                    <span className={`material-symbols-outlined location-tooltip__status-icon location-tooltip__status-icon--${key}`} aria-hidden="true">
                      {getLocationIcon(key)}
                    </span>
                    <span className="map-status__label">{label}: </span>
                    <span className="map-status__count-value">{count}</span>
                  </button>
                )
              })}
              {averageMean !== null && (
                <span
                  className={`map-status__average map-status__average--${averageHealth ?? 'neutral'}`}
                  aria-label={`Viewport average: ${averageMean.toFixed(1)} decibels`}
                  title="Viewport average"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{getLocationIcon('average')}</span>
                  <span className="map-status__label">Average dB:</span>
                  <span>{averageMean.toFixed(1)}</span>
                </span>
              )}
              <button
                className="map-status__info-button"
                type="button"
                aria-label="Noise level guidance"
                title="Noise level guidance"
                onClick={onOpenInfo}
              >
                <span className="material-symbols-outlined" aria-hidden="true">info</span>
              </button>
            </>
          )}
        </span>
      )}
    </div>
  )
}

function NoiseInfoDialog({ isOpen, onClose }: NoiseInfoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      className="noise-info-modal"
      ref={dialogRef}
      aria-labelledby="noise-info-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="noise-info-modal__header">
        <h2 id="noise-info-title">How loud is too loud?</h2>
        <button
          className="noise-info-modal__close"
          type="button"
          aria-label="Close noise level guidance"
          title="Close"
          onClick={onClose}
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
      <p>
        Location marker colors reflect if their hourly mean exceeds the outdoor health limit set by the WHO.
      </p>
      <ul>
        <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.day}</span><span><strong>07:00-23:00:</strong> keep below 55 dB</span></li>
        <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.night}</span><span><strong>23:00-07:00:</strong> keep below 40 dB</span></li>
      </ul>
      <p>
        Use the status toggles to filter which locations are shown on the map, including combining multiple states at once.
      </p>
      <p>
        Sensors are marked inactive if they have not reported any data in the last 24 hours.
      </p>
      <p>The average pill shows the latest hourly reading average across sensors in the current map view.</p>
      <a
        href="https://www.toronto.ca/wp-content/uploads/2017/11/8f98-tph-How-Loud-is-Too-Loud-Health-Impacts-Environmental-Noise.pdf"
        target="_blank"
        rel="noreferrer"
      >
        Read the Toronto Public Health reference
      </a>
    </dialog>
  )
}

export function LocationsOverlay({
  unhealthy,
  active,
  inactive,
  selectedStatuses,
  onToggleStatus,
  isLoading,
  error,
  averageMean,
  averageHealth,
}: LocationsOverlayProps) {
  const [isNoiseInfoOpen, setIsNoiseInfoOpen] = useState(false)

  return (
    <>
      <div className="map-status-group">
        <LocationStatus
          unhealthy={unhealthy}
          active={active}
          inactive={inactive}
          selectedStatuses={selectedStatuses}
          onToggleStatus={onToggleStatus}
          isLoading={isLoading}
          error={error}
          averageMean={averageMean}
          averageHealth={averageHealth}
          onOpenInfo={() => setIsNoiseInfoOpen(true)}
        />
        {!isLoading && !error && unhealthy + active + inactive === 0 && (
          <p className="map-status__all-off">No sensors in view</p>
        )}
        {!selectedStatuses.unhealthy && !selectedStatuses.active && !selectedStatuses.inactive && (
          <p className="map-status__all-off">All locations toggled off</p>
        )}
      </div>
      <NoiseInfoDialog isOpen={isNoiseInfoOpen} onClose={() => setIsNoiseInfoOpen(false)} />
    </>
  )
}
