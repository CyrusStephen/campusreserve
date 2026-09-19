import { apiRequest } from '../auth/api'
import type { NotificationData, NotificationItem } from './types'

interface ApiResult<T> { status: 'ok'; data: T }

export const notificationChangedEvent = 'campusreserve:notifications-changed'

function notificationStateChanged(): void {
  window.dispatchEvent(new Event(notificationChangedEvent))
}

export async function listNotifications(signal?: AbortSignal): Promise<NotificationData> {
  return (await apiRequest<ApiResult<NotificationData>>('/notifications', signal ? { signal } : {})).data
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const item = (await apiRequest<ApiResult<NotificationItem>>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })).data
  notificationStateChanged()
  return item
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest<ApiResult<{ unreadCount: number }>>('/notifications/read-all', { method: 'POST' })
  notificationStateChanged()
}
