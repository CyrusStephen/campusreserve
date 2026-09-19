import { CalendarCheck } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import HomepageNavigation from '../components/HomepageNavigation'
import ThemeToggle from '../components/ThemeToggle'
import '../home.css'

const heroPhrases = [
  'without the chase.',
  'without clashes.',
  'without the hassle.',
]

function RotatingPhrase() {
  const [phraseState, setPhraseState] = useState<{ current: number; previous: number | null }>({
    current: 0,
    previous: null,
  })
  const [phraseWidth, setPhraseWidth] = useState<number | null>(null)
  const phraseSizer = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhraseState(({ current }) => ({
        current: (current + 1) % heroPhrases.length,
        previous: current,
      }))
    }, 1_800)

    return () => window.clearInterval(interval)
  }, [])

  useLayoutEffect(() => {
    const sizer = phraseSizer.current
    if (!sizer) return

    const measure = () => setPhraseWidth(Math.ceil(sizer.getBoundingClientRect().width))
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(sizer)
    return () => observer.disconnect()
  }, [phraseState.current])

  const renderCharacters = (phrase: string, state: 'incoming' | 'outgoing') => (
    <span className={`cr-home-phrase-layer cr-home-phrase-layer-${state}`}>
      {Array.from(phrase).map((character, index) => (
        <span
          className="cr-home-phrase-char"
          key={`${phrase}-${index}`}
          style={{ '--cr-character-order': phrase.length - index - 1 } as CSSProperties}
        >
          {character === ' ' ? '\u00a0' : character}
        </span>
      ))}
    </span>
  )

  return (
    <span
      className="cr-home-phrase"
      aria-hidden="true"
      style={phraseWidth === null ? undefined : { '--cr-phrase-width': `${phraseWidth}px` } as CSSProperties}
    >
      <span className="cr-home-phrase-sizer" ref={phraseSizer}>{heroPhrases[phraseState.current]}</span>
      {phraseState.previous !== null && renderCharacters(heroPhrases[phraseState.previous], 'outgoing')}
      {renderCharacters(heroPhrases[phraseState.current], 'incoming')}
    </span>
  )
}

function HomePage() {
  const [productsOpen, setProductsOpen] = useState(false)

  return (
    <main className="cr-home min-h-screen bg-[#f7f6f3] px-5 py-8 text-[#191919] transition-colors dark:bg-[#191919] dark:text-[#f7f6f3] md:px-10">
      <nav className="cr-home-nav mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="cr-home-brand flex items-center gap-3 font-bold">
          <span className="cr-home-brand-mark grid size-10 place-items-center rounded-xl border-2 border-black bg-yellow-300">
            <CalendarCheck size={21} strokeWidth={2.4} />
          </span>

          <span className="cr-home-brand-name">CampusReserve</span>
        </Link>

        <HomepageNavigation productOpen={productsOpen} onProductOpenChange={setProductsOpen} />

        <div className="cr-home-nav-actions flex items-center gap-3">
  <ThemeToggle />

  <Link
    to="/login"
    className="cr-home-button cr-home-button-primary rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white"
  >
    Sign in
  </Link>
</div>
      </nav>

      <section className="mx-auto max-w-6xl py-20 md:py-28">
        <div className="max-w-4xl">
          <span className="cr-home-badge inline-flex rounded-full border-2 border-black bg-yellow-300 px-4 py-2 font-semibold">
            Made for our campus
          </span>

          <h1 className="cr-home-title mt-8 text-5xl font-bold leading-[1.08] tracking-[-0.04em] md:text-7xl">
            Reserve what your campus needs,{' '}
            <span className="sr-only">without the chase.</span>
            <RotatingPhrase />
          </h1>

          <p className="cr-home-copy mt-7 max-w-2xl text-lg leading-8 text-neutral-700 dark:text-neutral-300">
            Find the right room, hall, laboratory or equipment and submit one
            clear request for approval.
          </p>

          <div className="cr-home-actions mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="cr-home-button cr-home-button-primary rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white"
            >
              Start a reservation
            </Link>

            <button
              type="button"
              onClick={() => setProductsOpen(true)}
              className="cr-home-button cr-home-button-secondary rounded-lg border-2 border-black px-6 py-3 font-semibold dark:border-white"
            >
              Explore products
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default HomePage
