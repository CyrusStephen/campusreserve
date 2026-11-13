import { ArrowUpRight, BarChart3, Bell, CalendarCheck, CalendarClock, CalendarRange, ClipboardList, LayoutGrid, ListPlus, Settings2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getDashboard } from '../bookings/api'
import type { DashboardData } from '../bookings/types'

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="cr-stat"><span>{icon}</span><strong>{value}</strong><p>{label}</p></div>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const now = useOutletContext<Date>()
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(now))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
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
    <header className="cr-page-heading cr-overview-intro">
      <div><p className="cr-eyebrow">{greeting}, {user?.name.split(' ')[0]}.</p><h1>{administrator ? 'What needs your attention today?' : 'What would you like to reserve today?'}</h1></div>
    </header>
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
      <Link to="/app/resources" className="cr-launch-card"><div className="cr-launch-visual"><img src="/campus/kavukattu_hall.jpg" alt="Kavukattu Hall at St Berchmans College" loading="lazy" /></div><LayoutGrid size={27} /><h2>Explore your campus</h2><p>Browse halls, rooms, labs and equipment, then check availability.</p><span>Browse resources <ArrowUpRight size={18} /></span></Link>
      <Link to="/app/bookings" className="cr-launch-card cr-launch-card-bookings"><div className="cr-launch-visual"><img src="/overview/requests.webp" alt="" loading="lazy" /><small>Illustrative</small></div><ClipboardList size={27} /><h2>Track your requests</h2><p>See every date, reschedule one occurrence or cancel what you no longer need.</p><span>My bookings <ArrowUpRight size={18} /></span></Link>
      <Link to="/app/waitlist" className="cr-launch-card cr-launch-card-alt"><div className="cr-launch-visual"><img src="/overview/waitlist.webp" alt="" loading="lazy" /><small>Illustrative</small></div><ListPlus size={27} /><h2>Manage waitlists</h2><p>Join occupied slots and act quickly when a queued time becomes available.</p><span>My waitlist <ArrowUpRight size={18} /></span></Link>
      {administrator && <Link to="/app/manage/calendar" className="cr-launch-card cr-launch-card-calendar"><div className="cr-launch-visual"><img src="/overview/calendar.webp" alt="" loading="lazy" /><small>Illustrative</small></div><CalendarRange size={27} /><h2>Campus at a glance</h2><p>Review the master schedule across all resources, closures and booking states.</p><span>Master calendar <ArrowUpRight size={18} /></span></Link>}
      {administrator && <Link to="/app/manage/bookings" className="cr-launch-card cr-launch-card-bookings"><div className="cr-launch-visual"><img src="/overview/approvals.webp" alt="" loading="lazy" /><small>Illustrative</small></div><CalendarCheck size={27} /><h2>Review requests</h2><p>Approve whole requests or decide individual dates from one queue.</p><span>Approval queue <ArrowUpRight size={18} /></span></Link>}
      {administrator && <Link to="/app/manage/resources" className="cr-launch-card cr-launch-card-alt"><div className="cr-launch-visual"><img src="/overview/manage.webp" alt="" loading="lazy" /><small>Illustrative</small></div><Settings2 size={27} /><h2>Manage campus spaces</h2><p>Add resources, photos, 360° links and campus blocks.</p><span>Manage resources <ArrowUpRight size={18} /></span></Link>}
      {administrator && <Link to="/app/manage/reports" className="cr-launch-card"><div className="cr-launch-visual"><img src="/overview/reports.webp" alt="" loading="lazy" /><small>Illustrative</small></div><BarChart3 size={27} /><h2>Reports & exports</h2><p>Download filtered booking records for institutional reporting and archival.</p><span>Open reports <ArrowUpRight size={18} /></span></Link>}
    </div>
  </section>
}
