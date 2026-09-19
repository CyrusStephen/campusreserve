import { CalendarClock, CalendarDays, Printer, XCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { cancelBooking, cancelOccurrence, listMyBookings, rescheduleOccurrence } from '../bookings/api'
import BookingSchedule from '../bookings/BookingSchedule'
import { bookingStatusLabels, type Booking, type BookingOccurrence } from '../bookings/types'

type OccurrenceEditor = {
  bookingId: string
  occurrenceId: string
  sequenceNumber: number
  mode: 'cancel' | 'reschedule'
  startAt: string
  endAt: string
  reason: string
}

function localDateTimeInput(value: string): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function canChange(occurrence: BookingOccurrence): boolean {
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(occurrence.status) || new Date(occurrence.startAt) <= new Date()) return false
  if (occurrence.status === 'REJECTED') return true
  const deadline = new Date(occurrence.startAt).getTime()
    - occurrence.resource.cancellationDeadlineHours * 60 * 60 * 1000
  return Date.now() <= deadline
}

function canCancel(occurrence: BookingOccurrence, isAdministrator: boolean): boolean {
  if (occurrence.status !== 'PENDING' && occurrence.status !== 'APPROVED') return false
  if (isAdministrator) return true

  const deadline = new Date(occurrence.startAt).getTime()
    - occurrence.resource.cancellationDeadlineHours * 60 * 60 * 1000
  return Date.now() <= deadline
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [editor, setEditor] = useState<OccurrenceEditor | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setBookings(null); setError('')
    void listMyBookings(controller.signal).then((result) => {
      if (!controller.signal.aborted) setBookings(result)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Bookings could not be loaded.')
    })
    return () => controller.abort()
  }, [retry])

  function replaceBooking(updated: Booking) {
    setBookings((current) => current?.map((booking) => booking.id === updated.id ? updated : booking) ?? null)
  }

  async function cancel(event: FormEvent, id: string) {
    event.preventDefault()
    setWorking(true)
    setError('')
    setMessage('')

    try {
      await cancelBooking(id, reason.trim())

      const refreshed = await listMyBookings()
      setBookings(refreshed)

      setCancelId(null)
      setReason('')
      setMessage('The complete booking request was cancelled.')
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Cancellation failed.')
    } finally {
      setWorking(false)
    }
  }

  function openEditor(booking: Booking, occurrence: BookingOccurrence, mode: OccurrenceEditor['mode']) {
    setCancelId(null); setReason(''); setError(''); setMessage('')
    setEditor({
      bookingId: booking.id,
      occurrenceId: occurrence.id,
      sequenceNumber: occurrence.sequenceNumber,
      mode,
      startAt: localDateTimeInput(occurrence.startAt),
      endAt: localDateTimeInput(occurrence.endAt),
      reason: '',
    })
  }

  async function updateOccurrence(event: FormEvent) {
    event.preventDefault()
    if (!editor) return
    setWorking(true); setError(''); setMessage('')
    try {
      const updated = editor.mode === 'cancel'
        ? await cancelOccurrence(editor.bookingId, editor.occurrenceId, editor.reason.trim())
        : await rescheduleOccurrence(editor.bookingId, editor.occurrenceId, {
          startAt: new Date(editor.startAt).toISOString(),
          endAt: new Date(editor.endAt).toISOString(),
          reason: editor.reason.trim(),
        })
      replaceBooking(updated)
      setMessage(editor.mode === 'cancel'
        ? `Occurrence ${editor.sequenceNumber} was cancelled; the other dates stay unchanged.`
        : `Occurrence ${editor.sequenceNumber} was rescheduled and returned to the approval queue.`)
      setEditor(null)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The selected date could not be updated.')
    } finally { setWorking(false) }
  }

  function printConfirmation(booking: Booking) {
    const popup = window.open('', '_blank', 'width=900,height=800')
    if (!popup) { setError('Allow pop-ups to print a booking confirmation.'); return }
    const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    const rows = booking.occurrences.map((occurrence) => `<tr><td>${occurrence.sequenceNumber}</td><td>${escapeHtml(new Date(occurrence.startAt).toLocaleString())}</td><td>${escapeHtml(new Date(occurrence.endAt).toLocaleString())}</td><td>${escapeHtml(occurrence.status)}</td><td>${escapeHtml(occurrence.resource.name)}</td></tr>`).join('')
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(booking.referenceCode)} · CampusReserve</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#222}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ccc;padding:9px;text-align:left;font-size:13px}.facts{margin:24px 0;line-height:1.8}.muted{color:#666}</style></head><body><p class="muted">CampusReserve · Booking confirmation</p><h1>${escapeHtml(booking.referenceCode)}</h1><h2>${escapeHtml(booking.title)}</h2><div class="facts"><strong>Status:</strong> ${escapeHtml(booking.status)}<br><strong>Requester:</strong> ${escapeHtml(booking.requester.name)} (${escapeHtml(booking.requester.email)})<br><strong>Assigned to:</strong> ${escapeHtml(booking.assignedToName)} · ${escapeHtml(booking.assignedToEmail)} · ${escapeHtml(booking.assignedToPhone)}</div><table><thead><tr><th>#</th><th>Start</th><th>End</th><th>Status</th><th>Resource</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}. Keep this confirmation with your event records.</p><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`)
    popup.document.close()
  }

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Reservations</p><h1>My bookings</h1><p>Track requests and manage one date without disturbing the rest of a schedule.</p></div></header>
    {message && <p className="cr-alert cr-success" role="status">{message}</p>}
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload</button></div>}
    {!bookings && !error && <div className="cr-empty" role="status">Loading bookings…</div>}
    {bookings?.length === 0 && <div className="cr-empty"><CalendarDays size={32} /><h2>No booking requests yet.</h2><p>Open an active resource and submit your first request.</p><Link className="cr-button cr-button-primary" to="/app/resources">Browse resources</Link></div>}
    {bookings && bookings.length > 0 && <div className="cr-booking-list">{bookings.map((booking) => {
      const isAdministrator = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
      const firstActiveOccurrence = booking.occurrences.find((occurrence) => occurrence.status === 'PENDING' || occurrence.status === 'APPROVED')
      const canCancelAll = (booking.status === 'PENDING' || booking.status === 'APPROVED')
        && firstActiveOccurrence !== undefined
        && canCancel(firstActiveOccurrence, isAdministrator)
      const statusLabel = booking.status === 'APPROVED' && booking.occurrences.some((occurrence) => occurrence.status === 'REJECTED' || occurrence.status === 'CANCELLED') ? 'Partially approved' : bookingStatusLabels[booking.status]
      const changeableOccurrences = booking.occurrences.filter(canChange)
      return <article className="cr-panel cr-booking-card" key={booking.id}>
        <div className="cr-booking-card-head"><div><span className={`cr-status cr-status-${booking.status.toLowerCase()}`}>{statusLabel}</span><h2>{booking.title}</h2><p className="cr-reference">{booking.referenceCode} · {booking.occurrences.length} {booking.occurrences.length === 1 ? 'date' : 'dates'}</p></div><div className="cr-inline">{booking.status !== 'DRAFT' && <button className="cr-button cr-button-small" type="button" onClick={() => printConfirmation(booking)}><Printer size={16} />Confirmation</button>}{canCancelAll && <button className="cr-button cr-button-small cr-danger" type="button" onClick={() => { setEditor(null); setCancelId(cancelId === booking.id ? null : booking.id); setReason('') }}><XCircle size={16} />{booking.occurrences.length > 1 ? 'Cancel all dates' : 'Cancel request'}</button>}</div></div>
        <BookingSchedule occurrences={booking.occurrences} />
        <div className="cr-booking-facts cr-assigned-facts"><div><strong>Assigned to</strong><span>{booking.assignedToName}</span></div><div><strong>Email</strong><span>{booking.assignedToEmail}</span></div><div><strong>Phone</strong><span>{booking.assignedToPhone}</span></div></div>
        {changeableOccurrences.length > 0 && <div className="cr-occurrence-tools"><strong>Manage individual dates</strong><div>{changeableOccurrences.map((occurrence) => <div key={occurrence.id}><span>Occurrence {occurrence.sequenceNumber}</span><div className="cr-inline"><button className="cr-button cr-button-small" type="button" onClick={() => openEditor(booking, occurrence, 'reschedule')}><CalendarClock size={15} />Reschedule</button>{booking.occurrences.length > 1 && canCancel(occurrence, isAdministrator) && <button className="cr-button cr-button-small cr-danger" type="button" onClick={() => openEditor(booking, occurrence, 'cancel')}><XCircle size={15} />Cancel this date</button>}</div></div>)}</div></div>}
        {editor?.bookingId === booking.id && <form className="cr-occurrence-form" onSubmit={(event) => void updateOccurrence(event)}>
          <h3>{editor.mode === 'cancel' ? 'Cancel' : 'Reschedule'} occurrence {editor.sequenceNumber}</h3>
          {editor.mode === 'reschedule' && <div className="cr-form-grid"><label className="cr-field">New start<input type="datetime-local" required value={editor.startAt} onChange={(event) => setEditor((current) => current ? { ...current, startAt: event.target.value } : null)} /></label><label className="cr-field">New end<input type="datetime-local" required value={editor.endAt} onChange={(event) => setEditor((current) => current ? { ...current, endAt: event.target.value } : null)} /></label></div>}
          <label className="cr-field">Reason<input required minLength={3} maxLength={2000} value={editor.reason} onChange={(event) => setEditor((current) => current ? { ...current, reason: event.target.value } : null)} placeholder={editor.mode === 'cancel' ? 'Why is this date no longer needed?' : 'Why does this date need to change?'} /></label>
          {editor.mode === 'reschedule' && <p className="cr-help">The changed date becomes pending again. All other occurrence decisions stay unchanged.</p>}
          <div className="cr-inline"><button className={`cr-button ${editor.mode === 'cancel' ? 'cr-danger' : 'cr-button-primary'}`} disabled={working} type="submit">{working ? 'Saving…' : editor.mode === 'cancel' ? 'Cancel this date' : 'Save new date'}</button><button className="cr-button cr-button-quiet" type="button" onClick={() => setEditor(null)}>Keep unchanged</button></div>
        </form>}
        <p className="cr-preserve-lines">{booking.purpose}</p>
        {booking.decisionReason && <p className="cr-decision-note"><strong>Decision note:</strong> {booking.decisionReason}</p>}
        {cancelId === booking.id && <form className="cr-cancel-form" onSubmit={(event) => void cancel(event, booking.id)}><p className="cr-help">Cancelling releases every pending or approved date in this request.</p><label className="cr-field">Reason for cancellation<input required minLength={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="cr-inline"><button className="cr-button cr-danger" disabled={working} type="submit">{working ? 'Cancelling…' : 'Cancel complete request'}</button><button className="cr-button cr-button-quiet" type="button" onClick={() => setCancelId(null)}>Keep booking</button></div></form>}
      </article>
    })}</div>}
  </section>
}
