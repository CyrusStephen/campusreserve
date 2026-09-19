import { z } from 'zod'
import { isPublicHttpsUrl } from './resource-media.js'

const resourceFields = {
  name: z.string().trim().min(2).max(150),
  type: z.enum(['ROOM', 'HALL', 'LABORATORY', 'EQUIPMENT']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  description: z.string().trim().min(10).max(5000),
  building: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(180),
  capacity: z.number().int().min(1).max(100_000).nullable(),
  totalQuantity: z.number().int().min(1).max(10_000),
  isExclusive: z.boolean(),
  features: z.array(z.string().trim().min(1).max(80)).max(20),
  instructions: z.string().trim().max(5000).nullable(),
  tourUrl: z.string().trim().max(2048).refine(isPublicHttpsUrl, 'Use a public HTTPS tour link without embedded credentials.').nullable(),
  advanceBookingDays: z.number().int().min(1).max(365),
  minimumNoticeHours: z.number().int().min(0).max(8760),
  maximumDurationMinutes: z.number().int().min(15).max(10080),
  bufferBeforeMinutes: z.number().int().min(0).max(1440),
  bufferAfterMinutes: z.number().int().min(0).max(1440),
  cancellationDeadlineHours: z.number().int().min(0).max(8760),
}

function validatePolicy(data: z.infer<typeof baseSchema>, context: z.RefinementCtx) {
  if (data.type !== 'EQUIPMENT' && (!data.isExclusive || data.totalQuantity !== 1)) {
    context.addIssue({ code: 'custom', path: ['isExclusive'], message: 'Rooms, halls and labs must be exclusive with quantity 1.' })
  }
  if (data.type !== 'EQUIPMENT' && data.capacity === null) {
    context.addIssue({ code: 'custom', path: ['capacity'], message: 'Enter the capacity for this space.' })
  }
  if (data.isExclusive && data.totalQuantity !== 1) {
    context.addIssue({ code: 'custom', path: ['totalQuantity'], message: 'Exclusive resources must have quantity 1.' })
  }
  if (data.type === 'EQUIPMENT' && data.tourUrl !== null) {
    context.addIssue({ code: 'custom', path: ['tourUrl'], message: '360° tours are for spaces, not equipment.' })
  }
  if (data.minimumNoticeHours >= data.advanceBookingDays * 24) {
    context.addIssue({ code: 'custom', path: ['minimumNoticeHours'], message: 'Minimum notice must be shorter than the booking window.' })
  }
  if (data.cancellationDeadlineHours > data.advanceBookingDays * 24) {
    context.addIssue({ code: 'custom', path: ['cancellationDeadlineHours'], message: 'The cancellation deadline cannot exceed the booking window.' })
  }
}

const baseSchema = z.object(resourceFields).strict()
export const resourceCreateSchema = baseSchema.superRefine(validatePolicy)
export const resourceUpdateSchema = baseSchema.extend({ revision: z.number().int().positive().max(2_147_483_646) }).superRefine(validatePolicy)
export const resourceBlockCreateSchema = z.object({
  type: z.enum(['MAINTENANCE', 'COLLEGE_EVENT', 'HOLIDAY', 'EMERGENCY', 'OTHER']),
  reason: z.string().trim().min(3).max(500),
  startAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  endAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
}).strict().superRefine((data, context) => {
  if (data.endAt <= data.startAt) {
    context.addIssue({ code: 'custom', path: ['endAt'], message: 'The campus block must end after it starts.' })
    return
  }
  if (data.endAt.getTime() - data.startAt.getTime() > 366 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: 'custom', path: ['endAt'], message: 'A single campus block cannot exceed 366 days.' })
  }
})
export const resourceQuerySchema = z.object({
  scope: z.enum(['catalogue', 'manage', 'demo']).default('catalogue'),
  q: z.string().trim().max(100).default(''),
  type: z.enum(['ROOM', 'HALL', 'LABORATORY', 'EQUIPMENT']).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
}).strict()
