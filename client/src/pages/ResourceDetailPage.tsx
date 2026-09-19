import { ArrowLeft, ExternalLink, MapPin, Pencil, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getResource } from '../resources/api'
import ResourcePhoto from '../resources/ResourcePhoto'
import { resourceLabels, type Resource } from '../resources/types'
import BookingForm from '../bookings/BookingForm'
import AvailabilityCalendar from '../bookings/AvailabilityCalendar'

export default function ResourceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const administrator = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [resource, setResource] = useState<Resource | null>(null)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setResource(null); setError(''); setSelectedPhoto(null)
    void getResource(id, controller.signal).then((result) => { if (!controller.signal.aborted) setResource(result) }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Resource could not be loaded.')
    })
    return () => controller.abort()
  }, [id, retry])
  if (error) return <section className="cr-page"><Link className="cr-back" to="/app/resources"><ArrowLeft size={17} />Resources</Link><div className="cr-alert cr-alert-error" role="alert">{error}</div><button className="cr-button" onClick={() => setRetry((value) => value + 1)}>Try again</button></section>
  if (!resource) return <div className="cr-empty" role="status">Loading resource…</div>
  const photo = resource.images.find((image) => image.id === selectedPhoto) ?? resource.images[0]
  const back = resource.isDemo ? '/app/manage/resources?view=demo' : administrator && resource.status !== 'ACTIVE' ? '/app/manage/resources' : '/app/resources'
  return (
    <section className="cr-page">
      <Link className="cr-back" to={back}><ArrowLeft size={17} />Back to resources</Link>
      <header className="cr-page-heading"><div><div className="cr-inline cr-wrap"><span className="cr-tag">{resourceLabels[resource.type]}</span>{resource.isDemo && <span className="cr-tag cr-tag-demo">Demo only</span>}{resource.status !== 'ACTIVE' && <span className={`cr-tag cr-status-${resource.status.toLowerCase()}`}>{resource.status.toLowerCase()}</span>}</div><h1>{resource.name}</h1><p className="cr-meta"><MapPin size={18} />{resource.building} · {resource.location}</p></div>{administrator && <Link className="cr-button" to={`/app/manage/resources/${resource.id}/edit`}><Pencil size={17} />Edit resource</Link>}</header>
      {resource.isDemo && <p className="cr-alert">This is sample data, not a verified college venue. It is visible only to administrators and cannot be booked.</p>}
      <div className="cr-detail-grid"><div>
        <ResourcePhoto photo={photo} className="cr-hero-photo" />
        {resource.images.length > 1 && <div className="cr-thumbnails" aria-label="Resource photos">{resource.images.map((image, index) => <button key={image.id} type="button" aria-label={`Show photo ${index + 1}: ${image.altText}`} aria-pressed={image.id === photo?.id} onClick={() => setSelectedPhoto(image.id)}><ResourcePhoto photo={image} /></button>)}</div>}
        {photo && <p className="cr-caption">{photo.altText}</p>}
        {!resource.isDemo && resource.status === 'ACTIVE' && <AvailabilityCalendar resource={resource} refreshKey={availabilityVersion} />}
        <section className="cr-panel"><h2>About this {resourceLabels[resource.type].toLowerCase()}</h2><p className="cr-preserve-lines">{resource.description}</p>{resource.features.length > 0 && <><h3>Facilities & features</h3><ul className="cr-feature-list">{resource.features.map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}</ul></>}{resource.instructions && <><h3>Before you use this resource</h3><p className="cr-preserve-lines">{resource.instructions}</p></>}</section>
      </div><aside className="cr-detail-aside">
        <section className="cr-panel"><p className="cr-meta"><Users size={19} />{resource.type === 'EQUIPMENT' ? `${resource.totalQuantity} unit(s) · ${resource.isExclusive ? 'exclusive use' : 'shared stock'}` : `Capacity: ${resource.capacity ?? '—'} people`}</p>
          {resource.tourUrl && <a className="cr-button cr-button-primary cr-button-full" href={resource.tourUrl} target="_blank" rel="noopener noreferrer">Explore in 360°<ExternalLink size={17} /></a>}
          {resource.tourUrl && <p className="cr-help">Opens the college’s tour in a new tab.</p>}
          {!resource.isDemo && resource.status === 'ACTIVE' && administrator && <p className="cr-help">Faculty, staff and administrators can submit booking requests for this resource.</p>}
        </section>
        <BookingForm resource={resource} onCreated={() => setAvailabilityVersion((value) => value + 1)} />
        <section className="cr-panel"><h2>Booking rules</h2><dl className="cr-policy-list"><div><dt>Approval</dt><dd>Required for every request</dd></div><div><dt>Book ahead</dt><dd>Up to {resource.advanceBookingDays} days</dd></div><div><dt>Minimum notice</dt><dd>{resource.minimumNoticeHours} hours</dd></div><div><dt>Maximum duration</dt><dd>{resource.maximumDurationMinutes} minutes</dd></div><div><dt>Buffers</dt><dd>{resource.bufferBeforeMinutes} min before / {resource.bufferAfterMinutes} min after</dd></div><div><dt>Cancel before</dt><dd>{resource.cancellationDeadlineHours} hours before the start</dd></div></dl></section>
      </aside></div>
    </section>
  )
}
