import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  CalendarDays,
  ChevronDown,
  Coffee,
  Cookie,
  PackageCheck,
  ScanLine,
  TicketCheck,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import ProductIllustration from './ProductIllustration'
import ResourceCategoryIcon from './ResourceCategoryIcon'

type ProductView = 'products' | 'spaces' | 'canteen' | 'events'
type ModuleView = Exclude<ProductView, 'products'>

type ProductMegaMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DetailCard = {
  title: string
  description: string
  icon: ReactNode
  tone: 'blue' | 'yellow' | 'purple' | 'red'
}

const productCards: Array<{
  view: ModuleView
  title: string
  description: string
  status: string
  tone: 'blue' | 'yellow' | 'purple'
}> = [
  {
    view: 'spaces',
    title: 'Space Bookings',
    description: 'Reserve rooms, halls, laboratories and shared equipment.',
    status: 'Available now',
    tone: 'blue',
  },
  {
    view: 'canteen',
    title: 'Canteen Orders',
    description: 'Pre-order refreshments and meals for a convenient pickup time.',
    status: 'Building next',
    tone: 'yellow',
  },
  {
    view: 'events',
    title: 'Event Access',
    description: 'Registration, entry passes, seat details and smoother check-in.',
    status: 'Concept preview',
    tone: 'purple',
  },
]

function icon(Icon: LucideIcon) {
  return <Icon aria-hidden="true" />
}

const moduleDetails: Record<ModuleView, {
  eyebrow: string
  title: string
  description: string
  stage: string
  cards: DetailCard[]
}> = {
  spaces: {
    eyebrow: 'Space Bookings',
    title: 'Find the right campus resource',
    description: 'Browse availability and submit one clear request for approval.',
    stage: 'Live in CampusReserve',
    cards: [
      { title: 'Rooms', description: 'Classrooms, meeting rooms and collaborative spaces.', icon: <ResourceCategoryIcon type="room" />, tone: 'blue' },
      { title: 'Halls', description: 'Seminar halls, auditoriums and event venues.', icon: <ResourceCategoryIcon type="hall" />, tone: 'yellow' },
      { title: 'Laboratories', description: 'Specialised labs and practical workspaces.', icon: <ResourceCategoryIcon type="laboratory" />, tone: 'purple' },
      { title: 'Equipment', description: 'Projectors, audio systems and shared equipment.', icon: <ResourceCategoryIcon type="equipment" />, tone: 'red' },
    ],
  },
  canteen: {
    eyebrow: 'Canteen Orders',
    title: 'Refreshments without the queue',
    description: 'Choose what you need, set a pickup time and follow its preparation status.',
    stage: 'The next module',
    cards: [
      { title: 'Tea & Coffee', description: 'Schedule hot drinks for individuals or meetings.', icon: icon(Coffee), tone: 'blue' },
      { title: 'Snacks', description: 'Pre-order quick bites without waiting at the counter.', icon: icon(Cookie), tone: 'yellow' },
      { title: 'Meals', description: 'Choose available meals and a convenient pickup slot.', icon: icon(UtensilsCrossed), tone: 'purple' },
      { title: 'Group Orders', description: 'Arrange refreshments for departments and events.', icon: icon(PackageCheck), tone: 'red' },
    ],
  },
  events: {
    eyebrow: 'Event Access',
    title: 'Make campus entry effortless',
    description: 'Give every attendee a clear pass, entry number or assigned seat.',
    stage: 'Concept in development',
    cards: [
      { title: 'Upcoming Events', description: 'Discover open registrations across the campus.', icon: icon(CalendarDays), tone: 'blue' },
      { title: 'Event Passes', description: 'Register and keep entry details in one place.', icon: icon(TicketCheck), tone: 'yellow' },
      { title: 'Seat Details', description: 'See an assigned seat or entry number before arrival.', icon: icon(Armchair), tone: 'purple' },
      { title: 'Organizer Console', description: 'Verify entry and monitor attendance smoothly.', icon: icon(ScanLine), tone: 'red' },
    ],
  },
}

export default function ProductMegaMenu({ open, onOpenChange }: ProductMegaMenuProps) {
  const [view, setView] = useState<ProductView>('products')
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) {
        onOpenChange(false)
        setView('products')
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
        setView('products')
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onOpenChange, open])

  function toggleMenu() {
    if (!open) setView('products')
    onOpenChange(!open)
  }

  const details = view === 'products' ? null : moduleDetails[view]

  return (
    <div className="cr-product-mega" ref={menu}>
      <button
        aria-controls="cr-product-panel"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`cr-product-trigger${open ? ' cr-product-trigger-open' : ''}`}
        onClick={toggleMenu}
        type="button"
      >
        Product
        <ChevronDown aria-hidden="true" className="cr-product-trigger-chevron" size={17} />
      </button>

      {open && <section aria-label="CampusReserve products" className="cr-product-panel" id="cr-product-panel" role="dialog">
        <div className="cr-product-panel-content" key={view}>
          {view === 'products' ? <>
            <header className="cr-product-panel-heading">
              <div>
                <p className="cr-product-kicker">One campus. One platform.</p>
                <h2>Choose what you need</h2>
              </div>
              <p>Bookings, orders and access—all connected through CampusReserve.</p>
            </header>

            <div className="cr-product-card-grid">
              {productCards.map((product) => <button
                className={`cr-product-card cr-product-tone-${product.tone}`}
                key={product.view}
                onClick={() => setView(product.view)}
                type="button"
              >
                <span className="cr-product-card-status">{product.status}</span>
                <ProductIllustration className="cr-product-card-art" type={product.view} />
                <span className="cr-product-card-copy">
                  <strong>{product.title}</strong>
                  <span>{product.description}</span>
                </span>
                <ArrowRight aria-hidden="true" className="cr-product-card-arrow" size={20} />
              </button>)}
            </div>
          </> : details && <>
            <header className="cr-product-module-heading">
              <button className="cr-product-back" onClick={() => setView('products')} type="button">
                <ArrowLeft aria-hidden="true" size={17} />
                All products
              </button>
              <div className="cr-product-module-title">
                <div>
                  <p className="cr-product-kicker">{details.eyebrow}</p>
                  <h2>{details.title}</h2>
                  <p>{details.description}</p>
                </div>
                <span className="cr-product-module-stage">{details.stage}</span>
              </div>
            </header>

            <div className="cr-product-detail-grid">
              {details.cards.map((card) => <article className={`cr-product-detail-card cr-product-tone-${card.tone}`} key={card.title}>
                <span className="cr-product-detail-icon">{card.icon}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>)}
            </div>

            <footer className="cr-product-module-footer">
              <Link className="cr-product-workspace-link" onClick={() => onOpenChange(false)} to={`/login?service=${view}`}>
                {view === 'spaces' ? 'Open Space Bookings' : view === 'canteen' ? 'Open Canteen Orders' : 'Open Event Access'}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </footer>
          </>}
        </div>
      </section>}
    </div>
  )
}
