import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { exportBookingsCsv } from '../bookings/api'

export default function ReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function exportCsv() {
    setWorking(true); setMessage(''); setError('')
    try {
      if (from && to && from > to) throw new Error('The report end date must be on or after the start date.')
      const blob = await exportBookingsCsv({ from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined, status: status || undefined })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `campusreserve-bookings-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setMessage('CSV export downloaded successfully.')
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The CSV export could not be created.')
    } finally { setWorking(false) }
  }

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Administration</p><h1>Reports & exports</h1><p>Export booking records for institutional reports, reviews and archival.</p></div></header>
    {message && <p className="cr-alert cr-success" role="status">{message}</p>}
    {error && <p className="cr-alert cr-alert-error" role="alert">{error}</p>}
    <section className="cr-panel">
      <div className="cr-section-head"><div><div className="cr-inline"><FileSpreadsheet size={21} /><h2>Booking CSV</h2></div><p className="cr-help">Filters apply to booking occurrence dates. The export includes requester, department, coordinator, venue, status, decision and schedule details.</p></div></div>
      <div className="cr-form-grid">
        <label className="cr-field">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="cr-field">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <label className="cr-field">Booking status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option></select></label>
      <button className="cr-button cr-button-primary" type="button" disabled={working} onClick={() => void exportCsv()}><Download size={17} />{working ? 'Preparing export…' : 'Download CSV'}</button>
    </section>
    <section className="cr-panel">
      <h2>Recommended archive workflow</h2>
      <p className="cr-help">Keep periodic exports in the college's approved storage once the official institutional account and storage platform are confirmed. CampusReserve does not put database records into an email inbox.</p>
    </section>
  </section>
}
