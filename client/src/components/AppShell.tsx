import { Activity, ArrowLeft, Bell, CalendarCheck, CalendarDays, CalendarRange, ClipboardList, Coffee, History, ListPlus, BarChart3, LayoutDashboard, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings2, ShieldCheck, TicketCheck, UtensilsCrossed, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getDashboard } from '../bookings/api'
import type { DashboardData } from '../bookings/types'
import { listNotifications, notificationChangedEvent } from '../notifications/api'
import ThemeToggle from './ThemeToggle'
import AppFooter from './AppFooter'
import '../resources/resources.css'
import { interfaceSoundsEnabled, playInterfaceSound, setInterfaceSoundsEnabled } from '../utils/interface-sounds'

type ProductArea = 'spaces' | 'canteen' | 'events' | 'security'
function productArea(pathname: string, search: string): ProductArea {
  if (pathname.startsWith('/app/security')) return 'security'
  if (pathname.startsWith('/app/canteen') || search.includes('service=canteen')) return 'canteen'
  if (pathname.startsWith('/app/events') || search.includes('service=events')) return 'events'
  return 'spaces'
}

export default function AppShell() {
  const auth = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false); const [error, setError] = useState(''); const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(() => window.localStorage.getItem('campusreserve:sidebar-pinned') === 'true')
  const [activityOpen, setActivityOpen] = useState(false)
  const [administration, setAdministration] = useState<DashboardData['administration']>(null)
  const [now, setNow] = useState(() => new Date())
  const [soundsEnabled, setSoundsEnabled] = useState(interfaceSoundsEnabled)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const administrator = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN'; const canteenStaff = auth.user?.role === 'CANTEEN_STAFF' || administrator
  const area = productArea(location.pathname, location.search)
  const meta = area === 'spaces' ? { label: 'Space Bookings', icon: <CalendarDays size={23} />, home: '/app' } : area === 'canteen' ? { label: 'Canteen Orders', icon: <UtensilsCrossed size={23} />, home: canteenStaff && auth.user?.role === 'CANTEEN_STAFF' ? '/app/canteen/manage' : '/app/canteen' } : area === 'security' ? { label: 'Security Desk', icon: <ShieldCheck size={23} />, home: '/app/security' } : { label: 'Event Access', icon: <TicketCheck size={23} />, home: '/app/events' }
  useEffect(() => {
    let active = true; const refresh = () => { void listNotifications().then((result) => { if (active) setUnreadCount(result.unreadCount) }).catch(() => undefined) }
    refresh(); window.addEventListener(notificationChangedEvent, refresh); return () => { active = false; window.removeEventListener(notificationChangedEvent, refresh) }
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!administrator) return
    const controller = new AbortController()
    void getDashboard(controller.signal).then((result) => setAdministration(result.administration)).catch(() => undefined)
    return () => controller.abort()
  }, [administrator, location.pathname])
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (activityOpen) setActivityOpen(false)
      else if (!sidebarPinned) setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activityOpen, sidebarPinned])
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])
  function openSidebar() { if (closeTimer.current) clearTimeout(closeTimer.current); setSidebarOpen(true) }
  function scheduleSidebarClose() {
    if (sidebarPinned) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setSidebarOpen(false), 2500)
  }
  function togglePin() {
    const next = !sidebarPinned
    setSidebarPinned(next); setSidebarOpen(next)
    window.localStorage.setItem('campusreserve:sidebar-pinned', String(next))
  }
  async function logout() { setLoggingOut(true); setError(''); try { await auth.logout(); navigate(`/login?service=${area}`, { replace: true }) } catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign out failed.') } finally { setLoggingOut(false) } }
  const notificationPath = area === 'spaces' ? '/app/notifications' : `/app/${area}/notifications`
  if (auth.user?.role === 'CANTEEN_STAFF' && area !== 'canteen') return <Navigate to={`/access-denied?service=${area}`} replace />
  if (auth.user?.role === 'CANTEEN_STAFF' && location.pathname === '/app/canteen') return <Navigate to="/app/canteen/manage" replace />
  if (!administrator && location.pathname.startsWith('/app/manage/')) return <Navigate to="/access-denied?service=admin" replace />
  if (auth.user?.role === 'SECURITY' && area !== 'security') return <Navigate to={`/access-denied?service=${area}`} replace />
  if (auth.user?.role !== 'SECURITY' && area === 'security' && !administrator) return <Navigate to="/access-denied?service=security" replace />
  const istHour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(now))
  const greeting = istHour < 12 ? 'Good morning' : istHour < 17 ? 'Good afternoon' : 'Good evening'
  const istDateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(now)
  return <div className={`cr-app cr-app-${area}${sidebarPinned ? ' cr-sidebar-pinned' : ''}${sidebarOpen ? ' cr-sidebar-open' : ''}`}><a className="cr-skip" href="#workspace">Skip to content</a>
    <div className="cr-sidebar-edge" onPointerEnter={openSidebar} aria-hidden="true" />
    <button className="cr-sidebar-handle" type="button" aria-label="Open navigation" onClick={openSidebar}><PanelLeftOpen size={18} /></button>
    {(sidebarOpen && !sidebarPinned) && <button className="cr-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className="cr-sidebar" aria-label="Primary navigation" onPointerEnter={openSidebar} onPointerLeave={scheduleSidebarClose} onFocus={openSidebar} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) scheduleSidebarClose() }}>
    <button className="cr-sidebar-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
    <NavLink className="cr-brand" to={meta.home}><span>{meta.icon}</span>CampusReserve</NavLink><p className="cr-eyebrow">{meta.label}</p><Link className="cr-product-return" to="/"><ArrowLeft size={15} />All products</Link>
    <nav className="cr-navigation" aria-label={`${meta.label} workspace`} onClick={(event) => { if ((event.target as HTMLElement).closest('a')) setSidebarOpen(false) }}>
      {area === 'spaces' && <><NavLink end to="/app"><LayoutDashboard size={19} />Overview</NavLink><NavLink to="/app/resources"><LayoutGrid size={19} />Browse resources</NavLink><NavLink to="/app/bookings"><ClipboardList size={19} />My bookings</NavLink><NavLink to="/app/waitlist"><ListPlus size={19} />My waitlist</NavLink>{administrator && <NavLink end to="/app/manage/bookings"><CalendarCheck size={19} />Approvals</NavLink>}{administrator && <NavLink to="/app/manage/calendar"><CalendarRange size={19} />Master calendar</NavLink>}{administrator && <NavLink to="/app/manage/bookings/history"><History size={19} />History</NavLink>}{administrator && <NavLink to="/app/manage/reports"><BarChart3 size={19} />Reports</NavLink>}{administrator && <NavLink to="/app/manage/resources"><Settings2 size={19} />Manage resources</NavLink>}</>}
      {area === 'canteen' && <>{auth.user?.role !== 'CANTEEN_STAFF' && <NavLink end to="/app/canteen"><Coffee size={19} />Order from canteen</NavLink>}{canteenStaff && <NavLink to="/app/canteen/manage"><Settings2 size={19} />Canteen console</NavLink>}</>}
      {area === 'events' && <NavLink end to="/app/events"><TicketCheck size={19} />Event access</NavLink>}
      {area === 'security' && <NavLink end to="/app/security"><ShieldCheck size={19} />Verify booking</NavLink>}
    </nav>
    <div className="cr-sidebar-foot"><button className="cr-sidebar-pin cr-button cr-button-quiet" type="button" onClick={togglePin}>{sidebarPinned ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}{sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}</button><button className="cr-button cr-button-quiet" type="button" aria-pressed={soundsEnabled} onClick={() => { const next = !soundsEnabled; setSoundsEnabled(next); setInterfaceSoundsEnabled(next); if (next) playInterfaceSound('success') }}>{soundsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}Interface sounds {soundsEnabled ? 'on' : 'off'}</button><div className="cr-account"><strong>{auth.user?.name}</strong><span>{auth.user?.role.replaceAll('_', ' ')}</span></div><div className="cr-inline"><ThemeToggle /><button className="cr-button cr-button-quiet" type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut size={17} />{loggingOut ? 'Signing out…' : 'Sign out'}</button></div>{error && <p className="cr-alert cr-alert-error" role="alert">{error}</p>}</div>
  </aside><div className="cr-main-column"><header className="cr-utility-bar" aria-label="Account utilities"><button className="cr-mobile-menu" type="button" aria-label="Open navigation" onClick={openSidebar}><Menu size={21} /></button><div className="cr-utility-welcome"><strong>{greeting}, {auth.user?.name.split(' ')[0]}.</strong><time dateTime={now.toISOString()}>{istDateTime} IST</time></div><span className="cr-utility-product">{meta.label}</span>{administrator && area === 'spaces' && <button className="cr-notification-button" type="button" aria-label="Open recent activity" aria-expanded={activityOpen} onClick={() => setActivityOpen(true)}><Activity size={20} /></button>}{area !== 'security' && <NavLink className="cr-notification-button" to={notificationPath} aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}><Bell size={21} />{unreadCount > 0 && <span className="cr-nav-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}</NavLink>}</header><main className="cr-workspace" id="workspace"><Outlet /></main><AppFooter compact /></div>
    {activityOpen && <><button className="cr-drawer-backdrop" type="button" aria-label="Close recent activity" onClick={() => setActivityOpen(false)} /><aside className="cr-activity-drawer" aria-label="Recent booking decisions"><header><div><p className="cr-eyebrow">Audit activity</p><h2>Recent decisions</h2></div><button className="cr-icon-button" type="button" aria-label="Close recent activity" onClick={() => setActivityOpen(false)}><X size={20} /></button></header><div className="cr-activity-feed">{!administration ? <p className="cr-muted">Loading activity…</p> : administration.recentDecisions.length === 0 ? <p className="cr-muted">No approval decisions have been recorded yet.</p> : administration.recentDecisions.map((decision) => <Link key={decision.id} to={`/app/manage/bookings/history?booking=${encodeURIComponent(decision.referenceCode)}`} onClick={() => setActivityOpen(false)}><span className={`cr-status cr-status-${decision.decision.toLowerCase()}`}>{decision.decision.toLowerCase()}</span><strong>{decision.title}</strong><small>{decision.referenceCode}</small><time>{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(decision.decidedAt))} · {decision.administrator?.name ?? 'Former administrator'}</time></Link>)}</div><Link className="cr-button cr-button-primary" to="/app/manage/bookings/history" onClick={() => setActivityOpen(false)}>View full history</Link></aside></>}
  </div>
}
