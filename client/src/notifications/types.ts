export type NotificationType =
  | 'BOOKING_SUBMITTED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'OCCURRENCE_APPROVED'
  | 'OCCURRENCE_REJECTED'
  | 'OCCURRENCE_CANCELLED'
  | 'OCCURRENCE_RESCHEDULED'
  | 'WAITLIST_AVAILABLE'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  readAt: string | null
  createdAt: string
}

export interface NotificationData {
  items: NotificationItem[]
  unreadCount: number
}
