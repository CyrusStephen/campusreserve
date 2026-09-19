import { ArrowLeft, CalendarCheck, ShieldCheck, TicketCheck, UtensilsCrossed } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import ThemeToggle from '../components/ThemeToggle'

function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const service = new URLSearchParams(location.search).get('service')
  const serviceDestination = service === 'canteen' ? '/app/canteen' : service === 'events' ? '/app/events' : service === 'security' ? '/app/security' : '/app'
  const serviceLabel = service === 'canteen' ? 'Canteen Orders' : service === 'events' ? 'Event Access' : service === 'security' ? 'Security Desk' : 'Space Bookings'

  const requestedPath = (location.state as { from?: unknown } | null)?.from
  const requestedDestination =
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//')
      ? requestedPath
      : serviceDestination

  // A stale admin URL must never become the landing page for a faculty/staff
  // account (for example after switching accounts in the same browser tab).
  const administrator = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN'
  const destination =
    !administrator && requestedDestination.startsWith('/app/manage/')
      ? '/app'
      : requestedDestination

  if (auth.status === 'authenticated') {
    if (auth.user?.role === 'CANTEEN_STAFF' && service !== 'canteen') {
      return <Navigate to={`/access-denied?service=${service === 'events' ? 'events' : 'spaces'}`} replace />
    }
    if (auth.user?.role === 'CANTEEN_STAFF' && service === 'canteen') {
      return <Navigate to="/app/canteen/manage" replace />
    }
    if (auth.user?.role === 'SECURITY' && service !== 'security') return <Navigate to={`/access-denied?service=${service ?? 'spaces'}`} replace />
    if (auth.user?.role === 'SECURITY') return <Navigate to="/app/security" replace />
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const loggedInUser = await auth.login(email, password)
      if (loggedInUser.role === 'SECURITY') navigate(service === 'security' ? '/app/security' : `/access-denied?service=${service ?? 'spaces'}`, { replace: true })
      else if (loggedInUser.role === 'CANTEEN_STAFF') navigate(service === 'canteen' ? '/app/canteen/manage' : `/access-denied?service=${service ?? 'spaces'}`, { replace: true })
      else navigate(destination, { replace: true })
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Sign in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 py-12 text-[#191919] transition-colors dark:bg-[#191919] dark:text-[#f7f6f3]">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold"
          >
            <ArrowLeft size={18} />
            Back home
          </Link>

          <ThemeToggle />
        </div>

        <div className="rounded-3xl border-2 border-black bg-white p-7 shadow-[7px_7px_0_#191919] transition-colors dark:border-white dark:bg-neutral-900 dark:shadow-[7px_7px_0_#f7f6f3]">
          <span className="grid size-12 place-items-center rounded-xl border-2 border-black bg-yellow-300 text-[#191919]">
            {service === 'canteen' ? <UtensilsCrossed size={24} /> : service === 'events' ? <TicketCheck size={24} /> : service === 'security' ? <ShieldCheck size={24} /> : <CalendarCheck size={24} />}
          </span>

          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">{serviceLabel}</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome back</h1>

          <p className="mt-2 text-neutral-600 dark:text-neutral-300">
            Sign in using your authorised college account.
          </p>

          {(formError ?? auth.error) && (
            <p
              role="alert"
              className="mt-6 rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-100"
            >
              {formError ?? auth.error}
            </p>
          )}

          <form className="mt-7 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block">
              <span className="font-semibold">Email</span>

              <input
                autoComplete="username"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.edu"
                className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200 dark:border-white dark:bg-neutral-950 dark:focus:ring-blue-900"
              />
            </label>

            <label className="block">
              <span className="font-semibold">Password</span>

              <input
                autoComplete="current-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200 dark:border-white dark:bg-neutral-950 dark:focus:ring-blue-900"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || auth.status === 'checking'}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
