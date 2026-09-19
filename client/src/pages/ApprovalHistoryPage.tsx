import { History, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listApprovalHistory } from '../bookings/api'
import BookingSchedule from '../bookings/BookingSchedule'
import type { ApprovalHistoryEntry } from '../bookings/types'

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function ApprovalHistoryPage() {
  const [history, setHistory] = useState<ApprovalHistoryEntry[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setHistory(null); setError('')
    void listApprovalHistory(controller.signal).then((result) => {
      if (!controller.signal.aborted) setHistory(result)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Approval history could not be loaded.')
    })
    return () => controller.abort()
  }, [retry])

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Administration</p><h1>Approval history</h1><p>See who approved or rejected each request and every date covered by that decision.</p></div></header>
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload</button></div>}
    {!history && !error && <div className="cr-empty" role="status">Loading approval history…</div>}
    {history?.length === 0 && <div className="cr-empty"><History size={34} /><h2>No decisions recorded yet.</h2><p>Approved and rejected requests will be recorded here automatically.</p></div>}
    {history && history.length > 0 && <div className="cr-booking-list">{history.map((entry) => {
      const booking = entry.reservation
      const decidedOccurrences = entry.occurrenceId ? booking.occurrences.filter((occurrence) => occurrence.id === entry.occurrenceId) : booking.occurrences
      return <article className="cr-panel cr-booking-card" key={entry.id}>
        <div className="cr-booking-card-head"><div><span className={`cr-status cr-status-${entry.decision.toLowerCase()}`}>{entry.decision === 'APPROVED' ? 'Approved' : 'Rejected'}</span><h2>{booking.title}</h2><p className="cr-reference">{booking.referenceCode} · Requested by {booking.requester.name} · {entry.occurrenceId ? 'Individual date decision' : `${booking.occurrences.length} ${booking.occurrences.length === 1 ? 'date' : 'dates'}`}</p></div><p className="cr-history-date">{dateTime(entry.decidedAt)}</p></div>
        <BookingSchedule occurrences={decidedOccurrences} />
        <div className="cr-booking-facts cr-assigned-facts"><div><strong>Assigned to</strong><span>{booking.assignedToName}</span></div><div><strong>Email</strong><span>{booking.assignedToEmail}</span></div><div><strong>Phone</strong><span>{booking.assignedToPhone}</span></div></div>
        <p className="cr-history-admin"><UserRoundCheck size={17} /><span>{entry.administrator ? <><strong>{entry.administrator.name}</strong> ({entry.administrator.role.replaceAll('_', ' ')})</> : 'Former administrator account'}</span></p>
        {entry.reason && <p className="cr-decision-note"><strong>Decision note:</strong> {entry.reason}</p>}
        <details className="cr-history-details"><summary>View request purpose</summary><p className="cr-preserve-lines">{booking.purpose}</p></details>
      </article>
    })}</div>}
  </section>
}
