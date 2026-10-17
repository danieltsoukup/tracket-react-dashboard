/*
 * @description This file contains the type definition for the chart tooltip used in the sensor charts.
*/
import type { LocationHealth } from '../locations/locations.config.ts'
import { LOCATION_HEALTH_HOURS } from '../locations/locations.config.ts'
import { getSensorLocalHour } from '../../utils/sensorLocalTime.ts'
import { dayNightIcons } from '../config.ts'

export type TimeOfDayIcon = (typeof dayNightIcons)[keyof typeof dayNightIcons]

export function getTimeOfDayIcon(timestamp: string): TimeOfDayIcon | undefined {
  const hour = getSensorLocalHour(timestamp)

  if (hour === null) {
    return undefined
  }

  return hour >= LOCATION_HEALTH_HOURS.daytimeStart && hour < LOCATION_HEALTH_HOURS.daytimeEnd
    ? dayNightIcons.day
    : dayNightIcons.night
}

export type ChartTooltip = {
  left: number
  top: number
  timestamp: string
  timeOfDayIcon?: TimeOfDayIcon
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