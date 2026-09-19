export const CAMPUS_TIME_ZONE = 'Asia/Kolkata'

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE,
  weekday: 'short',
})

function isWeekendInstant(value: Date): boolean {
  if (!Number.isFinite(value.getTime())) return false
  const weekday = weekdayFormatter.format(value)
  return weekday === 'Sat' || weekday === 'Sun'
}

export function intervalTouchesWeekend(startValue: string | Date, endValue: string | Date): boolean {
  const startAt = new Date(startValue)
  const endAt = new Date(endValue)
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) return false
  for (let cursor = startAt.getTime(); cursor < endAt.getTime(); cursor += 6 * 60 * 60 * 1000) {
    if (isWeekendInstant(new Date(cursor))) return true
  }
  return isWeekendInstant(new Date(endAt.getTime() - 1))
}

export function isWeekendDay(value: Date): boolean {
  return isWeekendInstant(value)
}
