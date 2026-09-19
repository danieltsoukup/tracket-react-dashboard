/**
 * @file LocationsOverlay.tsx
 * @description This file contains the overlay component for the locations map, including the reset button, status display, and noise level guidance dialog.
 */
import { useEffect, useRef, useState } from 'react'
import type { LocationHealth } from './locations.config.ts'

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
  onResetMap: () => void
}

type LocationStatusProps = LocationCounts & {
  /**
   * The selected statuses for filtering locations on the map.
   */
  selectedStatuses: Record<LocationHealth, boolean>
  onToggleStatus: (status: LocationHealth) => void
  isLoading: boolean
  error: string | null
  onOpenInfo: () => void
}

type NoiseInfoDialogProps = {
  isOpen: boolean
  onClose: () => void
}

function MapResetButton({ onResetMap }: { onResetMap: () => void }) {
  return (
    <button
      className="map-reset-button"
      type="button"
      aria-label="Reset map view"
      title="Reset map view"
      onClick={onResetMap}
    >
      <span className="material-symbols-outlined" aria-hidden="true">public</span>
    </button>
  )
}

function LocationStatus({
  unhealthy,
  active,
  inactive,
  selectedStatuses,
  onToggleStatus,
  isLoading,
  error,
  onOpenInfo,
}: LocationStatusProps) {
  const statusConfig: Array<{ key: LocationHealth; label: string; icon: string; count: number }> = [
    { key: 'unhealthy', label: 'Unhealthy', icon: 'sensors', count: unhealthy },
    { key: 'active', label: 'Active', icon: 'sensors', count: active },
    { key: 'inactive', label: 'Inactive', icon: 'sensors_off', count: inactive },
  ]

  return (
    <div className="map-status" aria-live="polite">
      {isLoading && <span>Loading locations...</span>}
      {error && <span className="map-status--error">{error}</span>}
      {!isLoading && !error && (unhealthy + active + inactive > 0) && (
        <span className="map-status__counts">
          <button
            className="map-status__layer-button"
            type="button"
            aria-label="Toggle location layers"
            title="Toggle location layers"
            onClick={() => {
              const nextStatuses: Record<LocationHealth, boolean> = {
                unhealthy: !selectedStatuses.unhealthy,
                active: !selectedStatuses.active,
                inactive: !selectedStatuses.inactive,
              }

              if (selectedStatuses.unhealthy !== nextStatuses.unhealthy) {
                onToggleStatus('unhealthy')
              }
              if (selectedStatuses.active !== nextStatuses.active) {
                onToggleStatus('active')
              }
              if (selectedStatuses.inactive !== nextStatuses.inactive) {
                onToggleStatus('inactive')
              }
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">layers</span>
          </button>
          {statusConfig.map(({ key, label, icon, count }) => {
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
                  {icon}
                </span>
                <span>{label}: {count}</span>
              </button>
            )
          })}
          <button
            className="map-status__info-button"
            type="button"
            aria-label="Noise level guidance"
            title="Noise level guidance"
            onClick={onOpenInfo}
          >
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
          </button>
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
        Location markers turn red when their hourly mean exceeds the outdoor health thresholds set by the WHO.
      </p>
      <ul>
        <li><strong>07:00-23:00:</strong> keep below 55 dB</li>
        <li><strong>23:00-07:00:</strong> keep below 40 dB</li>
      </ul>
      <p>
        Use the status toggles to filter which locations are shown on the map, including combining multiple health states at once.
      </p>
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
  onResetMap,
}: LocationsOverlayProps) {
  const [isNoiseInfoOpen, setIsNoiseInfoOpen] = useState(false)

  return (
    <>
      <MapResetButton onResetMap={onResetMap} />
      <div className="map-status-group">
        <LocationStatus
          unhealthy={unhealthy}
          active={active}
          inactive={inactive}
          selectedStatuses={selectedStatuses}
          onToggleStatus={onToggleStatus}
          isLoading={isLoading}
          error={error}
          onOpenInfo={() => setIsNoiseInfoOpen(true)}
        />
        {!selectedStatuses.unhealthy && !selectedStatuses.active && !selectedStatuses.inactive && (
          <p className="map-status__all-off">All locations toggled off</p>
        )}
      </div>
      <NoiseInfoDialog isOpen={isNoiseInfoOpen} onClose={() => setIsNoiseInfoOpen(false)} />
    </>
  )
}
