import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../notifications/api'
import type { NotificationData } from '../notifications/types'

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationData | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError('')
    void listNotifications(controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Notifications could not be loaded.')
    })
    return () => controller.abort()
  }, [retry])

  async function markRead(id: string) {
    setWorkingId(id); setError('')
    try {
      const updated = await markNotificationRead(id)
      setData((current) => current ? {
        items: current.items.map((item) => item.id === id ? updated : item),
        unreadCount: Math.max(0, current.unreadCount - 1),
      } : null)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'The notification could not be updated.')
    } finally { setWorkingId(null) }
  }

  async function markAllRead() {
    setWorkingId('all'); setError('')
    try {
      await markAllNotificationsRead()
      const readAt = new Date().toISOString()
      setData((current) => current ? { items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })), unreadCount: 0 } : null)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Notifications could not be updated.')
    } finally { setWorkingId(null) }
  }

  return <section className="cr-page">
    <header className="cr-page-heading"><div><p className="cr-eyebrow">Updates</p><h1>Notifications</h1><p>Booking submissions, decisions and schedule changes stay here until you have seen them.</p></div>{Boolean(data?.unreadCount) && <button className="cr-button" type="button" disabled={workingId === 'all'} onClick={() => void markAllRead()}><CheckCheck size={17} />{workingId === 'all' ? 'Updating…' : 'Mark all read'}</button>}</header>
    {error && <div className="cr-alert cr-alert-error" role="alert"><p>{error}</p><button className="cr-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reload</button></div>}
    {!data && !error && <div className="cr-empty" role="status">Loading notifications…</div>}
    {data?.items.length === 0 && <div className="cr-empty"><Bell size={32} /><h2>No notifications yet.</h2><p>New booking activity will appear here.</p></div>}
    {data && data.items.length > 0 && <div className="cr-notification-list">{data.items.map((item) => <article className={`cr-panel cr-notification${item.readAt ? '' : ' cr-notification-unread'}`} key={item.id}>
      <div className="cr-notification-icon"><Bell size={18} /></div><div><div className="cr-notification-head"><h2>{item.title}</h2>{!item.readAt && <span>New</span>}</div><p>{item.message}</p><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></div>{!item.readAt && <button className="cr-button cr-button-small" type="button" disabled={workingId === item.id} onClick={() => void markRead(item.id)}>Mark read</button>}
    </article>)}</div>}
  </section>
}
