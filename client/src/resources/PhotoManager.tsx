import { Star, Trash2, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { preparePhoto, removePhoto, updatePhoto, uploadPhoto } from './api'
import ResourcePhoto from './ResourcePhoto'
import type { Resource, ResourceImage } from './types'

function PhotoEditor({ photo, cover, disabled, save, remove }: {
  photo: ResourceImage; cover: boolean; disabled: boolean
  save: (caption: string, makeCover: boolean) => void; remove: () => void
}) {
  const [caption, setCaption] = useState(photo.altText)
  function submit(event: FormEvent) { event.preventDefault(); save(caption.trim(), false) }
  return <article className="cr-photo-editor"><ResourcePhoto photo={photo} /><form onSubmit={submit}><label className="cr-field" htmlFor={`caption-${photo.id}`}><span>{cover ? 'Cover photo description' : 'Photo description'}</span><input id={`caption-${photo.id}`} value={caption} maxLength={255} required disabled={disabled} onChange={(event) => setCaption(event.target.value)} /></label><div className="cr-inline cr-wrap"><button className="cr-button cr-button-small" disabled={disabled || caption.trim() === photo.altText} type="submit">Save description</button><button className="cr-button cr-button-small" type="button" disabled={disabled || cover || !caption.trim()} onClick={() => save(caption.trim(), true)}><Star size={14} />{cover ? 'Cover' : 'Set cover'}</button><button className="cr-button cr-button-small cr-danger" type="button" disabled={disabled} onClick={remove}><Trash2 size={14} />Remove</button></div></form></article>
}

export default function PhotoManager({ resource, disabled, onChange, onBusyChange, onReload }: {
  resource: Resource; disabled: boolean; onChange: (value: Resource) => void
  onBusyChange: (busy: boolean) => void; onReload: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [caption, setCaption] = useState(`${resource.name} photo`)
  async function run(operation: () => Promise<Resource>, success: string) {
    setBusy(true); onBusyChange(true); setError(''); setMessage('')
    try { onChange(await operation()); setMessage(success) }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'The photo could not be saved.') }
    finally { setBusy(false); onBusyChange(false) }
  }
  const locked = busy || disabled
  return <section className="cr-panel" aria-busy={busy}>
    <h2>Photos <span className="cr-muted">{resource.images.length}/8</span></h2>
    <p className="cr-help">Choose JPEG, PNG or WebP files up to 20 MB. Photos are resized and converted to JPEG before upload. The first photo is the cover.</p>
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button cr-button-small" type="button" disabled={locked} onClick={onReload}>Reload resource</button></div>}
    {message && <p role="status" className="cr-success">{message}</p>}
    <fieldset className="cr-upload" disabled={locked || resource.images.length >= 8}>
      <label className="cr-field" htmlFor="new-photo-caption"><span>Describe the next photo</span><input id="new-photo-caption" value={caption} maxLength={255} onChange={(event) => setCaption(event.target.value)} placeholder="e.g. Hall entrance and seating" /></label>
      <label className="cr-field" htmlFor="new-photo"><span className="cr-inline"><Upload size={16} />{busy ? 'Working on your photos…' : 'Choose a photo'}</span><input id="new-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={locked || !caption.trim() || resource.images.length >= 8} onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void run(async () => uploadPhoto(resource, await preparePhoto(file), caption.trim()), 'Photo uploaded.')
      }} /></label>
    </fieldset>
    <div className="cr-photo-editors">{resource.images.map((photo, index) => <PhotoEditor key={photo.id} photo={photo} cover={index === 0} disabled={locked} save={(altText, cover) => { void run(() => updatePhoto(resource, photo.id, altText, cover), 'Photo updated.') }} remove={() => {
      if (window.confirm('Remove this photo from the resource?')) void run(() => removePhoto(resource, photo.id), 'Photo removed from the resource.')
    }} />)}</div>
  </section>
}
