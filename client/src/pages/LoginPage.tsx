import { ArrowLeft, CalendarCheck } from 'lucide-react'
import { Link } from 'react-router'

function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 text-[#191919]">
      <section className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 font-semibold"
        >
          <ArrowLeft size={18} />
          Back home
        </Link>

        <div className="rounded-3xl border-2 border-black bg-white p-7 shadow-[7px_7px_0_#191919]">
          <span className="grid size-12 place-items-center rounded-xl border-2 border-black bg-yellow-300">
            <CalendarCheck size={24} />
          </span>

          <h1 className="mt-6 text-3xl font-bold">Welcome back</h1>

          <p className="mt-2 text-neutral-600">
            Sign in using your authorised college account.
          </p>

          <form className="mt-7 space-y-5">
            <label className="block">
              <span className="font-semibold">College email</span>

              <input
                type="email"
                placeholder="name@college.edu"
                className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="font-semibold">Password</span>

              <input
                type="password"
                placeholder="Enter your password"
                className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-blue-200"
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