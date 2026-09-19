import { CalendarOff, CalendarRange, ChevronLeft, ChevronRight, Clock3, ListPlus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { createCampusBlock, removeCampusBlock } from '../resources/api'
import type { Resource, ResourceBlockInput, ResourceBlockType } from '../resources/types'
import { getResourceAvailability, joinWaitlist } from './api'
import type { AvailabilityEntry, ResourceAvailability } from './types'
import { intervalTouchesWeekend, isWeekendDay } from './weekend'

const DAY_MS = 24 * 60 * 60 * 1000
const blockTypes: Array<{ value: ResourceBlockType; label: string }> = [
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'COLLEGE_EVENT', label: 'Exams / college event' },
  { value: 'EMERGENCY', label: 'Emergency closure' },
  { value: 'OTHER', label: 'Other' },
]

function startOfDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function localDateTime(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function initialBlock(): ResourceBlockInput {
  const startAt = addDays(startOfDay(new Date()), 1)
  startAt.setHours(8)
  const endAt = new Date(startAt)
  endAt.setHours(17)
  return { type: 'HOLIDAY', reason: '', startAt: localDateTime(startAt), endAt: localDateTime(endAt) }
}

function dayLabel(value: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(value)
}

function rangeLabel(from: Date, to: Date): string {
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${formatter.format(from)} – ${formatter.format(addDays(to, -1))}`
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function statusLabel(entry: AvailabilityEntry): string {
  const weekend = intervalTouchesWeekend(entry.startAt, entry.endAt)
  if (entry.status === 'PENDING') return weekend ? 'Weekend request held' : 'Held for review'
  if (entry.status === 'APPROVED') return weekend ? 'Reserved · exception approved' : 'Reserved'
  return entry.blockType ? entry.blockType.replaceAll('_', ' ').toLowerCase() : 'Campus block'
}

function overlapsDay(entry: AvailabilityEntry, day: Date): boolean {
  const nextDay = addDays(day, 1)
  return new Date(entry.startAt) < nextDay && new Date(entry.endAt) > day
}

function CampusBlockForm({ resourceId, onCreated }: { resourceId: string; onCreated: (startAt: string) => void }) {
  const [input, setInput] = useState<ResourceBlockInput>(initialBlock)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function field<Key extends keyof ResourceBlockInput>(key: Key, value: ResourceBlockInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true); setError(''); setMessage('')
    try {
      const startAt = new Date(input.startAt)
      const endAt = new Date(input.endAt)
      if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
        throw new Error('Choose a valid start and end time for the campus block.')
      }
      const created = await createCampusBlock(resourceId, {
        ...input,
        reason: input.reason.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      setMessage('Campus block added. New requests cannot use that time.')
      setInput((current) => ({ ...current, reason: '' }))
      onCreated(created.startAt)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The campus block could not be added.')
    } finally { setSubmitting(false) }
  }

  return <details className="cr-block-manager">
    <summary><CalendarOff size={17} />Add holiday, maintenance or exam block</summary>
    <form onSubmit={(event) => void submit(event)}>
      <div className="cr-form-grid"><label className="cr-field">Block type<select value={input.type} onChange={(event) => field('type', event.target.value as ResourceBlockType)}>{blockTypes.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label className="cr-field">Reason<input required minLength={3} maxLength={500} value={input.reason} onChange={(event) => field('reason', event.target.value)} placeholder="e.g. University examinations" /></label></div>
      <div className="cr-form-grid"><label className="cr-field">Starts<input required type="datetime-local" value={input.startAt} onChange={(event) => field('startAt', event.target.value)} /></label><label className="cr-field">Ends<input required type="datetime-local" value={input.endAt} onChange={(event) => field('endAt', event.target.value)} /></label></div>
      {error && <p className="cr-alert cr-alert-error" role="alert">{error}</p>}
      {message && <p className="cr-alert cr-success" role="status">{message}</p>}
      <button className="cr-button cr-button-primary" type="submit" disabled={submitting}><CalendarOff size={16} />{submitting ? 'Adding block…' : 'Block this time'}</button>
    </form>
  </details>
}

export default function AvailabilityCalendar({ resource, refreshKey = 0 }: { resource: Resource; refreshKey?: number }) {
  const { user } = useAuth()
  const administrator = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const today = useMemo(() => startOfDay(new Date()), [])
  const [windowStart, setWindowStart] = useState(() => today.getTime())
  const [availability, setAvailability] = useState<ResourceAvailability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [manualRefresh, setManualRefresh] = useState(0)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [waitlistTarget, setWaitlistTarget] = useState<AvailabilityEntry | null>(null)
  const [waitlistWorking, setWaitlistWorking] = useState(false)
  const [waitlistMessage, setWaitlistMessage] = useState('')
  const [waitlistError, setWaitlistError] = useState('')
  const from = useMemo(() => new Date(windowStart), [windowStart])
  const to = useMemo(() => addDays(from, 7), [from])
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(from, index)), [from])
  const nextStart = addDays(from, 7)
  const bookingWindowEnd = addDays(today, resource.advanceBookingDays)
  const canGoBack = windowStart > today.getTime()
  const canGoForward = nextStart.getTime() <= bookingWindowEnd.getTime()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void getResourceAvailability(resource.id, from, to, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setAvailability(result) })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Availability could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [from, manualRefresh, refreshKey, resource.id, to])

  function showCreatedBlock(startAt: string) {
    const blockDay = Math.max(today.getTime(), startOfDay(new Date(startAt)).getTime())
    setWindowStart(blockDay)
    setManualRefresh((value) => value + 1)
  }

  async function removeBlock(entry: AvailabilityEntry) {
    if (!window.confirm(`Remove the campus block “${entry.label}”?`)) return
    setRemovingId(entry.id); setError('')
    try {
      await removeCampusBlock(resource.id, entry.id)
      setManualRefresh((value) => value + 1)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The campus block could not be removed.')
    } finally { setRemovingId(null) }
  }

  async function joinTargetWaitlist() {
    if (!waitlistTarget || !waitlistTarget.actualStartAt || !waitlistTarget.actualEndAt) return
    setWaitlistWorking(true); setWaitlistMessage(''); setWaitlistError('')
    try {
      await joinWaitlist({
        resourceId: resource.id,
        startAt: waitlistTarget.actualStartAt,
        endAt: waitlistTarget.actualEndAt,
        quantity: waitlistTarget.quantity,
      })
      setWaitlistMessage('You joined the waitlist. We will notify you if this slot opens.')
      setWaitlistTarget(null)
    } catch (failure: unknown) {
      setWaitlistError(failure instanceof Error ? failure.message : 'The waitlist request could not be submitted.')
    } finally { setWaitlistWorking(false) }
  }

  return <section className="cr-panel cr-availability">
    <div className="cr-availability-head">
      <div><div className="cr-inline"><CalendarRange size={21} /><h2>Live availability</h2><span className="cr-status cr-status-live">Live</span></div><p className="cr-help">Saturday and Sunday are closed by default. Weekend requests need a recorded administrator exception.</p></div>
      <button className="cr-button cr-button-small" type="button" disabled={loading} onClick={() => setManualRefresh((value) => value + 1)}><RefreshCw size={15} />Refresh</button>
    </div>
    {administrator && <CampusBlockForm resourceId={resource.id} onCreated={showCreatedBlock} />}
    <div className="cr-calendar-toolbar">
      <button className="cr-button cr-button-small" type="button" disabled={!canGoBack || loading} aria-label="Show previous week" onClick={() => setWindowStart(Math.max(today.getTime(), windowStart - 7 * DAY_MS))}><ChevronLeft size={16} />Previous</button>
      <strong>{rangeLabel(from, to)}</strong>
      <button className="cr-button cr-button-small" type="button" disabled={!canGoForward || loading} aria-label="Show next week" onClick={() => setWindowStart(nextStart.getTime())}>Next<ChevronRight size={16} /></button>
    </div>
    <div className="cr-availability-legend" aria-label="Availability legend"><span><i className="cr-availability-dot cr-availability-dot-weekend" />Weekend closed</span><span><i className="cr-availability-dot cr-availability-dot-pending" />Held</span><span><i className="cr-availability-dot cr-availability-dot-approved" />Reserved</span><span><i className="cr-availability-dot cr-availability-dot-blocked" />Campus block</span></div>
    {error && <p className="cr-alert cr-alert-error" role="alert">{error}<button className="cr-button cr-button-small" type="button" onClick={() => setManualRefresh((value) => value + 1)}>Try again</button></p>}
    {loading && <div className="cr-calendar-loading" role="status">Checking current bookings…</div>}
    {!loading && !error && <div className="cr-calendar-grid">{days.map((day) => {
      const entries = availability?.entries.filter((entry) => overlapsDay(entry, day)) ?? []
      const weekend = isWeekendDay(day)
      return <article className={`cr-calendar-day${weekend ? ' cr-calendar-day-weekend' : ''}`} key={day.toISOString()}><h3>{dayLabel(day)}{weekend && <span>Closed</span>}</h3>{weekend && <p className="cr-calendar-weekend">Admin exception required</p>}{entries.length === 0 && !weekend ? <p className="cr-calendar-open">No holds recorded</p> : <div className="cr-calendar-events">{entries.map((entry) => <div className={`cr-calendar-event cr-calendar-event-${entry.status.toLowerCase()}`} key={`${day.toISOString()}-${entry.id}`}><strong>{statusLabel(entry)}</strong><span><Clock3 size={13} />{timeLabel(entry.startAt)} – {timeLabel(entry.endAt)}</span>{entry.kind === 'BOOKING' && !resource.isExclusive && <small>{entry.quantity} of {resource.totalQuantity} units held</small>}{entry.kind === 'BLOCK' && <><small>{entry.label}</small>{administrator && <button className="cr-remove-block" type="button" disabled={removingId === entry.id} onClick={() => void removeBlock(entry)}><Trash2 size={12} />{removingId === entry.id ? 'Removing…' : 'Remove block'}</button>}</>}{entry.kind === 'BOOKING' && entry.actualStartAt && entry.actualEndAt && <button className="cr-remove-block cr-waitlist-link" type="button" onClick={() => { setWaitlistTarget(entry); setWaitlistMessage(''); setWaitlistError('') }}><ListPlus size={12} />Join waitlist</button>}</div>)}</div>}</article>
    })}</div>}
    {waitlistMessage && <p className="cr-alert cr-success" role="status">{waitlistMessage}</p>}
    {waitlistError && <p className="cr-alert cr-alert-error" role="alert">{waitlistError}</p>}
    {waitlistTarget && <div className="cr-waitlist-panel"><div><strong>Join waitlist for this slot?</strong><p>{timeLabel(waitlistTarget.actualStartAt!)} – {timeLabel(waitlistTarget.actualEndAt!)} on the selected date.</p><small>The queue is limited to 3 active entries per user and 30 days ahead.</small></div><div className="cr-inline"><button className="cr-button cr-button-small cr-button-primary" type="button" disabled={waitlistWorking} onClick={() => void joinTargetWaitlist()}><ListPlus size={15} />{waitlistWorking ? 'Joining…' : 'Join waitlist'}</button><button className="cr-button cr-button-small cr-button-quiet" type="button" onClick={() => setWaitlistTarget(null)}>Cancel</button></div></div>}
    <p className="cr-help cr-calendar-note">Booking holds include setup buffers while request details remain private. The server checks availability again when a request is submitted.</p>
  </section>
}
