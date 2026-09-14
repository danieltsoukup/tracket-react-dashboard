import type { ReactNode } from 'react'

type SensorPanelProps = {
  title: string
  children: ReactNode
}

export function SensorPanel({ title, children }: SensorPanelProps) {
  return (
    <section className="sensor-panel" aria-label={title}>
      <h2 className="sensor-panel__title">{title}</h2>
      <div className="sensor-panel__body">{children}</div>
    </section>
  )
}
