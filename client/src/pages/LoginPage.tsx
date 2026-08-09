import { ArrowLeft, CalendarCheck } from 'lucide-react'
import { Link } from 'react-router'
import ThemeToggle from '../components/ThemeToggle'

function LoginPage() {
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
            <CalendarCheck size={24} />
          </span>

          <h1 className="mt-6 text-3xl font-bold">Welcome back</h1>

          <p className="mt-2 text-neutral-600 dark:text-neutral-300">
            Sign in using your authorised college account.
          </p>

          <form className="mt-7 space-y-5">
            <label className="block">
              <span className="font-semibold">College email</span>

              <input
                type="email"
                placeholder="name@college.edu"
                className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200 dark:border-white dark:bg-neutral-950 dark:focus:ring-blue-900"
              />
            </label>

            <label className="block">
              <span className="font-semibold">Password</span>

              <input
                type="password"
                placeholder="Enter your password"
                className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200 dark:border-white dark:bg-neutral-950 dark:focus:ring-blue-900"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage