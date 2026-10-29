import { Camera, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { apiRequest } from '../auth/api'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../auth/types'
import './profile.css'

type Profile = { id: string; name: string; email: string; role: UserRole; status: string; departmentId: string | null; phone: string | null; bio: string | null; avatarData: string | null }
type ProfileResponse = { status: 'ok'; data: { profile: Profile } }

async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000) throw new Error('Choose a JPEG, PNG or WebP photo under 5 MB.')
  const image = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This device could not prepare the photo.')
    const side = Math.min(image.width, image.height)
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 256, 256)
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256)
    const result = canvas.toDataURL('image/jpeg', 0.76)
    if (result.length > 200_000) throw new Error('Please choose a smaller photo.')
    return result
  } finally { image.close() }
}

export default function ProfilePage() {
  const auth = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [avatarData, setAvatarData] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    void apiRequest<ProfileResponse>('/auth/profile', { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return
      setProfile(data.profile); setName(data.profile.name); setPhone(data.profile.phone ?? '')
      setBio(data.profile.bio ?? ''); setAvatarData(data.profile.avatarData); setError('')
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Profile could not be loaded.') })
    return () => controller.abort()
  }, [reload])

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setNotice('')
    try { setAvatarData(await preparePhoto(file)) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Photo could not be prepared.') }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const result = await apiRequest<ProfileResponse>('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null, bio: bio.trim() || null, avatarData }) })
      setProfile(result.data.profile)
      auth.updateDisplayName(result.data.profile.name)
      setNotice('Your profile has been saved.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Profile could not be saved.') }
    finally { setSaving(false) }
  }

  return <section className="cr-page cr-profile-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Your account</p><h1>My profile</h1><p>Keep your personal details and photo up to date.</p></div></header>
    {error && <div className="cr-alert cr-alert-error" role="alert">{error}{!profile && <button className="cr-button" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>}</div>}
    {notice && <p className="cr-alert cr-success" role="status">{notice}</p>}
    {!profile ? !error && <p role="status">Loading your profile…</p> : <form className="cr-panel" onSubmit={(event) => void save(event)}>
      <div className="cr-profile-intro"><div className="cr-profile-avatar">{avatarData ? <img src={avatarData} alt="Your profile" /> : <UserRound size={42} aria-hidden="true" />}</div><div><strong>{profile.name}</strong><span>{profile.role.replaceAll('_', ' ')}</span><div className="cr-profile-photo-actions"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectPhoto(event)} aria-label="Choose profile photo" hidden /><button type="button" className="cr-button" onClick={() => input.current?.click()}><Camera size={17} />Choose photo</button>{avatarData && <button type="button" className="cr-button cr-button-quiet" onClick={() => setAvatarData(null)}><X size={17} />Remove</button>}</div><small>Square crop, up to 5 MB. Press Save profile to keep changes.</small></div></div>
      <div className="cr-form-grid"><label className="cr-field">Full name<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="cr-field">Phone number<input type="tel" maxLength={30} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></label></div>
      <label className="cr-field">About me<textarea rows={3} maxLength={280} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="A short introduction (optional)" /><small>{bio.length}/280 characters</small></label>
      <div className="cr-profile-readonly"><div><span>Email</span><strong>{profile.email}</strong></div><div><span>Assigned role</span><strong>{profile.role.replaceAll('_', ' ')}</strong></div></div>
      <p className="cr-help">Your role and sign-in email are managed by the college administrator.</p>
      <button className="cr-button cr-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>}
  </section>
}
