import { CheckCircle2, Clock3, Search, ShieldCheck, ShieldX } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { verifyBooking } from '../bookings/api'
import type { BookingVerification } from '../bookings/types'

const outcomeCopy: Record<BookingVerification['outcome'], { title: string; message: string; tone: string }> = {
  VALID_NOW: { title: 'Valid now', message: 'This approved booking is currently inside its access window. The listed space may be opened.', tone: 'valid' },
  VALID_LATER: { title: 'Valid later', message: 'The booking is approved, but its access window has not started yet.', tone: 'later' },
  EXPIRED: { title: 'Expired', message: 'The approved access window has already ended.', tone: 'invalid' },
  NOT_APPROVED: { title: 'Not approved', message: 'This reference does not currently have an approved occurrence. Do not open the space.', tone: 'invalid' },
  CANCELLED: { title: 'Cancelled', message: 'This booking is no longer valid. Do not open the space.', tone: 'invalid' },
  NOT_FOUND: { title: 'Reference not found', message: 'No booking matches this code. Check the printed confirmation and try again.', tone: 'invalid' },
}

function istDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function SecurityVerificationPage() {
  const [referenceCode, setReferenceCode] = useState('')
  const [result, setResult] = useState<BookingVerification | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setChecking(true); setError(''); setResult(null)
    try { setResult(await verifyBooking(referenceCode)) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The booking could not be checked. Confirm the connection and try again.') }
    finally { setChecking(false) }
  }

  const copy = result ? outcomeCopy[result.outcome] : null
  return <section className="cr-page cr-security-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Security desk</p><h1>Verify hall access</h1><p>Enter the booking reference shown on the requester’s confirmation.</p></div><ShieldCheck size={38} /></header>
    <form className="cr-security-search" onSubmit={(event) => void submit(event)}><label className="cr-field">Booking reference<input autoFocus autoCapitalize="characters" autoComplete="off" required minLength={6} maxLength={24} value={referenceCode} onChange={(event) => setReferenceCode(event.target.value.toUpperCase())} placeholder="CR-20260919-ABC12345" /></label><button className="cr-button cr-button-primary" type="submit" disabled={checking}><Search size={19} />{checking ? 'Checking…' : 'Check booking'}</button></form>
    {error && <div className="cr-alert cr-alert-error" role="alert"><strong>Unable to verify.</strong> {error} Never treat an unverified or stale confirmation as valid; contact an administrator if access is urgent.</div>}
    {result && copy && <article className={`cr-verification-result cr-verification-${copy.tone}`} aria-live="polite"><div className="cr-verification-state">{result.outcome === 'VALID_NOW' ? <CheckCircle2 size={42} /> : result.outcome === 'VALID_LATER' ? <Clock3 size={42} /> : <ShieldX size={42} />}<div><p className="cr-eyebrow">Live verification result</p><h2>{copy.title}</h2><p>{copy.message}</p></div></div>{result.booking && <dl><div><dt>Reference</dt><dd>{result.booking.referenceCode}</dd></div><div><dt>Programme</dt><dd>{result.booking.title}</dd></div><div><dt>Responsible person</dt><dd>{result.booking.responsiblePerson}</dd></div><div><dt>Space</dt><dd>{result.booking.resource ? `${result.booking.resource.name} · ${result.booking.resource.building}, ${result.booking.resource.location}` : 'Not available'}</dd></div><div><dt>Approved access</dt><dd>{result.booking.startAt && result.booking.endAt ? `${istDateTime(result.booking.startAt)} – ${istDateTime(result.booking.endAt)}` : 'No approved access window'}</dd></div></dl>}<small>Checked live at {istDateTime(result.checkedAt)} IST · This lookup has been recorded.</small></article>}
  </section>
}
