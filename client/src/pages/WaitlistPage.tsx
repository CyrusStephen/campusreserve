import { Clock3, ListPlus, XCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { claimWaitlist, cancelWaitlist, listMyWaitlist } from '../bookings/api'
import type { WaitlistEntry } from '../bookings/types'
import { useAuth } from '../auth/useAuth'

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

type ClaimState = {
  id: string
  title: string
  purpose: string
  expectedPeople: string
  notes: string
  assignedToName: string
  assignedToEmail: string
  assignedToPhone: string
}

export default function WaitlistPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<WaitlistEntry[] | null>(null)
  const [claim, setClaim] = useState<ClaimState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setItems(null); setError('')
    void listMyWaitlist(controller.signal).then((result) => {
      if (!controller.signal.aborted) setItems(result.items)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Waitlist could not be loaded.')
    })
    return () => controller.abort()
  }, [retry])

  async function cancel(id: string) {
    setWorking(true); setError('')
    try {
      await cancelWaitlist(id)
      setItems((current) => current?.filter((item) => item.id !== id) ?? null)
      setMessage('Waitlist entry cancelled.')
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The waitlist entry could not be cancelled.')
    } finally { setWorking(false) }
  }

  function openClaim(item: WaitlistEntry) {
    setClaim({
      id: item.id, title: '', purpose: '', expectedPeople: '', notes: '',
      assignedToName: user?.name ?? '', assignedToEmail: user?.email ?? '', assignedToPhone: '',
    })
    setError(''); setMessage('')
  }

  async function submitClaim(event: FormEvent) {
    event.preventDefault()
    if (!claim) return
    setWorking(true); setError('')
    try {
      await claimWaitlist(claim.id, {
        title: claim.title.trim(),
        purpose: claim.purpose.trim(),
        expectedPeople: claim.expectedPeople ? Number(claim.expectedPeople) : null,
        notes: claim.notes.trim() || null,
        assignedToName: claim.assignedToName.trim(),
        assignedToEmail: claim.assignedToEmail.trim(),
        assignedToPhone: claim.assignedToPhone.trim(),
      })
      setItems((current) => current?.filter((item) => item.id !== claim.id) ?? null)
      setClaim(null)
      setMessage('The slot was claimed and a booking request was submitted for administrator approval.')
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The waitlist claim could not be completed.')
    } finally { setWorking(false) }
  }

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Reservations</p><h1>My waitlist</h1><p>Join occupied slots and get a four-hour claim window when one becomes available.</p></div></header>
    {message && <p className="cr-alert cr-success" role="status">{message}</p>}
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload</button></div>}
    {claim && <section className="cr-panel cr-claim-panel"><div className="cr-section-head"><div><p className="cr-eyebrow">Claim available slot</p><h2>Complete the booking request</h2><p className="cr-help">The slot is not approved yet. Your claim creates a normal pending booking request.</p></div><button className="cr-button cr-button-quiet" type="button" onClick={() => setClaim(null)}>Close</button></div><form onSubmit={(event) => void submitClaim(event)}>
      <label className="cr-field">Booking title<input required minLength={3} maxLength={180} value={claim.title} onChange={(event) => setClaim((current) => current ? { ...current, title: event.target.value } : null)} /></label>
      <label className="cr-field">Purpose<textarea required minLength={10} maxLength={5000} rows={3} value={claim.purpose} onChange={(event) => setClaim((current) => current ? { ...current, purpose: event.target.value } : null)} /></label>
      <div className="cr-form-grid"><label className="cr-field">Expected people<input type="number" min="1" max="100000" value={claim.expectedPeople} onChange={(event) => setClaim((current) => current ? { ...current, expectedPeople: event.target.value } : null)} /></label><label className="cr-field">Coordinator phone<input required inputMode="tel" value={claim.assignedToPhone} onChange={(event) => setClaim((current) => current ? { ...current, assignedToPhone: event.target.value } : null)} /></label></div>
      <div className="cr-form-grid"><label className="cr-field">Assigned to name<input required value={claim.assignedToName} onChange={(event) => setClaim((current) => current ? { ...current, assignedToName: event.target.value } : null)} /></label><label className="cr-field">Assigned to email<input required type="email" value={claim.assignedToEmail} onChange={(event) => setClaim((current) => current ? { ...current, assignedToEmail: event.target.value } : null)} /></label></div>
      <label className="cr-field">Notes<textarea maxLength={5000} rows={2} value={claim.notes} onChange={(event) => setClaim((current) => current ? { ...current, notes: event.target.value } : null)} /></label>
      <button className="cr-button cr-button-primary" type="submit" disabled={working}><ListPlus size={17} />{working ? 'Claiming…' : 'Claim slot & submit request'}</button>
    </form></section>}
    {!items && !error && <div className="cr-empty" role="status">Loading waitlist…</div>}
    {items?.length === 0 && <div className="cr-empty"><ListPlus size={34} /><h2>No active waitlist entries.</h2><p>When a resource is occupied, you can join its queue from the live availability calendar.</p></div>}
    {items && items.length > 0 && <div className="cr-booking-list">{items.map((item) => {
      const offered = Boolean(item.notifiedAt && item.claimExpiresAt && new Date(item.claimExpiresAt) > new Date())
      return <article className="cr-panel cr-booking-card" key={item.id}>
        <div className="cr-booking-card-head"><div><span className={`cr-status ${offered ? 'cr-status-approved' : 'cr-status-pending'}`}>{offered ? 'Slot available' : 'Waiting'}</span><h2>{item.resourceName}</h2><p className="cr-reference">{item.position ? `#${item.position} in queue · ` : ''}{dateTime(item.startAt)} – {dateTime(item.endAt)}</p></div><button className="cr-button cr-button-small cr-danger" type="button" disabled={working} onClick={() => void cancel(item.id)}><XCircle size={16} />Leave waitlist</button></div>
        {offered ? <div className="cr-alert cr-success"><strong>Good news.</strong> This slot is available for you until {dateTime(item.claimExpiresAt!)}.<div className="cr-inline cr-waitlist-actions"><button className="cr-button cr-button-primary" type="button" onClick={() => openClaim(item)}>Claim now</button></div></div> : <p className="cr-help"><Clock3 size={14} /> We will notify you when the slot becomes available.</p>}
      </article>
    })}</div>}
  </section>
}
