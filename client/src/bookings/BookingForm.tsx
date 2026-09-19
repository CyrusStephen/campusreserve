import { CalendarCheck, Plus, Send, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import type { Resource } from '../resources/types'
import { createBooking } from './api'
import type { Booking } from './types'
import { intervalTouchesWeekend } from './weekend'

interface DraftOccurrence { id: string; startAt: string; endAt: string }

function localDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function firstOccurrence(minimumNoticeHours: number): DraftOccurrence {
  const earliest = new Date(Date.now() + minimumNoticeHours * 60 * 60 * 1000)
  const start = new Date(earliest)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  if (start.getHours() < 8 || start.getHours() >= 17) {
    start.setDate(start.getDate() + (start.getHours() >= 17 ? 1 : 0))
    start.setHours(10, 0, 0, 0)
  }
  return { id: crypto.randomUUID(), startAt: localDateTime(start), endAt: localDateTime(new Date(start.getTime() + 60 * 60 * 1000)) }
}

export default function BookingForm({ resource, onCreated }: { resource: Resource; onCreated?: (booking: Booking) => void }) {
  const { user } = useAuth()
  const requester = Boolean(user)
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [expectedPeople, setExpectedPeople] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [occurrences, setOccurrences] = useState<DraftOccurrence[]>(() => [firstOccurrence(resource.minimumNoticeHours)])
  const [notes, setNotes] = useState('')
  const [assignedToName, setAssignedToName] = useState(user?.name ?? '')
  const [assignedToEmail, setAssignedToEmail] = useState(user?.email ?? '')
  const [assignedToPhone, setAssignedToPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Booking | null>(null)
  const weekendCount = occurrences.filter((occurrence) => intervalTouchesWeekend(occurrence.startAt, occurrence.endAt)).length
  const minimumStart = localDateTime(new Date(Date.now() + resource.minimumNoticeHours * 60 * 60 * 1000))
  const maximumStart = localDateTime(new Date(Date.now() + resource.advanceBookingDays * 24 * 60 * 60 * 1000))

  if (!requester || resource.status !== 'ACTIVE' || resource.isDemo) return null

  function changeOccurrence(id: string, field: 'startAt' | 'endAt', value: string) {
    setOccurrences((current) => current.map((occurrence) => occurrence.id === id ? { ...occurrence, [field]: value } : occurrence))
  }

  function addNextWeek() {
    setOccurrences((current) => {
      const previous = current[current.length - 1]
      if (!previous || current.length >= 12) return current
      const start = new Date(previous.startAt)
      const end = new Date(previous.endAt)
      start.setDate(start.getDate() + 7)
      end.setDate(end.getDate() + 7)
      return [...current, { id: crypto.randomUUID(), startAt: localDateTime(start), endAt: localDateTime(end) }]
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true); setError(''); setCreated(null)
    try {
      const schedule = occurrences.map((occurrence, index) => {
        const start = new Date(occurrence.startAt)
        const end = new Date(occurrence.endAt)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error(`Choose valid times for occurrence ${index + 1}.`)
        if (end <= start) throw new Error(`Occurrence ${index + 1} must end after it starts.`)
        if (start.getTime() < Date.now() + resource.minimumNoticeHours * 60 * 60 * 1000) throw new Error(`Occurrence ${index + 1} needs at least ${resource.minimumNoticeHours} hour(s) notice.`)
        return { startAt: start.toISOString(), endAt: end.toISOString() }
      })
      const booking = await createBooking({
        resourceId: resource.id,
        title: title.trim(),
        purpose: purpose.trim(),
        expectedPeople: expectedPeople ? Number(expectedPeople) : null,
        notes: notes.trim() || null,
        assignedToName: assignedToName.trim(),
        assignedToEmail: assignedToEmail.trim(),
        assignedToPhone: assignedToPhone.trim(),
        occurrences: schedule,
        quantity: Number(quantity),
      })
      setCreated(booking)
      onCreated?.(booking)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The booking request could not be submitted.')
    } finally { setSubmitting(false) }
  }

  if (created) return <section className="cr-panel cr-booking-form"><div className="cr-booking-success"><CalendarCheck size={30} /><div><h2>Request submitted</h2><p>Your reference is <strong>{created.referenceCode}</strong>. {created.occurrences.length} {created.occurrences.length === 1 ? 'date is' : 'dates are'} held while an administrator reviews the request.</p></div></div><Link className="cr-button cr-button-primary cr-button-full" to="/app/bookings">Track this request</Link></section>

  return <section className="cr-panel cr-booking-form"><h2>Request this resource</h2><p className="cr-help">Add up to 12 custom dates. Each occurrence can use a different date or time, and administrators can decide each date separately.</p><form onSubmit={(event) => void submit(event)}>
    <label className="cr-field">Booking title<input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Weekly department seminar" /></label>
    <label className="cr-field">Purpose<textarea required minLength={10} maxLength={5000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Tell the approver what the resource will be used for." /></label>
    <fieldset className="cr-schedule-editor"><legend>Custom schedule</legend>{occurrences.map((occurrence, index) => { const weekend = intervalTouchesWeekend(occurrence.startAt, occurrence.endAt); return <div className="cr-occurrence-editor" key={occurrence.id}><div className="cr-occurrence-title"><div className="cr-inline"><strong>Occurrence {index + 1}</strong>{weekend && <span className="cr-status cr-status-weekend">Weekend exception</span>}</div>{occurrences.length > 1 && <button className="cr-button cr-button-small cr-danger" type="button" onClick={() => setOccurrences((current) => current.filter((item) => item.id !== occurrence.id))}><Trash2 size={15} />Remove</button>}</div><div className="cr-form-grid"><label className="cr-field">Starts<input required type="datetime-local" min={minimumStart} max={maximumStart} value={occurrence.startAt} onChange={(event) => changeOccurrence(occurrence.id, 'startAt', event.target.value)} /></label><label className="cr-field">Ends<input required type="datetime-local" min={occurrence.startAt || minimumStart} value={occurrence.endAt} onChange={(event) => changeOccurrence(occurrence.id, 'endAt', event.target.value)} /></label></div></div> })}</fieldset>
    {weekendCount > 0 && <p className="cr-alert"><strong>Weekend exception required.</strong> {weekendCount} {weekendCount === 1 ? 'date falls' : 'dates fall'} on Saturday or Sunday. You may submit the request, but an administrator must record a reason before approving {weekendCount === 1 ? 'it' : 'them'}.</p>}
    <button className="cr-button cr-button-full" type="button" disabled={occurrences.length >= 12} onClick={addNextWeek}><Plus size={17} />{occurrences.length >= 12 ? 'Maximum 12 dates' : 'Add another date next week'}</button>
    <div className="cr-form-grid"><label className="cr-field">Expected people<input type="number" min="1" max={resource.capacity ?? 100000} value={expectedPeople} onChange={(event) => setExpectedPeople(event.target.value)} placeholder="Optional" /></label>{resource.type === 'EQUIPMENT' && !resource.isExclusive ? <label className="cr-field">Quantity<input required type="number" min="1" max={resource.totalQuantity} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label> : <span />}</div>
    <fieldset className="cr-schedule-editor">
      <legend>Assigned to</legend>
      <p className="cr-help">Who will be physically responsible for the programme at the venue? This person may be different from the requester.</p>
      <div className="cr-form-grid">
        <label className="cr-field">Name<input required minLength={2} maxLength={120} value={assignedToName} onChange={(event) => setAssignedToName(event.target.value)} placeholder="Programme coordinator" /></label>
        <label className="cr-field">Email<input required type="email" maxLength={255} value={assignedToEmail} onChange={(event) => setAssignedToEmail(event.target.value)} placeholder="coordinator@college.edu" /></label>
      </div>
      <label className="cr-field">Phone number<input required inputMode="tel" maxLength={30} value={assignedToPhone} onChange={(event) => setAssignedToPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
    </fieldset>
    {<label className="cr-field">Notes for the administrator<textarea maxLength={5000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional setup or access details" /></label>}
    {error && <p className="cr-alert cr-alert-error" role="alert">{error}</p>}
    <button className="cr-button cr-button-primary cr-button-full" type="submit" disabled={submitting}><Send size={17} />{submitting ? 'Submitting…' : `Submit ${occurrences.length === 1 ? 'booking request' : `${occurrences.length}-date request`}`}</button>
  </form></section>
}
