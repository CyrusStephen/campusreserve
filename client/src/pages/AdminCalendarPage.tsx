import { ArrowLeft, ArrowRight, CalendarRange, Filter } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getAdminCalendar } from '../bookings/api'
import type { AdminCalendarData, AdminCalendarEntry } from '../bookings/types'
import { isWeekendDay } from '../bookings/weekend'

function startOfDay(value: Date): Date {
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value)
  result.setDate(result.getDate() + days)
  return result
}

function time(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function entryLabel(entry: AdminCalendarEntry): string {
  return entry.kind === 'BOOKING' ? entry.reservation.title : entry.label
}

export default function AdminCalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()))
  const [resourceId, setResourceId] = useState('')
  const [calendar, setCalendar] = useState<AdminCalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const weekEnd = useMemo(() => addDays(weekStart, 14), [weekStart])
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(weekStart, index)), [weekStart])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void getAdminCalendar(weekStart, weekEnd, resourceId || undefined, controller.signal).then((result) => {
      if (!controller.signal.aborted) setCalendar(result)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'The master calendar could not be loaded.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [resourceId, retry, weekEnd, weekStart])

  function entriesForDay(day: Date): AdminCalendarEntry[] {
    const next = addDays(day, 1)
    return calendar?.entries.filter((entry) => new Date(entry.startAt) < next && new Date(entry.endAt) > day) ?? []
  }

  const rangeLabel = `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(weekStart)} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(addDays(weekEnd, -1))}`

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Administration</p><h1>Master calendar</h1><p>See pending holds, approved dates and campus blocks across every resource.</p></div></header>
    <div className="cr-master-toolbar">
      <div className="cr-calendar-toolbar">
        <button className="cr-button cr-button-small" disabled={loading} type="button" onClick={() => { setSelectedDayIndex(0); setWeekStart((value) => addDays(value, -14)) }}><ArrowLeft size={16} />Previous</button>
        <strong>{rangeLabel}</strong>
        <button className="cr-button cr-button-small" disabled={loading} type="button" onClick={() => { setSelectedDayIndex(0); setWeekStart((value) => addDays(value, 14)) }}>Next<ArrowRight size={16} /></button>
      </div>
      <label className="cr-calendar-filter"><Filter size={16} /><span className="cr-sr-only">Filter by resource</span><select disabled={loading} value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">All resources</option>{calendar?.resources.map((resource) => <option value={resource.id} key={resource.id}>{resource.name}</option>)}</select></label>
    </div>
    <div className="cr-availability-legend"><span><i className="cr-availability-dot cr-availability-dot-pending" />Pending hold</span><span><i className="cr-availability-dot cr-availability-dot-approved" />Approved</span><span><i className="cr-availability-dot cr-availability-dot-blocked" />Campus block</span><span><i className="cr-availability-dot cr-availability-dot-weekend" />Weekend closed by default</span></div>
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload</button></div>}
    {loading && <div className="cr-calendar-loading" role="status">Loading the campus schedule…</div>}
    {!loading && calendar && <><div className="cr-master-calendar cr-master-calendar-desktop">{days.map((day) => { const entries = entriesForDay(day); const weekend = isWeekendDay(day); return <section className={`cr-master-day${weekend ? ' cr-calendar-day-weekend' : ''}`} key={day.toISOString()}>
      <header><div><strong>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)}</strong><span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(day)}</span></div>{weekend && <small>Closed</small>}</header>
      {entries.length === 0 ? <p className="cr-calendar-open">{weekend ? 'No exceptions scheduled' : 'No bookings or blocks'}</p> : <div className="cr-calendar-events">{entries.map((entry) => <article className={`cr-calendar-event cr-calendar-event-${entry.status.toLowerCase()}`} key={`${day.toISOString()}:${entry.kind}:${entry.id}`}>
        <strong>{entry.resource.name}</strong><span>{time(entry.startAt)} – {time(entry.endAt)}</span><span>{entryLabel(entry)}</span>
        {entry.kind === 'BOOKING' ? <small>{entry.reservation.referenceCode} · {entry.reservation.requester.name} · {entry.status.toLowerCase()}</small> : <small>{entry.blockType.replaceAll('_', ' ').toLowerCase()} · campus block</small>}
      </article>)}</div>}
    </section> })}</div><div className="cr-master-calendar-mobile">
      <div className="cr-master-mobile-grid" aria-label="Two-week calendar">{days.map((day, index) => { const entries = entriesForDay(day); const weekend = isWeekendDay(day); return <button className={`${weekend ? 'cr-calendar-day-weekend ' : ''}${selectedDayIndex === index ? 'is-selected' : ''}`} type="button" aria-pressed={selectedDayIndex === index} onClick={() => setSelectedDayIndex(index)} key={day.toISOString()}><span>{new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(day)}</span><strong>{day.getDate()}</strong><small>{entries.length > 0 ? entries.length : '·'}</small></button> })}</div>
      {(() => { const day = days[selectedDayIndex] ?? days[0]; const entries = entriesForDay(day); const weekend = isWeekendDay(day); return <section className="cr-master-mobile-detail"><header><div><strong>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(day)}</strong><span>{weekend ? 'Weekend closed by default' : 'Campus schedule'}</span></div></header>{entries.length === 0 ? <p className="cr-calendar-open">{weekend ? 'No exceptions scheduled' : 'No bookings or blocks'}</p> : <div className="cr-calendar-events">{entries.map((entry) => <article className={`cr-calendar-event cr-calendar-event-${entry.status.toLowerCase()}`} key={`mobile:${entry.kind}:${entry.id}`}><strong>{entry.resource.name}</strong><span>{time(entry.startAt)} – {time(entry.endAt)}</span><span>{entryLabel(entry)}</span>{entry.kind === 'BOOKING' ? <small>{entry.reservation.referenceCode} · {entry.reservation.requester.name} · {entry.status.toLowerCase()}</small> : <small>{entry.blockType.replaceAll('_', ' ').toLowerCase()} · campus block</small>}</article>)}</div>}</section> })()}
    </div></>}
    {!loading && calendar && calendar.entries.length === 0 && <div className="cr-empty cr-master-empty"><CalendarRange size={30} /><h2>These two weeks are clear.</h2><p>Try another date range or remove the resource filter.</p></div>}
  </section>
}
