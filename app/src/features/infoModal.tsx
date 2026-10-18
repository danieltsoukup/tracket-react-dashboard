import { useEffect, useRef } from 'react'
import { dayNightIcons } from './config.ts'

type NoiseInfoDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export function NoiseInfoDialog({ isOpen, onClose }: NoiseInfoDialogProps) {
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
        <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.day}</span><span><strong>07:00-23:00:</strong> keep below 55 dB</span></li>
        <li><span className="material-symbols-outlined" aria-hidden="true">{dayNightIcons.night}</span><span><strong>23:00-07:00:</strong> keep below 40 dB</span></li>
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