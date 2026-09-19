import { z } from 'zod'

const instant = z.string().datetime({ offset: true }).transform((value) => new Date(value))

export const availabilityQuerySchema = z.object({
  resourceId: z.uuid(),
  from: instant,
  to: instant,
}).strict().superRefine((data, context) => {
  if (data.to <= data.from) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'The availability range must end after it starts.' })
    return
  }
  if (data.to.getTime() - data.from.getTime() > 31 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'Availability can be viewed for at most 31 days at a time.' })
  }
})

export const adminCalendarQuerySchema = z.object({
  from: instant,
  to: instant,
  resourceId: z.uuid().optional(),
}).strict().superRefine((data, context) => {
  if (data.to <= data.from) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'The calendar range must end after it starts.' })
    return
  }
  if (data.to.getTime() - data.from.getTime() > 31 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'The master calendar can show at most 31 days at a time.' })
  }
})

const assignedToPhone = z.string().trim().min(7).max(30).regex(/^[0-9+()\-\s.]+$/, 'Enter a valid phone number.')

const occurrenceSchema = z.object({
  startAt: instant,
  endAt: instant,
}).strict().superRefine((data, context) => {
  if (data.endAt <= data.startAt) {
    context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time must be after the start time.' })
  }
})

export const bookingCreateSchema = z.object({
  resourceId: z.uuid(),
  title: z.string().trim().min(3).max(180),
  purpose: z.string().trim().min(10).max(5000),
  expectedPeople: z.number().int().min(1).max(100_000).nullable(),
  notes: z.string().trim().max(5000).nullable(),
  assignedToName: z.string().trim().min(2).max(120),
  assignedToEmail: z.string().trim().email().max(255),
  assignedToPhone,
  occurrences: z.array(occurrenceSchema).min(1).max(12),
  quantity: z.number().int().min(1).max(10_000).default(1),
}).strict().superRefine((data, context) => {
  for (let first = 0; first < data.occurrences.length; first += 1) {
    for (let second = first + 1; second < data.occurrences.length; second += 1) {
      const left = data.occurrences[first]
      const right = data.occurrences[second]
      if (left && right && left.startAt < right.endAt && right.startAt < left.endAt) {
        context.addIssue({ code: 'custom', path: ['occurrences', second, 'startAt'], message: 'Occurrences in the same request cannot overlap.' })
      }
    }
  }
})

export const bookingDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(2000).nullable(),
}).strict().superRefine((data, context) => {
  if (data.decision === 'REJECT' && (!data.reason || data.reason.length < 3)) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Give a short reason when rejecting a request.' })
  }
})

export const occurrenceDecisionSchema = bookingDecisionSchema

export const bookingCancelSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
}).strict()

export const occurrenceRescheduleSchema = z.object({
  startAt: instant,
  endAt: instant,
  reason: z.string().trim().min(3).max(2000),
}).strict().superRefine((data, context) => {
  if (data.endAt <= data.startAt) {
    context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time must be after the start time.' })
  }
})


export const waitlistCreateSchema = z.object({
  resourceId: z.uuid(),
  startAt: instant,
  endAt: instant,
  quantity: z.number().int().min(1).max(10_000).default(1),
}).strict().superRefine((data, context) => {
  if (data.endAt <= data.startAt) {
    context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time must be after the start time.' })
  }
})

export const waitlistClaimSchema = z.object({
  title: z.string().trim().min(3).max(180),
  purpose: z.string().trim().min(10).max(5000),
  expectedPeople: z.number().int().min(1).max(100_000).nullable(),
  notes: z.string().trim().max(5000).nullable(),
  assignedToName: z.string().trim().min(2).max(120),
  assignedToEmail: z.string().trim().email().max(255),
  assignedToPhone,
}).strict()


export const bookingExportQuerySchema = z.object({
  from: instant.optional(),
  to: instant.optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'CANCELLED', 'EXPIRED', 'COMPLETED']).optional(),
  resourceId: z.uuid().optional(),
}).strict().superRefine((data, context) => {
  if (data.from && data.to && data.to <= data.from) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'The export end must be after the start.' })
  }
  if (data.from && data.to && data.to.getTime() - data.from.getTime() > 366 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'Exports are limited to one year at a time.' })
  }
})
