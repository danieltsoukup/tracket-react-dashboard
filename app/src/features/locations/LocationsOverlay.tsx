/**
 * @file LocationsOverlay.tsx
 * @description This file contains the overlay component for the locations map, including the reset button, status display, and noise level guidance dialog.
 */
import { useEffect, useRef, useState } from 'react'

type LocationCounts = {
  unhealthy: number
  active: number
  inactive: number
}

type LocationsOverlayProps = LocationCounts & {
  isLoading: boolean
  error: string | null
  onResetMap: () => void
}

type LocationStatusProps = LocationCounts & {
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

function LocationStatus({ unhealthy, active, inactive, isLoading, error, onOpenInfo }: LocationStatusProps) {
  return (
    <div className="map-status" aria-live="polite">
      {isLoading && <span>Loading locations...</span>}
      {error && <span className="map-status--error">{error}</span>}
      {!isLoading && !error && (unhealthy + active + inactive > 0) && (
        <span className="map-status__counts">
          <span className="map-status__count">
            <span className="material-symbols-outlined location-tooltip__status-icon location-tooltip__status-icon--unhealthy" aria-hidden="true">
              sensors
            </span>
            <span>Unhealthy: {unhealthy}</span>
          </span>
          <span className="map-status__count">
            <span className="material-symbols-outlined location-tooltip__status-icon location-tooltip__status-icon--active" aria-hidden="true">
              sensors
            </span>
            <span>Active: {active}</span>
          </span>
          <span className="map-status__count">
            <span className="material-symbols-outlined location-tooltip__status-icon location-tooltip__status-icon--inactive" aria-hidden="true">
              sensors_off
            </span>
            <span>Inactive: {inactive}</span>
          </span>
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

export function LocationsOverlay({ unhealthy, active, inactive, isLoading, error, onResetMap }: LocationsOverlayProps) {
  const [isNoiseInfoOpen, setIsNoiseInfoOpen] = useState(false)

  return (
    <>
      <MapResetButton onResetMap={onResetMap} />
      <LocationStatus
        unhealthy={unhealthy}
        active={active}
        inactive={inactive}
        isLoading={isLoading}
        error={error}
        onOpenInfo={() => setIsNoiseInfoOpen(true)}
      />
      <NoiseInfoDialog isOpen={isNoiseInfoOpen} onClose={() => setIsNoiseInfoOpen(false)} />
    </>
  )
}
