import type { ReactNode } from 'react'

type SensorPanelProps = {
  title: string
  icon: 'show_chart' | 'location_on'
  children: ReactNode
}

export function SensorPanel({ title, icon, children }: SensorPanelProps) {
  return (
    <section className="sensor-panel" aria-label={title}>
      <h2 className="sensor-panel__title">
        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
        {title}
      </h2>
      <div className="sensor-panel__body">{children}</div>
    </section>
  )
}
