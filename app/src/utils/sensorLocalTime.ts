const SENSOR_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/

function getTimestampParts(timestamp: string) {
  const match = SENSOR_TIMESTAMP_PATTERN.exec(timestamp)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second, fraction = '', offset] = match
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  ) {
    return null
  }

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(fraction.slice(0, 3).padEnd(3, '0')),
    date: `${year}-${month}-${day}`,
    fraction,
    offset,
  }
}

export function getSensorLocalHour(timestamp: string): number | null {
  return getTimestampParts(timestamp)?.hour ?? null
}

export function getSensorLocalDate(timestamp: string): string {
  return getTimestampParts(timestamp)?.date ?? ''
}

export function shiftSensorLocalDate(timestamp: string, days: number): string {
  const parts = getTimestampParts(timestamp)

  if (!parts || !Number.isInteger(days)) {
    return ''
  }

  const shiftedDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  const year = shiftedDate.getUTCFullYear()
  const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shiftedDate.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function shiftSensorLocalTimestamp(timestamp: string, days: number): string | undefined {
  const parts = getTimestampParts(timestamp)
  const date = shiftSensorLocalDate(timestamp, days)

  if (!parts || !date) {
    return undefined
  }

  const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}`
  const fraction = parts.fraction ? `.${parts.fraction}` : ''
  return `${date}T${time}${fraction}${parts.offset}`
}

export function toSensorLocalTimestamp(
  date: string,
  time: '00:00:00' | '23:59:00',
  referenceTimestamp: string,
): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return undefined
  }

  const offset = getTimestampParts(referenceTimestamp)?.offset
  return offset ? `${date}T${time}${offset}` : undefined
}

export function toSensorLocalPlotTimestamp(timestamp: string): string {
  const parts = getTimestampParts(timestamp)

  if (!parts) {
    return timestamp
  }

  const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}`
  return `${parts.date}T${time}${parts.fraction ? `.${parts.fraction}` : ''}`
}

export function formatSensorTimestamp(timestamp: string, formatter: Intl.DateTimeFormat): string {
  const parts = getTimestampParts(timestamp)

  if (!parts) {
    return timestamp
  }

  const sensorLocalDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond),
  )
  return formatter.format(sensorLocalDate)
}
