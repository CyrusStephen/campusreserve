import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../auth/api'

const roles = [
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'CANTEEN_STAFF', label: 'Canteen staff' },
  { value: 'SECURITY', label: 'Security' },
] as const

type ApprovedRole = typeof roles[number]['value']
type Account = { id: string; name: string; email: string; signupDepartment: string | null; emailVerifiedAt: string }
type Department = { id: string; name: string }
type RegistrationQueue = { accounts: Account[]; departments: Department[]; total: number; pageSize: number }
type Decision = { decision: 'APPROVE'; role: ApprovedRole; departmentId: string | null } | { decision: 'REJECT' }

function AccountReview({ account, departments, busy, review }: {
  account: Account
  departments: Department[]
  busy: boolean
  review: (id: string, decision: Decision) => Promise<void>
}) {
  const [role, setRole] = useState<ApprovedRole>('FACULTY')
  const [departmentId, setDepartmentId] = useState('')
  const headingId = `account-${account.id}`

  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void review(account.id, { decision: 'APPROVE', role, departmentId: departmentId || null })
  }

  return (
    <article className="cr-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{account.name}</h2>
      <p className="cr-meta break-all">{account.email}</p>
      {account.signupDepartment && <p className="cr-meta">Requested department or office: {account.signupDepartment}</p>}
      <form className="mt-4 space-y-3" onSubmit={approve}>
        <label className="cr-field">
          <span>Access role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as ApprovedRole)} disabled={busy}>
            {roles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="cr-field">
          <span>Link to a department</span>
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={busy}>
            <option value="">No linked department</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
        <div className="cr-inline cr-wrap">
          <button className="cr-button cr-button-primary" type="submit" disabled={busy}>Approve account</button>
          <button className="cr-button cr-danger" type="button" disabled={busy} onClick={() => {
            if (window.confirm(`Decline the account request from ${account.name}?`)) void review(account.id, { decision: 'REJECT' })
          }}>Decline</button>
        </div>
      </form>
    </article>
  )
}

export default function AccountApprovalsPage() {
  const [data, setData] = useState<RegistrationQueue | null>(null)
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void apiRequest<{ data: RegistrationQueue }>(`/auth/registrations?page=${page}`, { signal: controller.signal }).then(({ data: next }) => {
      if (controller.signal.aborted) return
      if (page > 1 && next.accounts.length === 0) setPage(Math.max(1, Math.ceil(next.total / next.pageSize)))
      setData(next)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load pending accounts.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [page, refresh])

  async function review(id: string, decision: Decision) {
    setReviewing(true)
    setMessage('')
    setError('')
    try {
      const result = await apiRequest<{ message: string }>(`/auth/registrations/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify(decision),
      })
      setData((current) => current && { ...current, accounts: current.accounts.filter((account) => account.id !== id), total: current.total - 1 })
      setMessage(result.message)
      setRefresh((value) => value + 1)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not review the account.')
    } finally {
      setReviewing(false)
    }
  }

  const busy = reviewing || loading
  return (
    <section className="cr-page">
      <header className="cr-page-heading">
        <div>
          <h1>Account approvals</h1>
          <p>Review registrations with verified college emails and assign access.</p>
        </div>
        <button className="cr-button" type="button" disabled={busy} onClick={() => { setError(''); setRefresh((value) => value + 1) }}>Refresh list</button>
      </header>
      {message && <p role="status" className="cr-success">{message}</p>}
      {error && <p role="alert" className="cr-alert cr-alert-error">{error}</p>}
      {loading && !data && <p className="cr-empty" role="status">Loading pending accounts…</p>}
      {data && !loading && data.accounts.length === 0 && <p className="cr-empty">No accounts are waiting for approval.</p>}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy={busy}>
          {data.accounts.map((account) => <AccountReview key={account.id} account={account} departments={data.departments} busy={busy} review={review} />)}
        </div>
      )}
      {data && (page > 1 || data.total > data.pageSize) && (
        <nav className="cr-pagination" aria-label="Account approval pages">
          <button className="cr-button" type="button" disabled={busy || page <= 1} onClick={() => { setError(''); setPage(page - 1) }}>Previous</button>
          <span>Page {page}</span>
          <button className="cr-button" type="button" disabled={busy || page * data.pageSize >= data.total} onClick={() => { setError(''); setPage(page + 1) }}>Next</button>
        </nav>
      )}
    </section>
  )
}
