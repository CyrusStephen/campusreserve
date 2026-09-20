import { LifeBuoy, Mail, Server, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { useApiHealth } from '../system/useApiHealth'
import BrandWordmark from './BrandWordmark'
import './app-footer.css'

type AppFooterProps = {
  compact?: boolean
}

const supportEmail = 'support@campusreserve.app'

function HealthStatus({ compact = false }: AppFooterProps) {
  const health = useApiHealth()
  const label = health === 'checking'
    ? 'Checking system status…'
    : health === 'online'
      ? 'All systems operational'
      : 'Service currently unreachable'

  return <span aria-live="polite" className={`cr-footer-health cr-footer-health-${health}`}>
    <span aria-hidden="true" className="cr-footer-health-dot" />
    {!compact && <Server aria-hidden="true" size={17} />}
    {label}
  </span>
}

export default function AppFooter({ compact = false }: AppFooterProps) {
  const year = new Date().getFullYear()

  if (compact) {
    return <footer className="cr-footer cr-footer-compact">
      <span>© {year} CampusReserve</span>
      <nav aria-label="Footer">
        <Link to="/">All products</Link>
        <a href={`mailto:${supportEmail}`}>Support</a>
        <HealthStatus compact />
      </nav>
    </footer>
  }

  return <footer className="cr-footer cr-footer-public">
    <div className="cr-footer-glass">
      <section className="cr-footer-intro" aria-labelledby="cr-footer-title">
        <Link className="cr-footer-brand" to="/">
          <BrandWordmark className="cr-footer-wordmark" tone="light" />
          <strong className="cr-sr-only" id="cr-footer-title">CampusReserve</strong>
        </Link>
        <p>One clear place to reserve spaces, order from the canteen and manage campus access.</p>
        <HealthStatus />
      </section>

      <nav className="cr-footer-links" aria-label="Product links">
        <strong>Product</strong>
        <Link to="/login?service=spaces">Space bookings</Link>
        <Link to="/login?service=canteen">Canteen ordering</Link>
        <Link to="/login?service=events">Event access</Link>
      </nav>

      <nav className="cr-footer-links" aria-label="Workspace links">
        <strong>Workspace</strong>
        <Link to="/login?service=spaces">Make a booking</Link>
        <Link to="/login?service=canteen">Order refreshments</Link>
        <Link to="/login?service=security">Verify a booking</Link>
      </nav>

      <nav className="cr-footer-links" aria-label="Support links">
        <strong>Support</strong>
        <a href={`mailto:${supportEmail}?subject=Booking%20help`}><LifeBuoy aria-hidden="true" size={15} />Booking help</a>
        <a href={`mailto:${supportEmail}`}><Mail aria-hidden="true" size={15} />Contact support</a>
        <a href={`mailto:${supportEmail}?subject=Problem%20report`}><TriangleAlert aria-hidden="true" size={15} />Report a problem</a>
      </nav>
    </div>

    <div className="cr-footer-bottom">
      <span>© {year} CampusReserve</span>
      <span>Designed thoughtfully for campus life.</span>
    </div>
  </footer>
}
