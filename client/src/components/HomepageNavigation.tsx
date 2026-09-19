import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  LifeBuoy,
  Mail,
  Menu,
  Send,
  Server,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import ProductMegaMenu from './ProductMegaMenu'

type MenuName = 'how' | 'support' | null
type HealthState = 'checking' | 'online' | 'offline'

type InfoMenuProps = {
  label: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  panelClassName?: string
}

function InfoMenu({ label, open, onToggle, children, panelClassName = '' }: InfoMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onToggle()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle()
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onToggle, open])

  const panelId = `cr-${label.toLowerCase().replaceAll(' ', '-')}-panel`

  return <div className="cr-nav-menu" ref={menuRef}>
    <button
      aria-controls={panelId}
      aria-expanded={open}
      className={`cr-product-trigger${open ? ' cr-product-trigger-open' : ''}`}
      onClick={onToggle}
      type="button"
    >
      {label}
      <ChevronDown aria-hidden="true" className="cr-product-trigger-chevron" size={17} />
    </button>
    {open && <section className={`cr-nav-info-panel ${panelClassName}`} id={panelId}>
      {children}
    </section>}
  </div>
}

const howSteps = [
  { icon: CircleHelp, title: 'Choose a service', copy: 'Pick space booking, canteen ordering or event access.' },
  { icon: Send, title: 'Send one clear request', copy: 'Add the details once and send it to the right team.' },
  { icon: CheckCircle2, title: 'Follow every update', copy: 'See approvals, decisions and progress in one place.' },
]

function HowItWorksContent() {
  return <div className="cr-how-content">
    <header className="cr-nav-panel-heading">
      <p className="cr-product-kicker">Simple from start to finish</p>
      <h2>Three steps. No chasing.</h2>
    </header>
    <ol className="cr-how-steps">
      {howSteps.map((step, index) => {
        const Icon = step.icon
        return <li key={step.title}>
          <span className="cr-how-step-number">{index + 1}</span>
          <span className="cr-how-step-icon"><Icon aria-hidden="true" size={22} /></span>
          <span className="cr-how-step-copy"><strong>{step.title}</strong><span>{step.copy}</span></span>
        </li>
      })}
    </ol>
  </div>
}

function useApiHealth(enabled: boolean) {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
    const apiBaseUrl = configuredApiUrl ?? (import.meta.env.DEV ? 'http://localhost:5000' : '')

    setHealth('checking')
    fetch(`${apiBaseUrl}/api/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Health check failed')
        setHealth('online')
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setHealth('offline')
      })

    return () => controller.abort()
  }, [enabled])

  return health
}

type SupportItemProps = {
  icon: LucideIcon
  title: string
  copy: string
  href: string
}

function SupportItem({ icon: Icon, title, copy, href }: SupportItemProps) {
  return <a className="cr-support-item" href={href}>
    <span className="cr-support-icon"><Icon aria-hidden="true" size={21} /></span>
    <span><strong>{title}</strong><small>{copy}</small></span>
    <ArrowRight aria-hidden="true" size={17} />
  </a>
}

function SupportContent({ active }: { active: boolean }) {
  const health = useApiHealth(active)

  return <div className="cr-support-content">
    <header className="cr-nav-panel-heading">
      <p className="cr-product-kicker">We are here to help</p>
      <h2>CampusReserve support</h2>
    </header>
    <div className="cr-support-list">
      <SupportItem icon={LifeBuoy} title="Booking help" copy="Get help with a reservation" href="mailto:support@campusreserve.app?subject=Booking%20help" />
      <SupportItem icon={Mail} title="Contact support" copy="Talk to the support team" href="mailto:support@campusreserve.app" />
      <SupportItem icon={TriangleAlert} title="Report a problem" copy="Tell us what went wrong" href="mailto:support@campusreserve.app?subject=Problem%20report" />
    </div>
    <div aria-live="polite" className={`cr-health-status cr-health-${health}`}>
      <span className="cr-health-dot" />
      <Server aria-hidden="true" size={18} />
      <span><strong>API status</strong><small>{health === 'checking' ? 'Checking /api/health…' : health === 'online' ? 'All systems operational' : 'API currently unreachable'}</small></span>
    </div>
  </div>
}

function DesktopNavigation({ closeProduct }: { closeProduct: () => void }) {
  const [activeMenu, setActiveMenu] = useState<MenuName>(null)

  const toggleInfo = (menu: Exclude<MenuName, null>) => {
    closeProduct()
    setActiveMenu((current) => current === menu ? null : menu)
  }

  return <div className="cr-home-nav-desktop">
    <InfoMenu label="How it works" open={activeMenu === 'how'} onToggle={() => toggleInfo('how')}>
      <HowItWorksContent />
    </InfoMenu>
    <InfoMenu label="Support" open={activeMenu === 'support'} onToggle={() => toggleInfo('support')} panelClassName="cr-support-panel">
      <SupportContent active={activeMenu === 'support'} />
    </InfoMenu>
  </div>
}

function MobileNavigation({ openProduct }: { openProduct: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [view, setView] = useState<'more' | 'how' | 'support'>('more')
  const menuRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setMoreOpen(false)
    setView('more')
  }

  useEffect(() => {
    if (!moreOpen) return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [moreOpen])

  return <div className="cr-home-nav-mobile" ref={menuRef}>
    <button
      aria-controls="cr-mobile-more-panel"
      aria-expanded={moreOpen}
      className={`cr-product-trigger${moreOpen ? ' cr-product-trigger-open' : ''}`}
      onClick={() => moreOpen ? close() : setMoreOpen(true)}
      type="button"
    >
      {moreOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
      More
    </button>
    {moreOpen && <section className="cr-mobile-more-panel" id="cr-mobile-more-panel">
      {view === 'more' ? <div className="cr-mobile-menu-list">
        <button onClick={() => { close(); openProduct() }} type="button"><strong>Product</strong><span>Bookings, orders and access</span><ArrowRight size={17} /></button>
        <button onClick={() => setView('how')} type="button"><strong>How it works</strong><span>See the three simple steps</span><ArrowRight size={17} /></button>
        <button onClick={() => setView('support')} type="button"><strong>Support</strong><span>Help, contact and live status</span><ArrowRight size={17} /></button>
      </div> : <>
        <button className="cr-mobile-back" onClick={() => setView('more')} type="button">← More</button>
        {view === 'how' ? <HowItWorksContent /> : <SupportContent active={view === 'support'} />}
      </>}
    </section>}
  </div>
}

export default function HomepageNavigation({ productOpen, onProductOpenChange }: { productOpen: boolean; onProductOpenChange: (open: boolean) => void }) {
  return <div className="cr-home-nav-centre">
    <div className="cr-home-product"><ProductMegaMenu open={productOpen} onOpenChange={onProductOpenChange} /></div>
    <DesktopNavigation closeProduct={() => onProductOpenChange(false)} />
    <MobileNavigation openProduct={() => onProductOpenChange(true)} />
  </div>
}
