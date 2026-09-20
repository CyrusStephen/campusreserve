import { Bell, CalendarCheck, Check, Coffee, MapPin, Play, ShieldCheck } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import BrandLogo from '../components/BrandLogo'
import BrandWordmark from '../components/BrandWordmark'
import HomepageNavigation from '../components/HomepageNavigation'
import AppFooter from '../components/AppFooter'
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
  const productVideoUrl = import.meta.env.VITE_PRODUCT_VIDEO_URL as string | undefined

  return (
    <main className="cr-home min-h-screen bg-[#f7f6f3] px-5 pt-8 text-[#191919] transition-colors dark:bg-[#191919] dark:text-[#f7f6f3] md:px-10">
      <nav className="cr-home-nav mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="cr-home-brand flex items-center gap-3 font-bold">
          <BrandWordmark />
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

      <section className="cr-home-hero mx-auto max-w-6xl py-20 md:py-28">
        <div aria-hidden="true" className="cr-home-glow cr-home-glow-blue" />
        <div aria-hidden="true" className="cr-home-glow cr-home-glow-yellow" />

        <div aria-hidden="true" className="cr-home-float cr-home-float-booking">
          <span className="cr-home-float-icon cr-home-float-icon-blue"><CalendarCheck size={18} /></span>
          <span><small>Space booking</small><strong>Seminar Hall approved</strong></span>
          <Check size={16} />
        </div>
        <div aria-hidden="true" className="cr-home-float cr-home-float-canteen">
          <span className="cr-home-float-icon cr-home-float-icon-yellow"><Coffee size={18} /></span>
          <span><small>Canteen update</small><strong>Your order is ready</strong></span>
        </div>
        <div aria-hidden="true" className="cr-home-float cr-home-float-security">
          <span className="cr-home-float-icon cr-home-float-icon-purple"><ShieldCheck size={18} /></span>
          <span><small>Security desk</small><strong>Booking verified</strong></span>
        </div>
        <div aria-hidden="true" className="cr-home-float cr-home-float-reminder">
          <Bell size={16} />
          <span><small>Up next</small><strong>Lab 2 · 2:30 PM</strong></span>
        </div>

        <div className="cr-home-hero-copy max-w-4xl">
          <span className="cr-home-badge inline-flex rounded-full border-2 border-black bg-yellow-300 px-4 py-2 font-semibold">
            Made for your campus
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

      <section className="cr-home-preview-section mx-auto max-w-6xl" aria-labelledby="cr-preview-title">
        <div className="cr-home-preview-copy">
          <span className="cr-home-preview-kicker">Everything stays visible</span>
          <h2 id="cr-preview-title">From request to confirmation, all in one flow.</h2>
          <p>Follow approvals, timings and booking details without chasing messages across campus.</p>
        </div>
        <div className="cr-home-app-preview" aria-label="CampusReserve workspace preview">
          <div className="cr-home-preview-sidebar">
            <BrandLogo className="cr-home-preview-logo" decorative />
            <i className="cr-home-preview-line cr-home-preview-line-active" />
            <i className="cr-home-preview-line" />
            <i className="cr-home-preview-line" />
            <i className="cr-home-preview-line cr-home-preview-line-short" />
          </div>
          <div className="cr-home-preview-workspace">
            <header><span>Space Bookings</span><span className="cr-home-preview-avatar">CS</span></header>
            <div className="cr-home-preview-heading"><span><small>Good evening, Dr. Cyrus</small><strong>Your campus, clearly organised.</strong></span><button type="button" tabIndex={-1}>New booking</button></div>
            <div className="cr-home-preview-stats">
              <article><small>Upcoming</small><strong>03</strong></article>
              <article><small>Awaiting approval</small><strong>01</strong></article>
              <article><small>Completed</small><strong>12</strong></article>
            </div>
            <div className="cr-home-preview-booking">
              <span className="cr-home-preview-date"><strong>24</strong><small>SEP</small></span>
              <span><small>Upcoming reservation</small><strong>Archbishop Kavukattu Hall</strong><em><MapPin size={12} /> Main Block · 10:00 AM</em></span>
              <span className="cr-home-preview-status">Approved</span>
            </div>
          </div>
        </div>
      </section>
      <section className="cr-home-video-section mx-auto max-w-6xl" id="cr-video-section" aria-labelledby="cr-video-title">
        <div className="cr-home-preview-copy">
          <span className="cr-home-preview-kicker">See CampusReserve in action</span>
          <h2 id="cr-video-title">One clear flow for the whole campus.</h2>
          <p>Use this space for the CampusReserve product film, walkthrough or latest campus announcement.</p>
        </div>
        <div className="cr-home-video-frame">
          {productVideoUrl ? <video controls preload="metadata" playsInline aria-label="CampusReserve product video"><source src={productVideoUrl} /></video> : <div className="cr-home-video-placeholder" role="img" aria-label="CampusReserve product video preview">
            <div className="cr-home-video-scene"><BrandWordmark className="cr-home-video-brand" tone="light" decorative /><strong>Everything your campus needs,<br />in one calm flow.</strong><span>Product film coming soon</span></div>
            <span className="cr-home-video-play" aria-hidden="true"><Play size={30} fill="currentColor" /></span>
          </div>}
        </div>
      </section>
      <AppFooter />
    </main>
  )
}

export default HomePage
