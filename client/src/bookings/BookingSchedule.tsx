import { CalendarDays, MapPin } from 'lucide-react'
import type { BookingOccurrence } from './types'
import { intervalTouchesWeekend } from './weekend'

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function BookingSchedule({ occurrences }: { occurrences: BookingOccurrence[] }) {
  return <div className="cr-schedule-list">{occurrences.map((occurrence, index) => {
    const weekend = intervalTouchesWeekend(occurrence.startAt, occurrence.endAt)
    return <div className="cr-booking-facts" key={occurrence.id}><div><strong>Occurrence {index + 1}</strong><span className={`cr-status cr-status-${occurrence.status.toLowerCase()}`}>{occurrence.status.toLowerCase()}</span>{weekend && <span className="cr-status cr-status-weekend">Weekend exception</span>}</div><p><CalendarDays size={17} />{dateTime(occurrence.startAt)} – {dateTime(occurrence.endAt)}</p><p><MapPin size={17} />{occurrence.resource.name} · {occurrence.resource.building}, {occurrence.resource.location}</p>{occurrence.quantity > 1 && <p>{occurrence.quantity} units</p>}{(occurrence.status === 'REJECTED' || occurrence.status === 'CANCELLED') && occurrence.cancellationReason && <p className="cr-occurrence-reason"><strong>{occurrence.status === 'CANCELLED' ? 'Cancellation' : 'Decision'}:</strong> {occurrence.cancellationReason}</p>}</div>
  })}</div>
}
