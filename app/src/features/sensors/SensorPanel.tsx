import { useState } from 'react'
import type { ReactNode } from 'react'
import { NoiseInfoDialog } from '../infoModal.tsx'

type SensorPanelProps = {
  title: string
  icon: 'show_chart' | 'location_on' | 'calendar_month' | 'last_page'
  children: ReactNode
  infoContent?: ReactNode
}

export function SensorPanel({ title, icon, children, infoContent }: SensorPanelProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  return (
    <section className="sensor-panel" aria-label={title}>
      <div className="sensor-panel__header">
        <h2 className="sensor-panel__title">
          <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
          {title}
        </h2>
        {infoContent && (
          <button
            className="sensor-panel__info-button"
            type="button"
            aria-label={`${title} information`}
            title={`${title} information`}
            onClick={() => setIsInfoOpen(true)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
          </button>
        )}
      </div>
      <div className="sensor-panel__body">{children}</div>
      {infoContent && (
        <NoiseInfoDialog
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          title={title}
          content={infoContent}
        />
      )}
    </section>
  )
}
