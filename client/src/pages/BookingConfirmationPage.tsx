import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { listMyBookings } from '../bookings/api'
import type { Booking } from '../bookings/types'
import './booking-confirmation.css'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function BookingConfirmationPage() {
  const { id } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void listMyBookings(controller.signal).then((items) => {
      if (controller.signal.aborted) return
      const found = items.find((item) => item.id === id && item.status !== 'DRAFT')
      if (!found) setError('This confirmation is not available in your bookings.')
      else setBooking(found)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load the confirmation.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, retry])

  return <section className="cr-page cr-confirmation-page">
    <div className="cr-confirmation-controls"><Link className="cr-button" to="/app/bookings"><ArrowLeft size={17} />Back to my bookings</Link>{booking && <button className="cr-button" type="button" onClick={() => window.print()}><Printer size={17} />Print confirmation</button>}</div>
    {loading && <p role="status">Loading confirmation…</p>}
    {!loading && error && <div className="cr-alert cr-alert-error" role="alert">{error} <button className="cr-button" type="button" onClick={() => setRetry((count) => count + 1)}>Try again</button></div>}
    {!loading && booking && <article className="cr-panel cr-confirmation-print">
      <p className="cr-eyebrow">CampusReserve · Booking confirmation</p>
      <h1>{booking.referenceCode}</h1>
      <h2>{booking.title}</h2>
      <div className="cr-confirmation-details">
        <p><strong>Status</strong><span>{booking.status.replaceAll('_', ' ')}</span></p>
        <p><strong>Requester</strong><span>{booking.requester.name} · {booking.requester.email}</span></p>
        <p><strong>Assigned to</strong><span>{booking.assignedToName} · {booking.assignedToEmail} · {booking.assignedToPhone}</span></p>
      </div>
      <div className="cr-confirmation-table-wrap"><table><thead><tr><th>#</th><th>Start</th><th>End</th><th>Status</th><th>Resource</th></tr></thead><tbody>{booking.occurrences.map((occurrence) => <tr key={occurrence.id}><td>{occurrence.sequenceNumber}</td><td>{formatDate(occurrence.startAt)}</td><td>{formatDate(occurrence.endAt)}</td><td>{occurrence.status}</td><td>{occurrence.resource.name}</td></tr>)}</tbody></table></div>
      <p className="cr-help">Generated {formatDate(new Date().toISOString())}. Keep this confirmation with your event records.</p>
    </article>}
  </section>
}
