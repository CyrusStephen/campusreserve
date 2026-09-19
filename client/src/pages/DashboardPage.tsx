import { ArrowUpRight, BarChart3, Bell, CalendarCheck, CalendarClock, CalendarRange, ClipboardList, LayoutGrid, ListPlus, Settings2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getDashboard } from '../bookings/api'
import type { DashboardData } from '../bookings/types'

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="cr-stat"><span>{icon}</span><strong>{value}</strong><p>{label}</p></div>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const administrator = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    void getDashboard(controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Dashboard totals could not be loaded.')
    })
    return () => controller.abort()
  }, [retry])

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Overview</p><h1>Welcome, {user?.name.split(' ')[0]}.</h1><p>Your live CampusReserve workspace.</p></div></header>
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload totals</button></div>}
    {!data && !error && <div className="cr-stats-grid" aria-label="Loading dashboard statistics">{Array.from({ length: 4 }, (_, index) => <div className="cr-stat cr-stat-loading" key={index}>Loading…</div>)}</div>}
    {data && <div className="cr-stats-grid">
      <Stat label="Active resources" value={data.activeResources} icon={<LayoutGrid size={19} />} />
      <Stat label="My pending requests" value={data.myPendingRequests} icon={<ClipboardList size={19} />} />
      <Stat label="My upcoming dates" value={data.myUpcomingDates} icon={<CalendarClock size={19} />} />
      <Stat label="Unread notifications" value={data.unreadNotifications} icon={<Bell size={19} />} />
      {data.administration && <Stat label="Pending approvals" value={data.administration.pendingApprovals} icon={<CalendarCheck size={19} />} />}
      {data.administration && <Stat label="Upcoming approved dates" value={data.administration.upcomingApprovedDates} icon={<CalendarRange size={19} />} />}
    </div>}
    <div className="cr-dashboard-grid cr-dashboard-grid-compact">
      <Link to="/app/resources" className="cr-launch-card"><LayoutGrid size={27} /><h2>Explore your campus</h2><p>Browse halls, rooms, labs and equipment, then check availability.</p><span>Browse resources <ArrowUpRight size={18} /></span></Link>
      <Link to="/app/bookings" className="cr-launch-card cr-launch-card-bookings"><ClipboardList size={27} /><h2>Track your requests</h2><p>See every date, reschedule one occurrence or cancel what you no longer need.</p><span>My bookings <ArrowUpRight size={18} /></span></Link>
      <Link to="/app/waitlist" className="cr-launch-card cr-launch-card-alt"><ListPlus size={27} /><h2>Manage waitlists</h2><p>Join occupied slots and act quickly when a queued time becomes available.</p><span>My waitlist <ArrowUpRight size={18} /></span></Link>
      {administrator && <Link to="/app/manage/calendar" className="cr-launch-card cr-launch-card-calendar"><CalendarRange size={27} /><h2>Campus at a glance</h2><p>Review the master schedule across all resources, closures and booking states.</p><span>Master calendar <ArrowUpRight size={18} /></span></Link>}
      {administrator && <Link to="/app/manage/bookings" className="cr-launch-card cr-launch-card-bookings"><CalendarCheck size={27} /><h2>Review requests</h2><p>Approve whole requests or decide individual dates from one queue.</p><span>Approval queue <ArrowUpRight size={18} /></span></Link>}
      {administrator && <Link to="/app/manage/resources" className="cr-launch-card cr-launch-card-alt"><Settings2 size={27} /><h2>Manage campus spaces</h2><p>Add resources, photos, 360° links and campus blocks.</p><span>Manage resources <ArrowUpRight size={18} /></span></Link>}
      {administrator && <Link to="/app/manage/reports" className="cr-launch-card"><BarChart3 size={27} /><h2>Reports & exports</h2><p>Download filtered booking records for institutional reporting and archival.</p><span>Open reports <ArrowUpRight size={18} /></span></Link>}
    </div>
    {data?.administration && <section className="cr-panel cr-recent-decisions"><div className="cr-section-head"><div><p className="cr-eyebrow">Audit snapshot</p><h2>Recent decisions</h2></div><Link className="cr-button cr-button-small" to="/app/manage/bookings/history">Full history</Link></div>{data.administration.recentDecisions.length === 0 ? <p className="cr-muted">No approval decisions have been recorded yet.</p> : <div>{data.administration.recentDecisions.map((decision) => <p key={decision.id}><span className={`cr-status cr-status-${decision.decision.toLowerCase()}`}>{decision.decision.toLowerCase()}</span><strong>{decision.referenceCode}</strong><span>{decision.title}</span><small>{decision.administrator?.name ?? 'Former administrator'} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(decision.decidedAt))}</small></p>)}</div>}</section>}
  </section>
}
