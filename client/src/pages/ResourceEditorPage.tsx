import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getResource, saveResource } from '../resources/api'
import PhotoManager from '../resources/PhotoManager'
import { editableResource, emptyResource, type Resource, type ResourceInput, type ResourceStatus, type ResourceType } from '../resources/types'

function NumberField({ name, label, value, min, max, onChange, required = true }: {
  name: string; label: string; value: number | null; min: number; max: number
  onChange: (value: number | null) => void; required?: boolean
}) {
  return <label className="cr-field" htmlFor={name}><span>{label}</span><input id={name} type="number" min={min} max={max} step={1} required={required} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} /></label>
}

export default function ResourceEditorPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const administrator = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const navigate = useNavigate()
  const [resource, setResource] = useState<Resource | null>(null)
  const [input, setInput] = useState<ResourceInput>({ ...emptyResource })
  const [features, setFeatures] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [retry, setRetry] = useState(0)
  const normalized = { ...input, features: [...new Set(features.split(',').map((value) => value.trim()).filter(Boolean))] }
  const dirty = JSON.stringify(normalized) !== JSON.stringify(resource ? editableResource(resource) : emptyResource)
  const back = resource?.isDemo ? '/app/manage/resources?view=demo' : '/app/manage/resources'

  useEffect(() => {
    setError(''); setSuccess('')
    if (!id) { setResource(null); setInput({ ...emptyResource }); setFeatures(''); setLoading(false); return }
    if (!administrator) return
    const controller = new AbortController()
    setLoading(true)
    setResource(null)
    void getResource(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setResource(result); setInput(editableResource(result)); setFeatures(result.features.join(', '))
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Resource could not be loaded.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [administrator, id, retry])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function field<Key extends keyof ResourceInput>(name: Key, value: ResourceInput[Key]) { setInput((current) => ({ ...current, [name]: value })); setSuccess('') }
  function reload() { if (!dirty || window.confirm('Discard unsaved detail changes and reload?')) setRetry((value) => value + 1) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const saved = await saveResource({ ...normalized, tourUrl: input.tourUrl?.trim() || null, instructions: input.instructions?.trim() || null }, resource)
      setResource(saved); setInput(editableResource(saved)); setFeatures(saved.features.join(', ')); setSuccess('Resource details saved.')
      if (!id) navigate(`/app/manage/resources/${saved.id}/edit`, { replace: true })
    } catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'Resource could not be saved.') }
    finally { setSaving(false) }
  }
  if (!administrator) return <section className="cr-page"><h1>Administrator access required</h1><Link className="cr-button" to="/app/resources">Browse resources</Link></section>
  if (loading) return <div className="cr-empty" role="status">Loading editor…</div>
  if (id && !resource) return <section className="cr-page"><div className="cr-alert cr-alert-error" role="alert">{error || 'Resource not found.'}</div><button className="cr-button" onClick={reload}>Try again</button><Link className="cr-button" to={back}>Back to resources</Link></section>

  return <section className="cr-page">
    <Link className="cr-back" to={back} onClick={(event) => { if (dirty && !window.confirm('Leave without saving detail changes?')) event.preventDefault() }}><ArrowLeft size={17} />Manage resources</Link>
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Administrator editor</p><h1>{resource ? 'Edit resource' : 'Add a resource'}</h1><p>Start with the details. Photos and a 360° link are optional.</p></div>{resource && <div className="cr-inline cr-wrap"><button className="cr-button" disabled={saving || photoBusy} onClick={reload}>Reload</button><Link className="cr-button" to={`/app/resources/${resource.id}`} onClick={(event) => { if (dirty && !window.confirm('View the saved resource without saving detail changes?')) event.preventDefault() }}>View saved resource</Link></div>}</header>
    {resource?.isDemo && <p className="cr-alert">Demo venue: edits stay in the administrator-only demo collection. Create a separate college resource for real use.</p>}
    {error && <p className="cr-alert cr-alert-error" role="alert">{error}</p>}
    {success && <p className="cr-alert cr-success" role="status">{success}</p>}
    <div className="cr-editor-grid"><form onSubmit={(event) => void submit(event)} className="cr-editor-form">
      <fieldset disabled={saving || photoBusy} className="cr-panel">
        <legend>Resource details</legend>
        <label className="cr-field" htmlFor="resource-name"><span>Name</span><input id="resource-name" required minLength={2} maxLength={150} value={input.name} onChange={(event) => field('name', event.target.value)} placeholder="Official venue or equipment name" /></label>
        <div className="cr-form-grid"><label className="cr-field" htmlFor="resource-type"><span>Type</span><select id="resource-type" value={input.type} onChange={(event) => {
          const type = event.target.value as ResourceType
          setInput((current) => ({ ...current, type, isExclusive: true, totalQuantity: 1, tourUrl: type === 'EQUIPMENT' ? null : current.tourUrl, capacity: type === 'EQUIPMENT' ? null : current.capacity }))
        }}><option value="HALL">Hall</option><option value="ROOM">Room</option><option value="LABORATORY">Lab</option><option value="EQUIPMENT">Equipment</option></select></label>
        <label className="cr-field" htmlFor="resource-status"><span>Status</span><select id="resource-status" value={input.status} onChange={(event) => field('status', event.target.value as ResourceStatus)}><option value="INACTIVE">Inactive — hidden from requesters</option><option value="ACTIVE">Active — visible to requesters</option><option value="ARCHIVED">Archived — retired resource</option></select></label></div>
        <p className="cr-help">Keep unverified resources inactive. Deactivation and archiving do not cancel existing reservations.</p>
        <div className="cr-form-grid"><label className="cr-field" htmlFor="resource-building"><span>Building</span><input id="resource-building" required maxLength={120} value={input.building} onChange={(event) => field('building', event.target.value)} /></label><label className="cr-field" htmlFor="resource-location"><span>Location / floor</span><input id="resource-location" required maxLength={180} value={input.location} onChange={(event) => field('location', event.target.value)} /></label></div>
        <NumberField name="resource-capacity" label={input.type === 'EQUIPMENT' ? 'People capacity (optional)' : 'People capacity'} value={input.capacity} min={1} max={100000} required={input.type !== 'EQUIPMENT'} onChange={(value) => field('capacity', value)} />
        {input.type === 'EQUIPMENT' && <div className="cr-equipment-options"><label className="cr-checkbox"><input type="checkbox" checked={input.isExclusive} onChange={(event) => setInput((current) => ({ ...current, isExclusive: event.target.checked, totalQuantity: event.target.checked ? 1 : current.totalQuantity }))} />Exclusive use (one booking at a time)</label>{!input.isExclusive && <NumberField name="resource-quantity" label="Total stock quantity" value={input.totalQuantity} min={1} max={10000} onChange={(value) => field('totalQuantity', value ?? 0)} />}</div>}
        <label className="cr-field" htmlFor="resource-description"><span>Description</span><textarea id="resource-description" required minLength={10} maxLength={5000} rows={4} value={input.description} onChange={(event) => field('description', event.target.value)} placeholder="What is this resource suitable for?" /></label>
        <label className="cr-field" htmlFor="resource-features"><span>Facilities / features (optional)</span><input id="resource-features" maxLength={1700} value={features} onChange={(event) => setFeatures(event.target.value)} placeholder="Projector, air conditioning, accessible entrance" /><small>Separate features with commas. Up to 20 features, 80 characters each.</small></label>
        <label className="cr-field" htmlFor="resource-instructions"><span>Usage instructions (optional)</span><textarea id="resource-instructions" maxLength={5000} rows={3} value={input.instructions ?? ''} onChange={(event) => field('instructions', event.target.value || null)} /></label>
        {input.type !== 'EQUIPMENT' && <label className="cr-field" htmlFor="resource-tour"><span>360° tour link (optional)</span><input id="resource-tour" type="url" maxLength={2048} value={input.tourUrl ?? ''} onChange={(event) => field('tourUrl', event.target.value || null)} placeholder="https://…" /><small>Paste a public HTTPS link approved by the college. It opens in a new tab; do not paste embed code.</small></label>}
      </fieldset>
      <fieldset disabled={saving || photoBusy} className="cr-panel"><legend>Booking rules</legend><p className="cr-help">These settings will be used by the booking workflow. Every request requires administrator approval.</p><div className="cr-form-grid">
        <NumberField name="advance-days" label="Advance booking window (days)" value={input.advanceBookingDays} min={1} max={365} onChange={(value) => field('advanceBookingDays', value ?? 0)} />
        <NumberField name="notice-hours" label="Minimum notice (hours)" value={input.minimumNoticeHours} min={0} max={8760} onChange={(value) => field('minimumNoticeHours', value ?? 0)} />
        <NumberField name="maximum-duration" label="Maximum duration (minutes)" value={input.maximumDurationMinutes} min={15} max={10080} onChange={(value) => field('maximumDurationMinutes', value ?? 0)} />
        <NumberField name="cancel-hours" label="Cancellation deadline (hours before)" value={input.cancellationDeadlineHours} min={0} max={8760} onChange={(value) => field('cancellationDeadlineHours', value ?? 0)} />
        <NumberField name="buffer-before" label="Buffer before (minutes)" value={input.bufferBeforeMinutes} min={0} max={1440} onChange={(value) => field('bufferBeforeMinutes', value ?? 0)} />
        <NumberField name="buffer-after" label="Buffer after (minutes)" value={input.bufferAfterMinutes} min={0} max={1440} onChange={(value) => field('bufferAfterMinutes', value ?? 0)} />
      </div><p className="cr-help">Type, stock, exclusivity and buffers cannot be changed while upcoming reservations hold this resource.</p></fieldset>
      <div className="cr-save-bar"><span>{dirty ? 'Unsaved detail changes' : resource ? 'Details saved' : 'Ready when you are'}</span><button type="submit" className="cr-button cr-button-primary" disabled={saving || photoBusy || (Boolean(resource) && !dirty)}><Save size={18} />{saving ? 'Saving…' : resource ? 'Save changes' : 'Create resource'}</button></div>
    </form><aside className="cr-editor-aside">{resource ? <PhotoManager key={resource.id} resource={resource} disabled={saving} onChange={setResource} onBusyChange={setPhotoBusy} onReload={reload} /> : <section className="cr-panel"><h2>Photos</h2><p>Create the resource first, then upload its photos here.</p><p className="cr-help">You can add up to eight photos and choose a cover. Photos can wait until the college provides them.</p></section>}</aside></div>
  </section>
}
