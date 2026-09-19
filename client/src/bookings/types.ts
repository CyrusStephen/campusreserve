import type { ResourceType } from '../resources/types'

export type BookingStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED'
export type OccurrenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED'

export interface BookingResource {
  id: string
  name: string
  type: ResourceType
  building: string
  location: string
  cancellationDeadlineHours: number
}

export interface BookingOccurrence {
  id: string
  sequenceNumber: number
  resourceId: string
  startAt: string
  endAt: string
  quantity: number
  status: OccurrenceStatus
  cancellationReason: string | null
  resource: BookingResource
}

export interface Booking {
  id: string
  referenceCode: string
  title: string
  purpose: string
  expectedPeople: number | null
  notes: string | null
  assignedToName: string
  assignedToEmail: string
  assignedToPhone: string
  status: BookingStatus
  submittedAt: string | null
  reviewedAt: string | null
  decisionReason: string | null
  createdAt: string
  requester: { id: string; name: string; email: string; role: string }
  occurrences: BookingOccurrence[]
}

export interface BookingInput {
  resourceId: string
  title: string
  purpose: string
  expectedPeople: number | null
  notes: string | null
  assignedToName: string
  assignedToEmail: string
  assignedToPhone: string
  occurrences: Array<{ startAt: string; endAt: string }>
  quantity: number
}

export interface ApprovalHistoryEntry {
  id: string
  decision: 'APPROVED' | 'REJECTED'
  decidedAt: string
  reason: string | null
  occurrenceId: string | null
  administrator: { id: string; name: string; email: string; role: string } | null
  reservation: Booking
}

export interface AvailabilityEntry {
  id: string
  kind: 'BOOKING' | 'BLOCK'
  status: 'PENDING' | 'APPROVED' | 'BLOCKED'
  startAt: string
  endAt: string
  actualStartAt?: string
  actualEndAt?: string
  quantity: number
  label: string
  blockType?: 'MAINTENANCE' | 'COLLEGE_EVENT' | 'HOLIDAY' | 'EMERGENCY' | 'OTHER'
}

export interface ResourceAvailability {
  resource: { id: string; isExclusive: boolean; totalQuantity: number }
  range: { from: string; to: string }
  entries: AvailabilityEntry[]
}

export interface DashboardData {
  activeResources: number
  myPendingRequests: number
  myUpcomingDates: number
  unreadNotifications: number
  administration: null | {
    pendingApprovals: number
    upcomingApprovedDates: number
    recentDecisions: Array<{
      id: string
      decision: 'APPROVED' | 'REJECTED'
      decidedAt: string
      referenceCode: string
      title: string
      administrator: { id: string; name: string } | null
    }>
  }
}

export type BookingVerification = {
  outcome: 'VALID_NOW' | 'VALID_LATER' | 'EXPIRED' | 'NOT_APPROVED' | 'CANCELLED' | 'NOT_FOUND'
  checkedAt: string
  booking?: {
    referenceCode: string
    title: string
    responsiblePerson: string
    resource: { name: string; building: string; location: string } | null
    startAt: string | null
    endAt: string | null
  }
}

export interface AdminCalendarResource {
  id: string
  name: string
  type: ResourceType
  building: string
  location: string
}

export type AdminCalendarEntry = {
  id: string
  startAt: string
  endAt: string
  blockedStartAt: string
  blockedEndAt: string
  quantity: number
  resource: AdminCalendarResource
} & (
  | {
    kind: 'BOOKING'
    status: 'PENDING' | 'APPROVED'
    reservation: {
      id: string
      referenceCode: string
      title: string
      requester: { id: string; name: string }
    }
  }
  | {
    kind: 'BLOCK'
    status: 'BLOCKED'
    blockType: 'MAINTENANCE' | 'COLLEGE_EVENT' | 'HOLIDAY' | 'EMERGENCY' | 'OTHER'
    label: string
  }
)

export interface AdminCalendarData {
  range: { from: string; to: string }
  resources: AdminCalendarResource[]
  entries: AdminCalendarEntry[]
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  DRAFT: 'Draft', PENDING: 'Awaiting approval', APPROVED: 'Approved', REJECTED: 'Rejected',
  NEEDS_CHANGES: 'Needs changes', CANCELLED: 'Cancelled', EXPIRED: 'Expired', COMPLETED: 'Completed',
}


export type WaitlistStatus = 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED'

export interface WaitlistEntry {
  id: string
  resourceId: string
  resourceName: string
  startAt: string
  endAt: string
  quantity: number
  status: WaitlistStatus
  notifiedAt: string | null
  claimExpiresAt: string | null
  claimedAt: string | null
  createdAt: string
  position: number | null
}

export interface WaitlistData {
  items: WaitlistEntry[]
}
