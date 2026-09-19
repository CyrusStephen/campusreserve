export const CAMPUS_TIME_ZONE = 'Asia/Kolkata'

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE,
  weekday: 'short',
})

export function isWeekendInstant(value: Date): boolean {
  const weekday = weekdayFormatter.format(value)
  return weekday === 'Sat' || weekday === 'Sun'
}

export function intervalTouchesWeekend(startAt: Date, endAt: Date): boolean {
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) return false

  // Sample every six hours and the final millisecond. This safely covers
  // intervals crossing a campus-local midnight without depending on the
  // server machine's own time zone.
  for (let cursor = startAt.getTime(); cursor < endAt.getTime(); cursor += 6 * 60 * 60 * 1000) {
    if (isWeekendInstant(new Date(cursor))) return true
  }
  return isWeekendInstant(new Date(endAt.getTime() - 1))
}
