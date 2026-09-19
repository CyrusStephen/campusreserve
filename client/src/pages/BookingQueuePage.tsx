import { CalendarCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { decideBooking, decideOccurrence, listBookingQueue } from '../bookings/api'
import BookingSchedule from '../bookings/BookingSchedule'
import type { Booking } from '../bookings/types'
import { useAuth } from '../auth/useAuth'
import { intervalTouchesWeekend } from '../bookings/weekend'
import { useSearchParams } from 'react-router'

export default function BookingQueuePage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [occurrenceReasons, setOccurrenceReasons] = useState<Record<string, string>>({})
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setBookings(null); setError('')
    void listBookingQueue(controller.signal).then((result) => {
      if (!controller.signal.aborted) setBookings(result)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Approval queue could not be loaded.')
    })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    if (!bookings) return
    const bookingId = searchParams.get('booking')
    if (!bookingId) return
    window.requestAnimationFrame(() => document.getElementById(`approval-${bookingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [bookings, searchParams])

  async function decide(booking: Booking, decision: 'APPROVE' | 'REJECT') {
    const reason = reasons[booking.id]?.trim() || null
    if (decision === 'REJECT' && (!reason || reason.length < 3)) {
      setError('Enter a short reason before rejecting a request.')
      return
    }
    if (decision === 'APPROVE' && booking.occurrences.some((occurrence) => intervalTouchesWeekend(occurrence.startAt, occurrence.endAt)) && (!reason || reason.length < 3)) {
      setError('Enter a short reason before approving the weekend exception.')
      return
    }
    setWorkingId(booking.id); setError(''); setMessage('')
    try {
      await decideBooking(booking.id, decision, reason)
      setBookings((current) => current?.filter((item) => item.id !== booking.id) ?? null)
      setReasons((current) => { const next = { ...current }; delete next[booking.id]; return next })
      setMessage(`${booking.referenceCode} was ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The decision could not be saved.')
    } finally { setWorkingId(null) }
  }

  async function decideDate(booking: Booking, occurrenceId: string, decision: 'APPROVE' | 'REJECT') {
    const reason = occurrenceReasons[occurrenceId]?.trim() || null
    if (decision === 'REJECT' && (!reason || reason.length < 3)) {
      setError('Enter a short reason before rejecting this occurrence.')
      return
    }
    const occurrence = booking.occurrences.find((item) => item.id === occurrenceId)
    if (decision === 'APPROVE' && occurrence && intervalTouchesWeekend(occurrence.startAt, occurrence.endAt) && (!reason || reason.length < 3)) {
      setError('Enter a short reason before approving this weekend exception.')
      return
    }
    const key = `${booking.id}:${occurrenceId}`
    setWorkingId(key); setError(''); setMessage('')
    try {
      const updated = await decideOccurrence(booking.id, occurrenceId, decision, reason)
      if (updated.status === 'PENDING') {
        setBookings((current) => current?.map((item) => item.id === booking.id ? updated : item) ?? null)
      } else {
        setBookings((current) => current?.filter((item) => item.id !== booking.id) ?? null)
      }
      setOccurrenceReasons((current) => { const next = { ...current }; delete next[occurrenceId]; return next })
      setMessage(`The selected date was ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The occurrence decision could not be saved.')
    } finally { setWorkingId(null) }
  }

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Administration</p><h1>Approval queue</h1><p>Review every date before approving the complete request.</p></div></header>
    {message && <p className="cr-alert cr-success" role="status">{message}</p>}
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload</button></div>}
    {!bookings && !error && <div className="cr-empty" role="status">Loading approval queue…</div>}
    {bookings?.length === 0 && <div className="cr-empty"><CalendarCheck size={34} /><h2>All caught up.</h2><p>New faculty, staff and administrator requests will appear here.</p></div>}
    {bookings && bookings.length > 0 && <div className="cr-booking-list">{bookings.map((booking) => { const ownRequest = booking.requester.id === user?.id; const hasWeekend = booking.occurrences.some((occurrence) => intervalTouchesWeekend(occurrence.startAt, occurrence.endAt)); const focused = searchParams.get('booking') === booking.id; return <article className={`cr-panel cr-booking-card${focused ? ' cr-booking-card-focused' : ''}`} id={`approval-${booking.id}`} key={booking.id}>
      <div className="cr-booking-card-head"><div><span className="cr-status cr-status-pending">Awaiting approval</span><h2>{booking.title}</h2><p className="cr-reference">{booking.referenceCode} · Requested by {booking.requester.name} · {booking.occurrences.length} {booking.occurrences.length === 1 ? 'date' : 'dates'}</p></div></div>
      <BookingSchedule occurrences={booking.occurrences} />
      <div className="cr-booking-facts cr-assigned-facts"><div><strong>Assigned to</strong><span>{booking.assignedToName}</span></div><div><strong>Email</strong><span>{booking.assignedToEmail}</span></div><div><strong>Phone</strong><span>{booking.assignedToPhone}</span></div></div>
      {ownRequest && <p className="cr-alert">This is your request. Another administrator must review it.</p>}
      {!ownRequest && booking.occurrences.some((occurrence) => occurrence.status === 'PENDING') && <div className="cr-occurrence-decisions"><h3>Decide individual dates</h3>{booking.occurrences.map((occurrence, index) => { const weekend = intervalTouchesWeekend(occurrence.startAt, occurrence.endAt); return occurrence.status === 'PENDING' && <div className="cr-occurrence-decision" key={occurrence.id}><strong>Occurrence {index + 1}</strong><label className="cr-field">Decision note<input disabled={Boolean(workingId)} maxLength={2000} value={occurrenceReasons[occurrence.id] ?? ''} onChange={(event) => setOccurrenceReasons((current) => ({ ...current, [occurrence.id]: event.target.value }))} placeholder={weekend ? 'Required for a weekend exception' : 'Required when rejecting'} /></label><div className="cr-inline"><button className="cr-button cr-button-small cr-button-primary" disabled={Boolean(workingId)} onClick={() => void decideDate(booking, occurrence.id, 'APPROVE')}><CalendarCheck size={16} />{workingId === `${booking.id}:${occurrence.id}` ? 'Saving…' : weekend ? 'Approve exception' : 'Approve date'}</button><button className="cr-button cr-button-small cr-danger" disabled={Boolean(workingId)} onClick={() => void decideDate(booking, occurrence.id, 'REJECT')}><XCircle size={16} />{workingId === `${booking.id}:${occurrence.id}` ? 'Saving…' : 'Reject date'}</button></div></div> })}</div>}
      <h3>Purpose</h3><p className="cr-preserve-lines">{booking.purpose}</p>
      {booking.notes && <p className="cr-decision-note"><strong>Requester note:</strong> {booking.notes}</p>}
      {!ownRequest && booking.occurrences.every((occurrence) => occurrence.status === 'PENDING') && <><label className="cr-field">Whole-request decision note<textarea disabled={Boolean(workingId)} rows={2} maxLength={2000} value={reasons[booking.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder={hasWeekend ? 'Required to approve weekend dates or reject the request' : 'Required for rejection; optional for approval'} /></label><div className="cr-decision-actions"><button className="cr-button cr-button-primary" disabled={Boolean(workingId)} onClick={() => void decide(booking, 'APPROVE')}><CalendarCheck size={17} />{workingId === booking.id ? 'Saving…' : hasWeekend ? 'Approve all + exception' : 'Approve all dates'}</button><button className="cr-button cr-danger" disabled={Boolean(workingId)} onClick={() => void decide(booking, 'REJECT')}><XCircle size={17} />{workingId === booking.id ? 'Saving…' : 'Reject all dates'}</button></div></>}
    </article> })}</div>}
  </section>
}
