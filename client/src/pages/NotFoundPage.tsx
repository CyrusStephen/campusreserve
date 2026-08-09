import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 text-center text-[#191919]">
      <section>
        <p className="text-7xl font-bold">404</p>
        <h1 className="mt-4 text-3xl font-bold">This room doesn’t exist.</h1>
        <p className="mt-3 text-neutral-600">
          The page may have moved or never received approval.
        </p>

        <Link
          to="/"
          className="mt-7 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
        >
          Return home
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage