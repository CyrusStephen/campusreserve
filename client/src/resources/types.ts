export type ResourceType = 'ROOM' | 'HALL' | 'LABORATORY' | 'EQUIPMENT'
export type ResourceStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type ResourceScope = 'catalogue' | 'manage' | 'demo'
export type ResourceBlockType = 'MAINTENANCE' | 'COLLEGE_EVENT' | 'HOLIDAY' | 'EMERGENCY' | 'OTHER'

export interface ResourceBlockInput {
  type: ResourceBlockType
  reason: string
  startAt: string
  endAt: string
}

export interface ResourceBlock extends ResourceBlockInput {
  id: string
  resourceId: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ResourceInput {
  name: string
  type: ResourceType
  status: ResourceStatus
  description: string
  building: string
  location: string
  capacity: number | null
  totalQuantity: number
  isExclusive: boolean
  features: string[]
  instructions: string | null
  tourUrl: string | null
  advanceBookingDays: number
  minimumNoticeHours: number
  maximumDurationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  cancellationDeadlineHours: number
}

export interface ResourceImage {
  id: string
  url: string
  altText: string
  sortOrder: number
}

export interface Resource extends ResourceInput {
  id: string
  slug: string
  isDemo: boolean
  revision: number
  images: ResourceImage[]
  createdAt: string
  updatedAt: string
}

export const resourceLabels: Record<ResourceType, string> = {
  HALL: 'Hall', ROOM: 'Room', LABORATORY: 'Lab', EQUIPMENT: 'Equipment',
}

export const emptyResource: ResourceInput = {
  name: '', type: 'HALL', status: 'INACTIVE', description: '', building: '', location: '',
  capacity: null, totalQuantity: 1, isExclusive: true, features: [], instructions: null, tourUrl: null,
  advanceBookingDays: 60, minimumNoticeHours: 1, maximumDurationMinutes: 480,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0, cancellationDeadlineHours: 24,
}

export function editableResource(resource: Resource): ResourceInput {
  return Object.fromEntries(Object.keys(emptyResource).map((key) => [key, resource[key as keyof ResourceInput]])) as unknown as ResourceInput
}
