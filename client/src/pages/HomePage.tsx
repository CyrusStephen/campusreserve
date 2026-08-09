import {
  CalendarCheck,
  DoorOpen,
  FlaskConical,
  Presentation,
  Projector,
} from 'lucide-react'
import { Link } from 'react-router'

const resourceTypes = [
  {
    name: 'Rooms',
    description: 'Classrooms, meeting rooms and collaborative spaces',
    icon: DoorOpen,
    color: 'bg-blue-200',
  },
  {
    name: 'Halls',
    description: 'Seminar halls, auditoriums and event venues',
    icon: Presentation,
    color: 'bg-yellow-200',
  },
  {
    name: 'Laboratories',
    description: 'Specialised labs and practical workspaces',
    icon: FlaskConical,
    color: 'bg-purple-200',
  },
  {
    name: 'Equipment',
    description: 'Projectors, audio systems and shared equipment',
    icon: Projector,
    color: 'bg-red-200',
  },
]

function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f6f3] px-5 py-8 text-[#191919] md:px-10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-bold">
          <span className="grid size-10 place-items-center rounded-xl border-2 border-black bg-yellow-300">
            <CalendarCheck size={21} strokeWidth={2.4} />
          </span>

          <span>CampusReserve</span>
        </Link>

        <Link
          to="/login"
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
        >
          Sign in
        </Link>
      </nav>

      <section className="mx-auto max-w-6xl py-20 md:py-28">
        <div className="max-w-4xl">
          <span className="inline-flex rounded-full border-2 border-black bg-yellow-300 px-4 py-2 font-semibold">
            Made for our campus
          </span>

          <h1 className="mt-8 text-5xl font-bold tracking-[-0.04em] md:text-7xl">
            Reserve what your campus needs,{' '}
            <span className="inline-block rounded-full border-2 border-black bg-purple-300 px-4">
              without the chase.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-700">
            Find the right room, hall, laboratory or equipment and submit one
            clear request for approval.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Start a reservation
            </Link>

            <a
              href="#resources"
              className="rounded-xl border-2 border-black px-6 py-3 font-semibold transition hover:bg-white"
            >
              Explore resources
            </a>
          </div>
        </div>
      </section>

      <section
        id="resources"
        className="mx-auto grid max-w-6xl gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4"
      >
        {resourceTypes.map(({ name, description, icon: Icon, color }) => (
          <article
            key={name}
            className={`${color} rounded-2xl border-2 border-black p-5`}
          >
            <Icon size={28} strokeWidth={2.2} />

            <h2 className="mt-10 text-xl font-bold">{name}</h2>

            <p className="mt-2 text-sm leading-6 text-neutral-700">
              {description}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default HomePage