import { ArrowLeft, Bell, CalendarCheck, CalendarDays, CalendarRange, ClipboardList, Coffee, History, ListPlus, BarChart3, LayoutDashboard, LayoutGrid, LogOut, Settings2, TicketCheck, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { listNotifications, notificationChangedEvent } from '../notifications/api'
import ThemeToggle from './ThemeToggle'
import '../resources/resources.css'

type ProductArea = 'spaces' | 'canteen' | 'events'
function productArea(pathname: string, search: string): ProductArea {
  if (pathname.startsWith('/app/canteen') || search.includes('service=canteen')) return 'canteen'
  if (pathname.startsWith('/app/events') || search.includes('service=events')) return 'events'
  return 'spaces'
}

export default function AppShell() {
  const auth = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false); const [error, setError] = useState(''); const [unreadCount, setUnreadCount] = useState(0)
  const administrator = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN'; const canteenStaff = auth.user?.role === 'CANTEEN_STAFF' || administrator
  const area = productArea(location.pathname, location.search)
  const meta = area === 'spaces' ? { label: 'Space Bookings', icon: <CalendarDays size={23} />, home: '/app' } : area === 'canteen' ? { label: 'Canteen Orders', icon: <UtensilsCrossed size={23} />, home: canteenStaff && auth.user?.role === 'CANTEEN_STAFF' ? '/app/canteen/manage' : '/app/canteen' } : { label: 'Event Access', icon: <TicketCheck size={23} />, home: '/app/events' }
  useEffect(() => {
    let active = true; const refresh = () => { void listNotifications().then((result) => { if (active) setUnreadCount(result.unreadCount) }).catch(() => undefined) }
    refresh(); window.addEventListener(notificationChangedEvent, refresh); return () => { active = false; window.removeEventListener(notificationChangedEvent, refresh) }
  }, [])
  async function logout() { setLoggingOut(true); setError(''); try { await auth.logout(); navigate(`/login?service=${area}`, { replace: true }) } catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign out failed.') } finally { setLoggingOut(false) } }
  const notificationPath = area === 'spaces' ? '/app/notifications' : `/app/${area}/notifications`
  if (auth.user?.role === 'CANTEEN_STAFF' && area !== 'canteen') return <Navigate to={`/access-denied?service=${area}`} replace />
  if (auth.user?.role === 'CANTEEN_STAFF' && location.pathname === '/app/canteen') return <Navigate to="/app/canteen/manage" replace />
  if (!administrator && location.pathname.startsWith('/app/manage/')) return <Navigate to="/access-denied?service=admin" replace />
  return <div className={`cr-app cr-app-${area}`}><a className="cr-skip" href="#workspace">Skip to content</a><aside className="cr-sidebar">
    <NavLink className="cr-brand" to={meta.home}><span>{meta.icon}</span>CampusReserve</NavLink><p className="cr-eyebrow">{meta.label}</p><Link className="cr-product-return" to="/"><ArrowLeft size={15} />All products</Link>
    <nav className="cr-navigation" aria-label={`${meta.label} workspace`}>
      {area === 'spaces' && <><NavLink end to="/app"><LayoutDashboard size={19} />Overview</NavLink><NavLink to="/app/resources"><LayoutGrid size={19} />Browse resources</NavLink><NavLink to="/app/bookings"><ClipboardList size={19} />My bookings</NavLink><NavLink to="/app/waitlist"><ListPlus size={19} />My waitlist</NavLink>{administrator && <NavLink end to="/app/manage/bookings"><CalendarCheck size={19} />Approvals</NavLink>}{administrator && <NavLink to="/app/manage/calendar"><CalendarRange size={19} />Master calendar</NavLink>}{administrator && <NavLink to="/app/manage/bookings/history"><History size={19} />History</NavLink>}{administrator && <NavLink to="/app/manage/reports"><BarChart3 size={19} />Reports</NavLink>}{administrator && <NavLink to="/app/manage/resources"><Settings2 size={19} />Manage resources</NavLink>}</>}
      {area === 'canteen' && <>{auth.user?.role !== 'CANTEEN_STAFF' && <NavLink end to="/app/canteen"><Coffee size={19} />Order from canteen</NavLink>}{canteenStaff && <NavLink to="/app/canteen/manage"><Settings2 size={19} />Canteen console</NavLink>}</>}
      {area === 'events' && <NavLink end to="/app/events"><TicketCheck size={19} />Event access</NavLink>}
    </nav>
    <div className="cr-sidebar-foot"><div className="cr-account"><strong>{auth.user?.name}</strong><span>{auth.user?.role.replaceAll('_', ' ')}</span></div><div className="cr-inline"><ThemeToggle /><button className="cr-button cr-button-quiet" type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut size={17} />{loggingOut ? 'Signing out…' : 'Sign out'}</button></div>{error && <p className="cr-alert cr-alert-error" role="alert">{error}</p>}</div>
  </aside><div className="cr-main-column"><header className="cr-utility-bar" aria-label="Account utilities"><span className="cr-utility-product">{meta.label}</span><NavLink className="cr-notification-button" to={notificationPath} aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}><Bell size={21} />{unreadCount > 0 && <span className="cr-nav-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}</NavLink></header><main className="cr-workspace" id="workspace"><Outlet /></main></div></div>
}
