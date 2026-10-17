/*
 * @description This file contains the type definition for the chart tooltip used in the sensor charts.
*/
import type { LocationHealth } from '../locations/locations.config.ts'

export type ChartTooltip = {
  left: number
  top: number
  timestamp: string
  measurement?: {
    min: number
    minHealth: LocationHealth
    mean: number
    meanHealth: LocationHealth
    max: number
    maxHealth: LocationHealth
  }
  notes: string[]
}