import { ArrowRight, CalendarDays, QrCode, ScanLine, TicketCheck } from 'lucide-react'

export default function EventAccessPage() {
  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Event Access</p><h1>Every campus event, one smooth entry.</h1><p>This independent workspace will hold registrations, passes, seat details and check-in.</p></div></header>
    <div className="cr-dashboard-grid cr-dashboard-grid-compact">
      <article className="cr-launch-card"><CalendarDays size={27} /><h2>Upcoming events</h2><p>Discover registrations opened by departments and campus teams.</p><span>Event catalogue coming next <ArrowRight size={18} /></span></article>
      <article className="cr-launch-card cr-launch-card-bookings"><TicketCheck size={27} /><h2>My passes</h2><p>Keep registration confirmation, entry number and seat details together.</p><span>Digital passes coming next <ArrowRight size={18} /></span></article>
      <article className="cr-launch-card cr-launch-card-alt"><QrCode size={27} /><h2>Fast entry</h2><p>Present one secure code at the venue instead of searching through messages.</p><span>QR entry coming next <ArrowRight size={18} /></span></article>
      <article className="cr-launch-card cr-launch-card-calendar"><ScanLine size={27} /><h2>Organizer check-in</h2><p>Verify passes and follow attendance from a dedicated organizer console.</p><span>Organizer tools coming next <ArrowRight size={18} /></span></article>
    </div>
    <div className="cr-panel"><p className="cr-eyebrow">Separate by design</p><h2>Event Access is ready for its own module.</h2><p className="cr-muted">It no longer opens the Space Bookings dashboard. Registration and check-in functionality can now be developed here without mixing booking or canteen workflows.</p></div>
  </section>
}
