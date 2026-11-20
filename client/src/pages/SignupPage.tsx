import { ArrowLeft, MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent, type PropsWithChildren } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { requestSignup, verifySignup } from '../auth/api'
import ThemeToggle from '../components/ThemeToggle'

const fieldClass = 'mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200 dark:border-white dark:bg-neutral-950 dark:focus:ring-blue-900'
const buttonClass = 'w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60'
const linkClass = 'font-semibold text-blue-700 underline underline-offset-4 dark:text-blue-300'

function AccountPage({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 py-12 text-[#191919] transition-colors dark:bg-[#191919] dark:text-[#f7f6f3]">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold"><ArrowLeft size={18} />Back home</Link>
          <ThemeToggle />
        </div>
        <div className="rounded-3xl border-2 border-black bg-white p-7 shadow-[7px_7px_0_#191919] dark:border-white dark:bg-neutral-900 dark:shadow-[7px_7px_0_#f7f6f3]">
          <span className="grid size-12 place-items-center rounded-xl border-2 border-black bg-yellow-300 text-[#191919]"><MailCheck size={24} aria-hidden="true" /></span>
          <h1 className="mt-5 text-3xl font-bold">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  )
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-5 rounded-xl border border-red-700 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">{message}</p> : null
}

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const waiting = seconds > 0

  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000)
    return () => window.clearInterval(timer)
  }, [waiting])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = email.trim().toLowerCase()
    setError('')
    if (!address.endsWith('@sbcollege.ac.in')) {
      setError('Use your official @sbcollege.ac.in email address.')
      return
    }

    setSubmitting(true)
    try {
      await requestSignup(address)
      setSentTo(address)
      setSeconds(60)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not request a verification email.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AccountPage title={sentTo ? 'Check your inbox' : 'Create your account'}>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">{sentTo
        ? <>If <strong className="break-all">{sentTo}</strong> can register, a verification email will arrive shortly. Open the link to set your password.</>
        : 'Use your St Berchmans College email. You can choose your password after verifying your address.'}</p>
      <FormError message={error} />

      <form className="mt-6 space-y-4" onSubmit={(event) => void send(event)}>
        {sentTo ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">The link is valid for 30 minutes. Check your spam folder if the email takes a while.</p>
        ) : (
          <label className="block">
            <span className="font-semibold">Official college email</span>
            <input className={fieldClass} type="email" autoComplete="email" placeholder="name@sbcollege.ac.in" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
          </label>
        )}
        <button className={buttonClass} type="submit" disabled={submitting || waiting}>
          {submitting ? 'Requesting email…' : waiting ? `Resend available in ${seconds}s` : sentTo ? 'Resend verification email' : 'Send verification email'}
        </button>
        {sentTo && <button className={linkClass} type="button" disabled={submitting} onClick={() => { setSentTo(''); setSeconds(0); setError('') }}>Use a different address</button>}
      </form>

      <p className="mt-5 text-sm">Already have an account? <Link className={linkClass} to="/login">Sign in</Link></p>
    </AccountPage>
  )
}

export function VerifyEmailPage() {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(hash.slice(1)).get('token')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    if (password !== confirmation) {
      setError('The two passwords must match.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await verifySignup({ token, name, department, password })
      navigate('/login', { replace: true, state: { registrationComplete: true } })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Verification could not be completed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AccountPage title="Finish creating your account">
      {token ? <>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">Enter your details and set a password. An administrator will review your registration after you submit it.</p>
        <FormError message={error} />
        <form className="mt-6 space-y-4" onSubmit={(event) => void complete(event)}>
          <label className="block">
            <span className="font-semibold">Full name</span>
            <input className={fieldClass} autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} />
          </label>
          <label className="block">
            <span className="font-semibold">Department or office</span>
            <input className={fieldClass} required minLength={2} maxLength={120} value={department} onChange={(event) => setDepartment(event.target.value)} disabled={submitting} />
          </label>
          <label className="block">
            <span className="font-semibold">Password</span>
            <input className={fieldClass} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} aria-describedby="password-help" />
          </label>
          <p id="password-help" className="text-sm text-neutral-600 dark:text-neutral-300">Use at least 12 characters.</p>
          <label className="block">
            <span className="font-semibold">Confirm password</span>
            <input className={fieldClass} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={submitting} />
          </label>
          <button className={buttonClass} type="submit" disabled={submitting}>{submitting ? 'Verifying email…' : 'Verify and create account'}</button>
        </form>
      </> : <FormError message="This verification link is incomplete. Open the link from your email or request a new one." />}
      <p className="mt-5 text-sm"><Link className={linkClass} to="/signup">Request a new verification email</Link></p>
    </AccountPage>
  )
}
