import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

type NoiseInfoDialogProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  content: ReactNode
}

export function NoiseInfoDialog({ isOpen, onClose, title, content }: NoiseInfoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const titleId = useId()

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
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="noise-info-modal__header">
        <h2 id={titleId}>{title}</h2>
        <button
          className="noise-info-modal__close"
          type="button"
          aria-label="Close info modal"
          title="Close"
          onClick={onClose}
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
      <div className="noise-info-modal__content">
        {content}
      </div>
    </dialog>
  )
}