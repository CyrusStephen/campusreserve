import { ArrowLeft, ArrowRight, MapPin, Plus, Search, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { listResources, type ResourceList } from '../resources/api'
import ResourcePhoto from '../resources/ResourcePhoto'
import { resourceLabels, type ResourceScope, type ResourceType } from '../resources/types'

export default function ResourcesPage({ manage = false }: { manage?: boolean }) {
  const { user } = useAuth()
  const administrator = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const type = params.get('type') ?? ''
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.get('page') ?? '1', 10) || 1))
  const scope: ResourceScope = manage ? params.get('view') === 'demo' ? 'demo' : 'manage' : 'catalogue'
  const [draft, setDraft] = useState(query)
  const [data, setData] = useState<ResourceList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => { setDraft(query) }, [query])
  useEffect(() => {
    if (manage && !administrator) return
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    void listResources(scope, query, type, page, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result) }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Resources could not be loaded.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [administrator, manage, page, query, retry, scope, type])

  function changeFilter(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }
  function search(event: FormEvent) { event.preventDefault(); changeFilter('q', draft.trim()) }
  if (manage && !administrator) return <section className="cr-page"><h1>Administrator access required</h1><Link className="cr-button" to="/app/resources">Browse resources</Link></section>

  return (
    <section className="cr-page">
      <header className="cr-page-heading"><div><p className="cr-eyebrow">{manage ? 'Administration' : 'Campus catalogue'}</p><h1>{manage ? 'Manage resources' : 'Find your space.'}</h1><p>{manage ? 'Keep every venue’s details, photos and policies in one place.' : 'Halls, rooms, labs and equipment, all in one place.'}</p></div>{manage && <Link className="cr-button cr-button-primary" to="/app/manage/resources/new"><Plus size={18} />Add resource</Link>}</header>
      {manage && <div className="cr-tabs" aria-label="Resource collection"><button type="button" aria-pressed={scope === 'manage'} onClick={() => changeFilter('view', '')}>College resources</button><button type="button" aria-pressed={scope === 'demo'} onClick={() => changeFilter('view', 'demo')}>Demo venues</button></div>}
      {scope === 'demo' && <p className="cr-alert">Development examples only. These entries are hidden from faculty and staff, regardless of their status. Add separate real resources once the college details are confirmed.</p>}
      <div className="cr-toolbar"><form onSubmit={search} className="cr-search"><label className="cr-sr-only" htmlFor="resource-search">Search resources</label><Search size={19} aria-hidden="true" /><input id="resource-search" placeholder="Search by name or location" value={draft} maxLength={100} onChange={(event) => setDraft(event.target.value)} /><button className="cr-button cr-button-quiet" type="submit">Search</button></form><label className="cr-filter"><span className="cr-sr-only">Resource type</span><select value={type} onChange={(event) => changeFilter('type', event.target.value)}><option value="">All types</option><option value="HALL">Halls</option><option value="ROOM">Rooms</option><option value="LABORATORY">Labs</option><option value="EQUIPMENT">Equipment</option></select></label></div>
      {loading && <div className="cr-empty" role="status">Loading resources…</div>}
      {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button type="button" className="cr-button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {!loading && !error && data && <>
        <p className="cr-result-count" aria-live="polite">{data.total} {data.total === 1 ? 'resource' : 'resources'}{type && ` · ${resourceLabels[type as ResourceType] ?? type}`}</p>
        {data.resources.length === 0 ? <div className="cr-empty"><h2>{query || type ? 'No matches just yet.' : scope === 'demo' ? 'No demo venues yet.' : 'The catalogue is getting ready.'}</h2><p>{scope === 'demo' ? 'Run the optional demo setup command included with this update.' : query || type ? 'Try another search or resource type.' : manage ? 'Add your first resource using the button above. Keep unverified entries inactive.' : 'Active college resources will appear here after an administrator adds them.'}</p>{(query || type || page > 1) && <button className="cr-button" type="button" onClick={() => setParams(scope === 'demo' ? { view: 'demo' } : {})}>Clear filters</button>}</div> : <div className="cr-resource-grid">{data.resources.map((resource) => <article className="cr-resource-card" key={resource.id}>
          <Link to={`/app/resources/${resource.id}`} aria-label={`View ${resource.name}`}><ResourcePhoto photo={resource.images[0]} /></Link>
          <div className="cr-card-content"><div className="cr-inline cr-wrap"><span className="cr-tag">{resourceLabels[resource.type]}</span>{manage && <span className={`cr-tag cr-status-${resource.status.toLowerCase()}`}>{resource.status.toLowerCase()}</span>}{resource.isDemo && <span className="cr-tag cr-tag-demo">Demo</span>}</div><h2><Link to={`/app/resources/${resource.id}`}>{resource.name}</Link></h2><p className="cr-meta"><MapPin size={16} />{resource.building} · {resource.location}</p><p className="cr-meta"><Users size={16} />{resource.type === 'EQUIPMENT' ? `${resource.totalQuantity} ${resource.totalQuantity === 1 ? 'unit' : 'units'} · ${resource.isExclusive ? 'exclusive' : 'shared stock'}` : `Up to ${resource.capacity ?? '—'} people`}</p><div className="cr-card-actions"><Link to={`/app/resources/${resource.id}`}>View details <ArrowRight size={16} /></Link>{manage && <Link to={`/app/manage/resources/${resource.id}/edit`}>Edit</Link>}</div></div>
        </article>)}</div>}
        {data.total > data.pageSize && <nav className="cr-pagination" aria-label="Resource pages"><button className="cr-button" disabled={page === 1} onClick={() => changeFilter('page', String(page - 1))}><ArrowLeft size={16} />Previous</button><span>Page {page} of {Math.ceil(data.total / data.pageSize)}</span><button className="cr-button" disabled={page * data.pageSize >= data.total} onClick={() => changeFilter('page', String(page + 1))}>Next<ArrowRight size={16} /></button></nav>}
      </>}
    </section>
  )
}
