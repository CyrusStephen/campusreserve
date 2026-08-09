import { Link } from 'react-router'
import ThemeToggle from '../components/ThemeToggle'

function NotFoundPage() {
  return (
    <main className="relative grid min-h-screen place-items-center bg-[#f7f6f3] px-5 text-center text-[#191919] transition-colors dark:bg-[#191919] dark:text-[#f7f6f3]">
      <div className="absolute right-5 top-5 md:right-10 md:top-8">
        <ThemeToggle />
      </div>

      <section>
        <p className="text-7xl font-bold">404</p>

        <h1 className="mt-4 text-3xl font-bold">
          This room doesn’t exist.
        </h1>

        <p className="mt-3 text-neutral-600 dark:text-neutral-300">
          The page may have moved or never received approval.
        </p>

        <Link
          to="/"
          className="mt-7 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Return home
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage