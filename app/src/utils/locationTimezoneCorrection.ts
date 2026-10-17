const API_SOURCE_TIME_ZONE = 'America/Toronto'

const LOCATION_TIME_ZONES: Record<number, string> = {
  3162198: 'America/Vancouver',
  3270474: 'Europe/London',
  3495893: 'America/Chicago',
}

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|[+-]\d{2}:\d{2})?$/

function getTimeZoneOffset(timestamp: number, timeZone: string): number {
  const date = new Date(timestamp)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]))
  const localTimeAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  )

  return localTimeAsUtc - Math.floor(timestamp / 1000) * 1000
}

function formatTimezoneOffset(offset: number): string {
  const totalMinutes = Math.abs(offset / 60_000)
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')

  return `${offset < 0 ? '-' : '+'}${hours}:${minutes}`
}

// TEMPORARY: remove this correction and its API call sites once the API returns each location's local time.
export function correctLocationTimestamp(locationId: number, timestamp: string): string {
  const targetTimeZone = LOCATION_TIME_ZONES[locationId]
  const match = TIMESTAMP_PATTERN.exec(timestamp)

  if (!targetTimeZone || !match) {
    return timestamp
  }

  const [, year, month, day, hour, minute, second, fraction = ''] = match
  const milliseconds = Number(fraction.slice(0, 3).padEnd(3, '0'))
  // The API's clock fields are Eastern local time; its zone suffix is not location-specific.
  const sourceWallTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    milliseconds,
  )

  const parsedDate = new Date(sourceWallTime)
  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  ) {
    return timestamp
  }

  let instant = sourceWallTime
  for (let attempt = 0; attempt < 3; attempt += 1) {
    instant = sourceWallTime - getTimeZoneOffset(instant, API_SOURCE_TIME_ZONE)
  }

  const targetOffset = getTimeZoneOffset(instant, targetTimeZone)
  const correctedWallTime = new Date(instant + targetOffset)
  const correctedTimestamp = correctedWallTime.toISOString().slice(0, 19)

  return `${correctedTimestamp}${fraction ? `.${fraction}` : ''}${formatTimezoneOffset(targetOffset)}`
}
