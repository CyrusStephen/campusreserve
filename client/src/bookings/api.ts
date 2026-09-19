import { apiBlobRequest, apiRequest } from '../auth/api'
import type { AdminCalendarData, ApprovalHistoryEntry, Booking, BookingInput, BookingVerification, DashboardData, ResourceAvailability, WaitlistData, WaitlistEntry } from './types'

interface ApiResult<T> { status: 'ok'; data: T }

export async function createBooking(input: BookingInput): Promise<Booking> {
  return (await apiRequest<ApiResult<Booking>>('/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })).data
}

export async function listMyBookings(signal?: AbortSignal): Promise<Booking[]> {
  return (await apiRequest<ApiResult<Booking[]>>('/bookings/mine', signal ? { signal } : {})).data
}

export async function listBookingQueue(signal?: AbortSignal): Promise<Booking[]> {
  return (await apiRequest<ApiResult<Booking[]>>('/bookings/queue', signal ? { signal } : {})).data
}

export async function listApprovalHistory(signal?: AbortSignal): Promise<ApprovalHistoryEntry[]> {
  return (await apiRequest<ApiResult<ApprovalHistoryEntry[]>>('/bookings/history', signal ? { signal } : {})).data
}

export async function getResourceAvailability(resourceId: string, from: Date, to: Date, signal?: AbortSignal): Promise<ResourceAvailability> {
  const query = new URLSearchParams({
    resourceId,
    from: from.toISOString(),
    to: to.toISOString(),
  })
  return (await apiRequest<ApiResult<ResourceAvailability>>(`/bookings/availability?${query.toString()}`, signal ? { signal } : {})).data
}

export async function getDashboard(signal?: AbortSignal): Promise<DashboardData> {
  return (await apiRequest<ApiResult<DashboardData>>('/bookings/dashboard', signal ? { signal } : {})).data
}

export async function verifyBooking(referenceCode: string): Promise<BookingVerification> {
  return (await apiRequest<ApiResult<BookingVerification>>(`/bookings/verify/${encodeURIComponent(referenceCode.trim())}`)).data
}

export async function getAdminCalendar(from: Date, to: Date, resourceId?: string, signal?: AbortSignal): Promise<AdminCalendarData> {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  if (resourceId) query.set('resourceId', resourceId)
  return (await apiRequest<ApiResult<AdminCalendarData>>(`/bookings/calendar?${query.toString()}`, signal ? { signal } : {})).data
}

export async function decideBooking(id: string, decision: 'APPROVE' | 'REJECT', reason: string | null): Promise<Booking> {
  return (await apiRequest<ApiResult<Booking>>(`/bookings/${encodeURIComponent(id)}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reason }),
  })).data
}

export async function decideOccurrence(bookingId: string, occurrenceId: string, decision: 'APPROVE' | 'REJECT', reason: string | null): Promise<Booking> {
  return (await apiRequest<ApiResult<Booking>>(`/bookings/${encodeURIComponent(bookingId)}/occurrences/${encodeURIComponent(occurrenceId)}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, reason }),
  })).data
}

export async function cancelBooking(id: string, reason: string): Promise<Booking> {
  return (await apiRequest<ApiResult<Booking>>(`/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })).data
}

export async function cancelOccurrence(bookingId: string, occurrenceId: string, reason: string): Promise<Booking> {
  return (await apiRequest<ApiResult<Booking>>(`/bookings/${encodeURIComponent(bookingId)}/occurrences/${encodeURIComponent(occurrenceId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })).data
}

export async function rescheduleOccurrence(
  bookingId: string,
  occurrenceId: string,
  input: { startAt: string; endAt: string; reason: string },
): Promise<Booking> {
  return (await apiRequest<ApiResult<Booking>>(`/bookings/${encodeURIComponent(bookingId)}/occurrences/${encodeURIComponent(occurrenceId)}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })).data
}


export async function listMyWaitlist(signal?: AbortSignal): Promise<WaitlistData> {
  return (await apiRequest<{ status: 'ok'; data: WaitlistData }>('/bookings/waitlist', signal ? { signal } : {})).data
}

export async function joinWaitlist(input: { resourceId: string; startAt: string; endAt: string; quantity: number }): Promise<WaitlistEntry> {
  return (await apiRequest<{ status: 'ok'; data: WaitlistEntry }>('/bookings/waitlist', {
    method: 'POST',
    body: JSON.stringify(input),
  })).data
}

export async function cancelWaitlist(id: string): Promise<void> {
  await apiRequest<void>(`/bookings/waitlist/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function claimWaitlist(
  id: string,
  input: {
    title: string
    purpose: string
    expectedPeople: number | null
    notes: string | null
    assignedToName: string
    assignedToEmail: string
    assignedToPhone: string
  },
): Promise<Booking> {
  return (await apiRequest<{ status: 'ok'; data: Booking }>(`/bookings/waitlist/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
    body: JSON.stringify(input),
  })).data
}

export async function exportBookingsCsv(query: { from?: string; to?: string; status?: string; resourceId?: string } = {}): Promise<Blob> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  return apiBlobRequest(`/bookings/export.csv${params.size ? `?${params.toString()}` : ''}`)
}
