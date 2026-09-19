import { randomUUID } from 'node:crypto'
import { Router, type Request, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import type { Prisma } from '../generated/prisma/client.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { adminCalendarQuerySchema, availabilityQuerySchema, bookingCancelSchema, bookingCreateSchema, bookingExportQuerySchema, bookingDecisionSchema, occurrenceDecisionSchema, occurrenceRescheduleSchema, waitlistClaimSchema, waitlistCreateSchema } from '../utils/booking-input.js'
import { intervalTouchesWeekend } from '../utils/campus-calendar.js'
import { HttpError } from '../utils/http-error.js'
import { notifyAdministrators, notifyUser } from '../utils/notifications.js'
import { bookingMailData, queueBookingChangedMail, queueBookingDecisionMail, queueBookingSubmittedMail, queueOccurrenceDecisionMail } from '../utils/booking-mail.js'
import { advanceWaitlist } from '../utils/waitlist.js'

export const bookingRouter = Router()

const trustedOrigin = new URL(env.CLIENT_ORIGIN).origin
const activeOccurrenceStatuses = ['PENDING', 'APPROVED'] as const
const bookingInclude = {
  requester: { select: { id: true, name: true, email: true, role: true } },
  occurrences: {
    orderBy: { sequenceNumber: 'asc' },
    include: { resource: { select: { id: true, name: true, type: true, building: true, location: true, cancellationDeadlineHours: true } } },
  },
} satisfies Prisma.ReservationInclude
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many booking updates. Please try again shortly.' },
})
const checkOrigin: RequestHandler = (request, _response, next) => {
  if (request.get('origin') !== trustedOrigin) throw new HttpError(403, 'This request origin is not allowed.')
  next()
}
const noStore: RequestHandler = (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  next()
}

bookingRouter.use(noStore, requireAuth)

function isAdministrator(request: Request): boolean {
  return request.auth?.user.role === 'ADMIN' || request.auth?.user.role === 'SUPER_ADMIN'
}

function reservationId(request: Request): string {
  return z.uuid().parse(request.params.id)
}

bookingRouter.get('/availability', async (request, response) => {
  const input = availabilityQuerySchema.parse(request.query)
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, status: 'ACTIVE', isDemo: false },
    select: { id: true, isExclusive: true, totalQuantity: true },
  })
  if (!resource) throw new HttpError(404, 'Bookable resource not found.')

  const [occurrences, blocks] = await Promise.all([
    prisma.reservationOccurrence.findMany({
      where: {
        resourceId: resource.id,
        status: { in: [...activeOccurrenceStatuses] },
        blockedStartAt: { lt: input.to },
        blockedEndAt: { gt: input.from },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        blockedStartAt: true,
        blockedEndAt: true,
        quantity: true,
        status: true,
      },
      orderBy: { blockedStartAt: 'asc' },
      take: 250,
    }),
    prisma.resourceBlock.findMany({
      where: {
        resourceId: resource.id,
        startAt: { lt: input.to },
        endAt: { gt: input.from },
      },
      select: { id: true, type: true, reason: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
      take: 100,
    }),
  ])

  const entries = [
    ...occurrences.map((occurrence) => ({
      id: occurrence.id,
      kind: 'BOOKING' as const,
      status: occurrence.status,
      startAt: occurrence.blockedStartAt,
      endAt: occurrence.blockedEndAt,
      actualStartAt: occurrence.startAt,
      actualEndAt: occurrence.endAt,
      quantity: occurrence.quantity,
      label: occurrence.status === 'PENDING' ? 'Pending booking hold' : 'Approved booking',
    })),
    ...blocks.map((block) => ({
      id: block.id,
      kind: 'BLOCK' as const,
      status: 'BLOCKED' as const,
      startAt: block.startAt,
      endAt: block.endAt,
      quantity: resource.totalQuantity,
      label: block.reason,
      blockType: block.type,
    })),
  ].sort((left, right) => left.startAt.getTime() - right.startAt.getTime())

  response.json({
    status: 'ok',
    data: {
      resource,
      range: { from: input.from, to: input.to },
      entries,
    },
  })
})

bookingRouter.get('/dashboard', async (request, response) => {
  const now = new Date()
  const userId = request.auth!.user.id
  const [activeResources, myPendingRequests, myUpcomingDates, unreadNotifications] = await Promise.all([
    prisma.resource.count({ where: { status: 'ACTIVE', isDemo: false } }),
    prisma.reservation.count({ where: { requesterId: userId, status: 'PENDING' } }),
    prisma.reservationOccurrence.count({
      where: {
        reservation: { requesterId: userId },
        status: { in: [...activeOccurrenceStatuses] },
        endAt: { gt: now },
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ])

  let administration: null | {
    pendingApprovals: number
    upcomingApprovedDates: number
    recentDecisions: Array<{
      id: string
      decision: 'APPROVED' | 'REJECTED'
      decidedAt: Date
      referenceCode: string
      title: string
      administrator: { id: string; name: string } | null
    }>
  } = null

  if (isAdministrator(request)) {
    const [pendingApprovals, upcomingApprovedDates, decisions] = await Promise.all([
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservationOccurrence.count({ where: { status: 'APPROVED', endAt: { gt: now } } }),
      prisma.auditLog.findMany({
        where: {
          entityType: 'Reservation',
          action: { in: ['RESERVATION_APPROVED', 'RESERVATION_REJECTED', 'RESERVATION_OCCURRENCE_APPROVED', 'RESERVATION_OCCURRENCE_REJECTED'] },
        },
        select: { id: true, entityId: true, action: true, createdAt: true, actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])
    const reservationIds = [...new Set(decisions.map((decision) => decision.entityId))]
    const reservations = await prisma.reservation.findMany({
      where: { id: { in: reservationIds } },
      select: { id: true, referenceCode: true, title: true },
    })
    const byId = new Map(reservations.map((reservation) => [reservation.id, reservation]))
    administration = {
      pendingApprovals,
      upcomingApprovedDates,
      recentDecisions: decisions.flatMap((decision) => {
        const reservation = byId.get(decision.entityId)
        if (!reservation) return []
        return [{
          id: decision.id,
          decision: decision.action.endsWith('APPROVED') ? 'APPROVED' as const : 'REJECTED' as const,
          decidedAt: decision.createdAt,
          referenceCode: reservation.referenceCode,
          title: reservation.title,
          administrator: decision.actor,
        }]
      }),
    }
  }

  response.json({ status: 'ok', data: {
    activeResources,
    myPendingRequests,
    myUpcomingDates,
    unreadNotifications,
    administration,
  } })
})

bookingRouter.get('/calendar', requireRoles('ADMIN', 'SUPER_ADMIN'), async (request, response) => {
  const input = adminCalendarQuerySchema.parse(request.query)
  const resourceWhere = {
    isDemo: false,
    status: { not: 'ARCHIVED' as const },
  }
  const [resources, occurrences, blocks] = await Promise.all([
    prisma.resource.findMany({
      where: resourceWhere,
      select: { id: true, name: true, type: true, building: true, location: true },
      orderBy: { name: 'asc' },
    }),
    prisma.reservationOccurrence.findMany({
      where: {
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
        resource: { isDemo: false, status: { not: 'ARCHIVED' } },
        status: { in: [...activeOccurrenceStatuses] },
        startAt: { lt: input.to },
        endAt: { gt: input.from },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        blockedStartAt: true,
        blockedEndAt: true,
        quantity: true,
        status: true,
        resource: { select: { id: true, name: true, type: true, building: true, location: true } },
        reservation: { select: { id: true, referenceCode: true, title: true, requester: { select: { id: true, name: true } } } },
      },
      orderBy: { startAt: 'asc' },
      take: 500,
    }),
    prisma.resourceBlock.findMany({
      where: {
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
        resource: { isDemo: false, status: { not: 'ARCHIVED' } },
        startAt: { lt: input.to },
        endAt: { gt: input.from },
      },
      select: {
        id: true,
        type: true,
        reason: true,
        startAt: true,
        endAt: true,
        resource: { select: { id: true, name: true, type: true, building: true, location: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 500,
    }),
  ])

  const entries = [
    ...occurrences.map((occurrence) => ({
      id: occurrence.id,
      kind: 'BOOKING' as const,
      status: occurrence.status,
      startAt: occurrence.startAt,
      endAt: occurrence.endAt,
      blockedStartAt: occurrence.blockedStartAt,
      blockedEndAt: occurrence.blockedEndAt,
      quantity: occurrence.quantity,
      resource: occurrence.resource,
      reservation: occurrence.reservation,
    })),
    ...blocks.map((block) => ({
      id: block.id,
      kind: 'BLOCK' as const,
      status: 'BLOCKED' as const,
      startAt: block.startAt,
      endAt: block.endAt,
      blockedStartAt: block.startAt,
      blockedEndAt: block.endAt,
      quantity: 0,
      resource: block.resource,
      blockType: block.type,
      label: block.reason,
    })),
  ].sort((left, right) => left.startAt.getTime() - right.startAt.getTime())

  response.json({ status: 'ok', data: { range: { from: input.from, to: input.to }, resources, entries } })
})

function referenceCode(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  return `CR-${date}-${randomUUID().slice(0, 8).toUpperCase()}`
}

async function lockResource(transaction: Prisma.TransactionClient, resourceId: string): Promise<void> {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Resource" WHERE "id" = ${resourceId}::uuid FOR UPDATE
  `
  if (rows.length !== 1) throw new HttpError(404, 'Resource not found.')
}

async function audit(
  transaction: Prisma.TransactionClient,
  request: Request,
  action: string,
  entityId: string,
  metadata: Prisma.InputJsonObject = {},
): Promise<void> {
  await transaction.auditLog.create({ data: {
    actorId: request.auth!.user.id,
    action,
    entityType: 'Reservation',
    entityId,
    metadata,
  } })
}

bookingRouter.get('/mine', async (request, response) => {
  const reservations = await prisma.reservation.findMany({
    where: { requesterId: request.auth!.user.id },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  response.json({ status: 'ok', data: reservations })
})

bookingRouter.get('/queue', requireRoles('ADMIN', 'SUPER_ADMIN'), async (_request, response) => {
  const reservations = await prisma.reservation.findMany({
    where: { status: 'PENDING' },
    include: bookingInclude,
    orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
    take: 100,
  })
  response.json({ status: 'ok', data: reservations })
})

bookingRouter.get('/history', requireRoles('ADMIN', 'SUPER_ADMIN'), async (_request, response) => {
  const decisions = await prisma.auditLog.findMany({
    where: {
      entityType: 'Reservation',
      action: { in: ['RESERVATION_APPROVED', 'RESERVATION_REJECTED', 'RESERVATION_OCCURRENCE_APPROVED', 'RESERVATION_OCCURRENCE_REJECTED'] },
    },
    select: {
      id: true,
      entityId: true,
      action: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const reservationIds = [...new Set(decisions.map((decision) => decision.entityId))]
  const reservations = await prisma.reservation.findMany({
    where: { id: { in: reservationIds } },
    include: bookingInclude,
  })
  const byId = new Map(reservations.map((reservation) => [reservation.id, reservation]))
  const history = decisions.flatMap((decision) => {
    const reservation = byId.get(decision.entityId)
    if (!reservation) return []
    const metadata = decision.metadata && typeof decision.metadata === 'object' && !Array.isArray(decision.metadata)
      ? decision.metadata as Record<string, unknown>
      : {}
    return [{
      id: decision.id,
      decision: decision.action.endsWith('APPROVED') ? 'APPROVED' : 'REJECTED',
      decidedAt: decision.createdAt,
      reason: typeof metadata.reason === 'string' && metadata.reason ? metadata.reason : null,
      occurrenceId: typeof metadata.occurrenceId === 'string' ? metadata.occurrenceId : null,
      administrator: decision.actor,
      reservation,
    }]
  })
  response.json({ status: 'ok', data: history })
})

bookingRouter.post('/', requireRoles('FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN'), checkOrigin, writeLimiter, async (request, response) => {
  const input = bookingCreateSchema.parse(request.body)
  const now = new Date()
  const reservation = await prisma.$transaction(async (transaction) => {
    await lockResource(transaction, input.resourceId)
    const resource = await transaction.resource.findUnique({ where: { id: input.resourceId } })
    if (!resource || resource.status !== 'ACTIVE' || resource.isDemo) {
      throw new HttpError(409, 'This resource is not currently available for booking.')
    }

    const minimumStart = new Date(now.getTime() + resource.minimumNoticeHours * 60 * 60 * 1000)
    const maximumStart = new Date(now.getTime() + resource.advanceBookingDays * 24 * 60 * 60 * 1000)
    if (resource.capacity !== null && input.expectedPeople !== null && input.expectedPeople > resource.capacity) {
      throw new HttpError(400, `Expected attendance exceeds this resource's capacity of ${resource.capacity}.`)
    }

    const quantity = resource.type === 'EQUIPMENT' && !resource.isExclusive ? input.quantity : 1
    if (quantity > resource.totalQuantity) throw new HttpError(400, `Only ${resource.totalQuantity} unit(s) are available.`)

    const scheduledOccurrences = [...input.occurrences].sort((left, right) => left.startAt.getTime() - right.startAt.getTime()).map((occurrence, index) => {
      const durationMinutes = (occurrence.endAt.getTime() - occurrence.startAt.getTime()) / 60_000
      if (occurrence.startAt < minimumStart) throw new HttpError(400, `Occurrence ${index + 1} needs at least ${resource.minimumNoticeHours} hour(s) notice.`)
      if (occurrence.startAt > maximumStart) throw new HttpError(400, `Occurrence ${index + 1} is outside the ${resource.advanceBookingDays}-day booking window.`)
      if (durationMinutes > resource.maximumDurationMinutes) throw new HttpError(400, `Occurrence ${index + 1} exceeds the ${resource.maximumDurationMinutes}-minute duration limit.`)
      return {
        sequenceNumber: index + 1,
        resourceId: resource.id,
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
        blockedStartAt: new Date(occurrence.startAt.getTime() - resource.bufferBeforeMinutes * 60_000),
        blockedEndAt: new Date(occurrence.endAt.getTime() + resource.bufferAfterMinutes * 60_000),
        quantity,
        isExclusive: resource.isExclusive,
        status: 'PENDING' as const,
      }
    })
    for (let first = 0; first < scheduledOccurrences.length; first += 1) {
      for (let second = first + 1; second < scheduledOccurrences.length; second += 1) {
        const left = scheduledOccurrences[first]
        const right = scheduledOccurrences[second]
        if (left && right && left.blockedStartAt < right.blockedEndAt && right.blockedStartAt < left.blockedEndAt) {
          throw new HttpError(400, `Occurrences ${first + 1} and ${second + 1} overlap after the resource's setup buffers are applied.`)
        }
      }
    }

    for (const occurrence of scheduledOccurrences) {
      const blocked = await transaction.resourceBlock.count({
        where: { resourceId: resource.id, startAt: { lt: occurrence.blockedEndAt }, endAt: { gt: occurrence.blockedStartAt } },
      })
      if (blocked > 0) throw new HttpError(409, `Occurrence ${occurrence.sequenceNumber} conflicts with a college event, maintenance period or closure.`)

      if (resource.isExclusive) {
        const overlap = await transaction.reservationOccurrence.count({ where: {
          resourceId: resource.id,
          status: { in: [...activeOccurrenceStatuses] },
          blockedStartAt: { lt: occurrence.blockedEndAt },
          blockedEndAt: { gt: occurrence.blockedStartAt },
        } })
        if (overlap > 0) throw new HttpError(409, `Occurrence ${occurrence.sequenceNumber} is no longer available. Adjust that date or time.`)
      } else {
        const reserved = await transaction.reservationOccurrence.aggregate({
          where: {
            resourceId: resource.id,
            status: { in: [...activeOccurrenceStatuses] },
            blockedStartAt: { lt: occurrence.blockedEndAt },
            blockedEndAt: { gt: occurrence.blockedStartAt },
          },
          _sum: { quantity: true },
        })
        if ((reserved._sum.quantity ?? 0) + quantity > resource.totalQuantity) {
          throw new HttpError(409, `Occurrence ${occurrence.sequenceNumber} does not have enough units available.`)
        }
      }
    }

    const id = randomUUID()
    const created = await transaction.reservation.create({
      data: {
        id,
        referenceCode: referenceCode(),
        requesterId: request.auth!.user.id,
        departmentId: request.auth!.user.departmentId,
        title: input.title,
        purpose: input.purpose,
        expectedPeople: input.expectedPeople,
        notes: input.notes,
        assignedToName: input.assignedToName,
        assignedToEmail: input.assignedToEmail,
        assignedToPhone: input.assignedToPhone,
        ...(scheduledOccurrences.length > 1 ? { recurrenceRule: { type: 'CUSTOM_DATES', occurrenceCount: scheduledOccurrences.length } } : {}),
        status: 'PENDING',
        submittedAt: now,
        occurrences: { create: scheduledOccurrences },
      },
      include: bookingInclude,
    })
    await audit(transaction, request, 'RESERVATION_SUBMITTED', id, {
      resourceId: resource.id,
      occurrenceCount: scheduledOccurrences.length,
      starts: scheduledOccurrences.map((occurrence) => occurrence.startAt.toISOString()),
    })
    await notifyAdministrators(transaction, {
      type: 'BOOKING_SUBMITTED',
      title: 'New booking request',
      message: `${created.referenceCode} · ${created.title} · ${scheduledOccurrences.length} ${scheduledOccurrences.length === 1 ? 'date' : 'dates'}`,
      entityId: id,
    }, request.auth!.user.id)
    const mailBooking = await transaction.reservation.findUniqueOrThrow({
      where: { id },
      include: bookingInclude,
    })
    await queueBookingSubmittedMail(transaction, bookingMailData(mailBooking))
    return created
  }, { isolationLevel: 'Serializable' })
  response.status(201).json({ status: 'ok', data: reservation })
})

bookingRouter.get('/export.csv', requireRoles('ADMIN', 'SUPER_ADMIN'), async (request, response) => {
  const input = bookingExportQuerySchema.parse(request.query)
  const occurrences = await prisma.reservationOccurrence.findMany({
    where: {
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      ...(input.from || input.to ? {
        startAt: {
          ...(input.from ? { gte: input.from } : {}),
          ...(input.to ? { lt: input.to } : {}),
        },
      } : {}),
      ...(input.status ? { reservation: { status: input.status } } : {}),
    },
    include: {
      reservation: {
        select: {
          referenceCode: true, title: true, purpose: true, expectedPeople: true, notes: true,
          status: true, submittedAt: true, reviewedAt: true, decisionReason: true,
          assignedToName: true, assignedToEmail: true, assignedToPhone: true,
          requester: { select: { name: true, email: true, role: true } },
          department: { select: { code: true, name: true } },
        },
      },
      resource: { select: { name: true, type: true, building: true, location: true } },
    },
    orderBy: [{ startAt: 'asc' }, { reservation: { createdAt: 'asc' } }],
    take: 20_000,
  })
  const escapeCsv = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value)
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  const headers = ['Booking ID', 'Title', 'Resource', 'Resource type', 'Building', 'Location', 'Occurrence', 'Start', 'End', 'Occurrence status', 'Booking status', 'Requester', 'Requester email', 'Requester role', 'Department', 'Expected people', 'Assigned to', 'Assigned email', 'Assigned phone', 'Purpose', 'Notes', 'Decision reason', 'Submitted at', 'Reviewed at']
  const rows = occurrences.map((occurrence) => {
    const booking = occurrence.reservation
    return [
      booking.referenceCode, booking.title, occurrence.resource.name, occurrence.resource.type, occurrence.resource.building,
      occurrence.resource.location, occurrence.sequenceNumber, occurrence.startAt.toISOString(), occurrence.endAt.toISOString(),
      occurrence.status, booking.status, booking.requester.name, booking.requester.email, booking.requester.role,
      booking.department ? `${booking.department.code} - ${booking.department.name}` : '', booking.expectedPeople,
      booking.assignedToName, booking.assignedToEmail, booking.assignedToPhone, booking.purpose, booking.notes,
      booking.decisionReason, booking.submittedAt?.toISOString() ?? '', booking.reviewedAt?.toISOString() ?? '',
    ].map(escapeCsv).join(',')
  })
  const csv = `\uFEFF${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}\r\n`
  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Content-Disposition', `attachment; filename="campusreserve-bookings-${new Date().toISOString().slice(0, 10)}.csv"`)
  response.setHeader('Cache-Control', 'no-store')
  response.send(csv)
})

bookingRouter.get('/waitlist', async (request, response) => {
  const entries = await prisma.waitlistEntry.findMany({
    where: { requesterId: request.auth!.user.id, status: { in: ['ACTIVE', 'CLAIMED'] } },
    include: { resource: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const positions = await Promise.all(entries.map((entry) => prisma.waitlistEntry.count({
    where: {
      resourceId: entry.resourceId,
      startAt: entry.startAt,
      endAt: entry.endAt,
      status: { in: ['ACTIVE', 'CLAIMED'] },
      createdAt: { lte: entry.createdAt },
    },
  })))
  response.json({ status: 'ok', data: {
    items: entries.map((entry, index) => ({
      id: entry.id,
      resourceId: entry.resourceId,
      resourceName: entry.resource.name,
      startAt: entry.startAt,
      endAt: entry.endAt,
      quantity: entry.quantity,
      status: entry.status,
      notifiedAt: entry.notifiedAt,
      claimExpiresAt: entry.claimExpiresAt,
      claimedAt: entry.claimedAt,
      createdAt: entry.createdAt,
      position: positions[index] ?? null,
    })),
  } })
})

bookingRouter.post('/waitlist', requireRoles('FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN'), checkOrigin, writeLimiter, async (request, response) => {
  const input = waitlistCreateSchema.parse(request.body)
  const now = new Date()
  if (input.startAt <= now) throw new HttpError(400, 'Waitlist dates must be in the future.')
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (input.startAt > horizon) throw new HttpError(400, 'The waitlist is limited to the next 30 days.')
  const entry = await prisma.$transaction(async (transaction) => {
    await lockResource(transaction, input.resourceId)
    const resource = await transaction.resource.findFirst({
      where: { id: input.resourceId, status: 'ACTIVE', isDemo: false },
    })
    if (!resource) throw new HttpError(404, 'Bookable resource not found.')
    const minimumStart = new Date(now.getTime() + resource.minimumNoticeHours * 60 * 60 * 1000)
    const maximumStart = new Date(now.getTime() + resource.advanceBookingDays * 24 * 60 * 60 * 1000)
    if (input.startAt < minimumStart) throw new HttpError(400, `This slot is inside the resource's ${resource.minimumNoticeHours}-hour minimum notice.`)
    if (input.startAt > maximumStart) throw new HttpError(400, `This slot is outside the ${resource.advanceBookingDays}-day booking window.`)
    const durationMinutes = (input.endAt.getTime() - input.startAt.getTime()) / 60_000
    if (durationMinutes > resource.maximumDurationMinutes) throw new HttpError(400, `This slot exceeds the ${resource.maximumDurationMinutes}-minute duration limit.`)
    if (input.quantity > resource.totalQuantity) throw new HttpError(400, `Only ${resource.totalQuantity} unit(s) are available.`)
    const blocked = await transaction.resourceBlock.count({
      where: { resourceId: resource.id, startAt: { lt: input.endAt }, endAt: { gt: input.startAt } },
    })
    if (blocked > 0) throw new HttpError(409, 'This time is blocked by a college event, maintenance period or closure and cannot be waitlisted.')
    const occupied = resource.isExclusive
      ? await transaction.reservationOccurrence.count({
          where: { resourceId: resource.id, status: { in: [...activeOccurrenceStatuses] }, blockedStartAt: { lt: input.endAt }, blockedEndAt: { gt: input.startAt } },
        }) > 0
      : ((await transaction.reservationOccurrence.aggregate({
          where: { resourceId: resource.id, status: { in: [...activeOccurrenceStatuses] }, blockedStartAt: { lt: input.endAt }, blockedEndAt: { gt: input.startAt } },
          _sum: { quantity: true },
        }))._sum.quantity ?? 0) + input.quantity > resource.totalQuantity
    if (!occupied) throw new HttpError(409, 'This slot is currently available. Submit a booking request instead of joining the waitlist.')
    const activeCount = await transaction.waitlistEntry.count({
      where: { requesterId: request.auth!.user.id, status: { in: ['ACTIVE', 'CLAIMED'] } },
    })
    if (activeCount >= 3) throw new HttpError(400, 'You can have at most 3 active waitlist entries.')
    const duplicate = await transaction.waitlistEntry.findFirst({
      where: { requesterId: request.auth!.user.id, resourceId: resource.id, startAt: input.startAt, endAt: input.endAt, status: { in: ['ACTIVE', 'CLAIMED'] } },
    })
    if (duplicate) throw new HttpError(409, 'You are already waiting for this exact slot.')
    const created = await transaction.waitlistEntry.create({
      data: { requesterId: request.auth!.user.id, resourceId: resource.id, startAt: input.startAt, endAt: input.endAt, quantity: input.quantity },
      include: { resource: { select: { name: true } } },
    })
    await audit(transaction, request, 'WAITLIST_JOINED', created.id, {
      resourceId: resource.id,
      startAt: input.startAt.toISOString(),
      endAt: input.endAt.toISOString(),
    })
    return created
  }, { isolationLevel: 'Serializable' })
  response.status(201).json({ status: 'ok', data: {
    id: entry.id, resourceId: entry.resourceId, resourceName: entry.resource.name,
    startAt: entry.startAt, endAt: entry.endAt, quantity: entry.quantity, status: entry.status,
    notifiedAt: entry.notifiedAt, claimExpiresAt: entry.claimExpiresAt, claimedAt: entry.claimedAt,
    createdAt: entry.createdAt, position: null,
  } })
})

bookingRouter.post('/waitlist/:id/claim', requireRoles('FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN'), checkOrigin, writeLimiter, async (request, response) => {
  const waitlistId = z.uuid().parse(request.params.id)
  const input = waitlistClaimSchema.parse(request.body)
  const now = new Date()
  const reservation = await prisma.$transaction(async (transaction) => {
    const waitlist = await transaction.waitlistEntry.findUnique({ where: { id: waitlistId }, include: { resource: true } })
    if (!waitlist || waitlist.requesterId !== request.auth!.user.id) throw new HttpError(404, 'Waitlist entry not found.')
    if (waitlist.status !== 'ACTIVE' || !waitlist.notifiedAt || !waitlist.claimExpiresAt || waitlist.claimExpiresAt <= now) {
      throw new HttpError(409, 'This waitlist offer is no longer active.')
    }
    const resource = waitlist.resource
    const minimumStart = new Date(now.getTime() + resource.minimumNoticeHours * 60 * 60 * 1000)
    const maximumStart = new Date(now.getTime() + resource.advanceBookingDays * 24 * 60 * 60 * 1000)
    if (waitlist.startAt < minimumStart || waitlist.startAt > maximumStart) throw new HttpError(409, 'This waitlist slot is outside the resource booking window.')
    const durationMinutes = (waitlist.endAt.getTime() - waitlist.startAt.getTime()) / 60_000
    if (durationMinutes > resource.maximumDurationMinutes) throw new HttpError(409, 'This waitlist slot exceeds the resource duration limit.')
    if (resource.capacity !== null && input.expectedPeople !== null && input.expectedPeople > resource.capacity) {
      throw new HttpError(400, `Expected attendance exceeds this resource's capacity of ${resource.capacity}.`)
    }
    const blocked = await transaction.resourceBlock.count({
      where: { resourceId: resource.id, startAt: { lt: waitlist.endAt }, endAt: { gt: waitlist.startAt } },
    })
    if (blocked > 0) throw new HttpError(409, 'The slot is no longer available because it is blocked.')
    const blockedStartAt = new Date(waitlist.startAt.getTime() - resource.bufferBeforeMinutes * 60_000)
    const blockedEndAt = new Date(waitlist.endAt.getTime() + resource.bufferAfterMinutes * 60_000)
    if (resource.isExclusive) {
      const overlap = await transaction.reservationOccurrence.count({
        where: { resourceId: resource.id, status: { in: [...activeOccurrenceStatuses] }, blockedStartAt: { lt: blockedEndAt }, blockedEndAt: { gt: blockedStartAt } },
      })
      if (overlap > 0) throw new HttpError(409, 'The slot was taken before your claim was submitted.')
    } else {
      const reserved = await transaction.reservationOccurrence.aggregate({
        where: { resourceId: resource.id, status: { in: [...activeOccurrenceStatuses] }, blockedStartAt: { lt: blockedEndAt }, blockedEndAt: { gt: blockedStartAt } },
        _sum: { quantity: true },
      })
      if ((reserved._sum.quantity ?? 0) + waitlist.quantity > resource.totalQuantity) throw new HttpError(409, 'The slot no longer has enough units available.')
    }
    const id = randomUUID()
    const created = await transaction.reservation.create({
      data: {
        id,
        referenceCode: referenceCode(),
        requesterId: request.auth!.user.id,
        departmentId: request.auth!.user.departmentId,
        title: input.title,
        purpose: input.purpose,
        expectedPeople: input.expectedPeople,
        notes: input.notes,
        assignedToName: input.assignedToName,
        assignedToEmail: input.assignedToEmail,
        assignedToPhone: input.assignedToPhone,
        status: 'PENDING',
        submittedAt: now,
        occurrences: { create: [{
          sequenceNumber: 1, resourceId: resource.id, startAt: waitlist.startAt, endAt: waitlist.endAt,
          blockedStartAt, blockedEndAt, quantity: waitlist.quantity, isExclusive: resource.isExclusive, status: 'PENDING',
        }] },
      },
      include: bookingInclude,
    })
    await transaction.waitlistEntry.update({ where: { id: waitlist.id }, data: { status: 'FULFILLED', claimedAt: now } })
    await audit(transaction, request, 'WAITLIST_FULFILLED', waitlist.id, { reservationId: created.id })
    await audit(transaction, request, 'RESERVATION_SUBMITTED_FROM_WAITLIST', created.id, { waitlistId: waitlist.id })
    await notifyAdministrators(transaction, {
      type: 'BOOKING_SUBMITTED',
      title: 'New waitlist booking request',
      message: `${created.referenceCode} · ${created.title}`,
      entityId: created.id,
    }, request.auth!.user.id)
    await queueBookingSubmittedMail(transaction, bookingMailData(created))
    return created
  }, { isolationLevel: 'Serializable' })
  response.status(201).json({ status: 'ok', data: reservation })
})

bookingRouter.delete('/waitlist/:id', checkOrigin, writeLimiter, async (request, response) => {
  const waitlistId = z.uuid().parse(request.params.id)
  await prisma.$transaction(async (transaction) => {
    const entry = await transaction.waitlistEntry.findUnique({ where: { id: waitlistId } })
    if (!entry || entry.requesterId !== request.auth!.user.id) throw new HttpError(404, 'Waitlist entry not found.')
    if (!['ACTIVE', 'CLAIMED'].includes(entry.status)) throw new HttpError(409, 'This waitlist entry is already closed.')
    await transaction.waitlistEntry.update({ where: { id: waitlistId }, data: { status: 'CANCELLED' } })
    await audit(transaction, request, 'WAITLIST_CANCELLED', waitlistId, {})
  })
  response.status(204).send()
})

bookingRouter.patch('/:id/decision', requireRoles('ADMIN', 'SUPER_ADMIN'), checkOrigin, writeLimiter, async (request, response) => {
  const id = reservationId(request)
  const input = bookingDecisionSchema.parse(request.body)
  const reservation = await prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Reservation" WHERE "id" = ${id}::uuid FOR UPDATE
    `
    if (rows.length !== 1) throw new HttpError(404, 'Booking request not found.')
    const current = await transaction.reservation.findUnique({
      where: { id },
      include: { occurrences: { orderBy: { sequenceNumber: 'asc' } } },
    })
    if (!current || current.status !== 'PENDING') throw new HttpError(409, 'This request has already been decided or cancelled.')
    if (current.requesterId === request.auth!.user.id) throw new HttpError(403, 'Another administrator must review your own booking request.')
    if (!current.occurrences.every((occurrence) => occurrence.status === 'PENDING')) {
      throw new HttpError(409, 'Some dates already have decisions. Finish this request using the individual date controls.')
    }
    const approved = input.decision === 'APPROVE'
    const weekendException = approved && current.occurrences.some((occurrence) => intervalTouchesWeekend(occurrence.startAt, occurrence.endAt))
    if (weekendException && (!input.reason || input.reason.length < 3)) {
      throw new HttpError(400, 'Give a reason before approving a weekend exception.')
    }
    await transaction.reservationOccurrence.updateMany({
      where: { reservationId: id, status: 'PENDING' },
      data: { status: approved ? 'APPROVED' : 'REJECTED' },
    })
    const updated = await transaction.reservation.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: request.auth!.user.id,
        decisionReason: input.reason,
      },
      include: bookingInclude,
    })
    await audit(transaction, request, approved ? 'RESERVATION_APPROVED' : 'RESERVATION_REJECTED', id, { reason: input.reason ?? '', weekendException })
    await notifyUser(transaction, current.requesterId, {
      type: approved ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
      title: approved ? 'Booking approved' : 'Booking rejected',
      message: `${current.referenceCode} · ${current.title}${weekendException ? ' · Weekend exception approved' : ''}`,
      entityId: id,
    })
    await queueBookingDecisionMail(transaction, bookingMailData(updated), approved, input.reason)
    if (!approved) {
      for (const released of current.occurrences) {
        await advanceWaitlist(transaction, released.resourceId, released.startAt, released.endAt)
      }
    }
    return updated
  }, { isolationLevel: 'Serializable' })
  response.json({ status: 'ok', data: reservation })
})

bookingRouter.patch('/:id/occurrences/:occurrenceId/decision', requireRoles('ADMIN', 'SUPER_ADMIN'), checkOrigin, writeLimiter, async (request, response) => {
  const id = reservationId(request)
  const occurrenceId = z.uuid().parse(request.params.occurrenceId)
  const input = occurrenceDecisionSchema.parse(request.body)
  const reservation = await prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Reservation" WHERE "id" = ${id}::uuid FOR UPDATE
    `
    if (rows.length !== 1) throw new HttpError(404, 'Booking request not found.')
    const current = await transaction.reservation.findUnique({
      where: { id },
      include: { occurrences: { orderBy: { sequenceNumber: 'asc' } } },
    })
    if (!current || current.status !== 'PENDING') throw new HttpError(409, 'This request has already been fully decided or cancelled.')
    if (current.requesterId === request.auth!.user.id) throw new HttpError(403, 'Another administrator must review your own booking request.')
    const occurrence = current.occurrences.find((item) => item.id === occurrenceId)
    if (!occurrence) throw new HttpError(404, 'Booking occurrence not found.')
    if (occurrence.status !== 'PENDING') throw new HttpError(409, 'This occurrence has already been decided.')
    const approved = input.decision === 'APPROVE'
    const weekendException = approved && intervalTouchesWeekend(occurrence.startAt, occurrence.endAt)
    if (weekendException && (!input.reason || input.reason.length < 3)) {
      throw new HttpError(400, 'Give a reason before approving a weekend exception.')
    }
    const decidedAt = new Date()
    await transaction.reservationOccurrence.update({
      where: { id: occurrenceId },
      data: approved
        ? { status: 'APPROVED' }
        : { status: 'REJECTED', cancelledAt: decidedAt, cancelledById: request.auth!.user.id, cancellationReason: input.reason },
    })
    const remaining = current.occurrences.filter((item) => item.id !== occurrenceId).map((item) => item.status)
    const resultingStatuses = [...remaining, approved ? 'APPROVED' : 'REJECTED']
    const pending = resultingStatuses.includes('PENDING')
    const parentStatus = pending ? 'PENDING' : resultingStatuses.includes('APPROVED') ? 'APPROVED' : 'REJECTED'
    const updated = await transaction.reservation.update({
      where: { id },
      data: {
        status: parentStatus,
        ...(pending ? {} : { reviewedAt: decidedAt, reviewedById: request.auth!.user.id }),
      },
      include: bookingInclude,
    })
    await audit(transaction, request, approved ? 'RESERVATION_OCCURRENCE_APPROVED' : 'RESERVATION_OCCURRENCE_REJECTED', id, {
      occurrenceId,
      sequenceNumber: occurrence.sequenceNumber,
      startAt: occurrence.startAt.toISOString(),
      reason: input.reason ?? '',
      weekendException,
    })
    await notifyUser(transaction, current.requesterId, {
      type: approved ? 'OCCURRENCE_APPROVED' : 'OCCURRENCE_REJECTED',
      title: approved ? 'Booking date approved' : 'Booking date rejected',
      message: `${current.referenceCode} · Occurrence ${occurrence.sequenceNumber}${weekendException ? ' · Weekend exception approved' : ''}`,
      entityId: id,
    })
    await queueOccurrenceDecisionMail(transaction, bookingMailData(updated), approved, input.reason, occurrence.sequenceNumber)
    if (!approved) await advanceWaitlist(transaction, occurrence.resourceId, occurrence.startAt, occurrence.endAt)
    return updated
  }, { isolationLevel: 'Serializable' })
  response.json({ status: 'ok', data: reservation })
})

bookingRouter.patch('/:id/occurrences/:occurrenceId/reschedule', checkOrigin, writeLimiter, async (request, response) => {
  const id = reservationId(request)
  const occurrenceId = z.uuid().parse(request.params.occurrenceId)
  const input = occurrenceRescheduleSchema.parse(request.body)
  const now = new Date()

  const reservation = await prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Reservation" WHERE "id" = ${id}::uuid FOR UPDATE
    `
    if (rows.length !== 1) throw new HttpError(404, 'Booking request not found.')
    const current = await transaction.reservation.findUnique({
      where: { id },
      include: { occurrences: { orderBy: { sequenceNumber: 'asc' } } },
    })
    if (!current || current.requesterId !== request.auth!.user.id) throw new HttpError(404, 'Booking request not found.')
    const occurrence = current.occurrences.find((item) => item.id === occurrenceId)
    if (!occurrence) throw new HttpError(404, 'Booking occurrence not found.')
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(occurrence.status)) {
      throw new HttpError(409, 'This occurrence can no longer be rescheduled.')
    }

    await lockResource(transaction, occurrence.resourceId)
    const resource = await transaction.resource.findUnique({ where: { id: occurrence.resourceId } })
    if (!resource || resource.status !== 'ACTIVE' || resource.isDemo) {
      throw new HttpError(409, 'This resource is not currently available for rescheduling.')
    }
    if (occurrence.status === 'PENDING' || occurrence.status === 'APPROVED') {
      const oldDeadline = new Date(occurrence.startAt.getTime() - resource.cancellationDeadlineHours * 60 * 60 * 1000)
      if (now > oldDeadline) throw new HttpError(409, 'The self-service change deadline has passed. Contact an administrator.')
    }

    const minimumStart = new Date(now.getTime() + resource.minimumNoticeHours * 60 * 60 * 1000)
    const maximumStart = new Date(now.getTime() + resource.advanceBookingDays * 24 * 60 * 60 * 1000)
    const durationMinutes = (input.endAt.getTime() - input.startAt.getTime()) / 60_000
    if (input.startAt < minimumStart) throw new HttpError(400, `The new date needs at least ${resource.minimumNoticeHours} hour(s) notice.`)
    if (input.startAt > maximumStart) throw new HttpError(400, `The new date is outside the ${resource.advanceBookingDays}-day booking window.`)
    if (durationMinutes > resource.maximumDurationMinutes) throw new HttpError(400, `The new date exceeds the ${resource.maximumDurationMinutes}-minute duration limit.`)
    if (resource.capacity !== null && current.expectedPeople !== null && current.expectedPeople > resource.capacity) {
      throw new HttpError(400, `Expected attendance exceeds this resource's capacity of ${resource.capacity}.`)
    }
    if (occurrence.quantity > resource.totalQuantity) throw new HttpError(400, `Only ${resource.totalQuantity} unit(s) are available.`)

    const blockedStartAt = new Date(input.startAt.getTime() - resource.bufferBeforeMinutes * 60_000)
    const blockedEndAt = new Date(input.endAt.getTime() + resource.bufferAfterMinutes * 60_000)
    const blocked = await transaction.resourceBlock.count({
      where: { resourceId: resource.id, startAt: { lt: blockedEndAt }, endAt: { gt: blockedStartAt } },
    })
    if (blocked > 0) throw new HttpError(409, 'The new date conflicts with a college event, maintenance period or closure.')

    if (resource.isExclusive) {
      const overlap = await transaction.reservationOccurrence.count({ where: {
        id: { not: occurrence.id },
        resourceId: resource.id,
        status: { in: [...activeOccurrenceStatuses] },
        blockedStartAt: { lt: blockedEndAt },
        blockedEndAt: { gt: blockedStartAt },
      } })
      if (overlap > 0) throw new HttpError(409, 'The new date is no longer available. Choose another time.')
    } else {
      const reserved = await transaction.reservationOccurrence.aggregate({
        where: {
          id: { not: occurrence.id },
          resourceId: resource.id,
          status: { in: [...activeOccurrenceStatuses] },
          blockedStartAt: { lt: blockedEndAt },
          blockedEndAt: { gt: blockedStartAt },
        },
        _sum: { quantity: true },
      })
      if ((reserved._sum.quantity ?? 0) + occurrence.quantity > resource.totalQuantity) {
        throw new HttpError(409, 'The new date does not have enough units available.')
      }
    }

    const previousStartAt = occurrence.startAt
    const previousEndAt = occurrence.endAt
    await transaction.reservationOccurrence.update({
      where: { id: occurrence.id },
      data: {
        startAt: input.startAt,
        endAt: input.endAt,
        blockedStartAt,
        blockedEndAt,
        status: 'PENDING',
        cancelledAt: null,
        cancelledById: null,
        cancellationReason: null,
      },
    })
    const updated = await transaction.reservation.update({
      where: { id },
      data: { status: 'PENDING', submittedAt: now, reviewedAt: null, reviewedById: null, decisionReason: null },
      include: bookingInclude,
    })
    await audit(transaction, request, 'RESERVATION_OCCURRENCE_RESCHEDULED', id, {
      occurrenceId: occurrence.id,
      sequenceNumber: occurrence.sequenceNumber,
      previousStartAt: previousStartAt.toISOString(),
      newStartAt: input.startAt.toISOString(),
      reason: input.reason,
      weekendException: intervalTouchesWeekend(input.startAt, input.endAt),
    })
    await notifyAdministrators(transaction, {
      type: 'OCCURRENCE_RESCHEDULED',
      title: 'Booking date changed',
      message: `${current.referenceCode} · Occurrence ${occurrence.sequenceNumber} needs review again`,
      entityId: id,
    }, request.auth!.user.id)
    await queueBookingChangedMail(transaction, bookingMailData(updated), `Booking date changed · ${updated.referenceCode}`, `Occurrence ${occurrence.sequenceNumber} was rescheduled and has been returned to the approval queue.`)
    await advanceWaitlist(transaction, occurrence.resourceId, previousStartAt, previousEndAt)
    return updated
  }, { isolationLevel: 'Serializable' })

  response.json({ status: 'ok', data: reservation })
})

bookingRouter.post('/:id/occurrences/:occurrenceId/cancel', checkOrigin, writeLimiter, async (request, response) => {
  const id = reservationId(request)
  const occurrenceId = z.uuid().parse(request.params.occurrenceId)
  const input = bookingCancelSchema.parse(request.body)

  const reservation = await prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Reservation" WHERE "id" = ${id}::uuid FOR UPDATE
    `
    if (rows.length !== 1) throw new HttpError(404, 'Booking request not found.')
    const current = await transaction.reservation.findUnique({ where: { id }, include: bookingInclude })
    if (!current) throw new HttpError(404, 'Booking request not found.')
    if (!isAdministrator(request) && current.requesterId !== request.auth!.user.id) throw new HttpError(404, 'Booking request not found.')
    const occurrence = current.occurrences.find((item) => item.id === occurrenceId)
    if (!occurrence) throw new HttpError(404, 'Booking occurrence not found.')
    if (occurrence.status !== 'PENDING' && occurrence.status !== 'APPROVED') {
      throw new HttpError(409, 'This occurrence cannot be cancelled now.')
    }
    if (!isAdministrator(request)) {
      const resource = await transaction.resource.findUniqueOrThrow({ where: { id: occurrence.resourceId } })
      const deadline = new Date(occurrence.startAt.getTime() - resource.cancellationDeadlineHours * 60 * 60 * 1000)
      if (new Date() > deadline) throw new HttpError(409, 'The self-service cancellation deadline has passed. Contact an administrator.')
    }

    const cancelledAt = new Date()
    await transaction.reservationOccurrence.update({
      where: { id: occurrence.id },
      data: { status: 'CANCELLED', cancelledAt, cancelledById: request.auth!.user.id, cancellationReason: input.reason },
    })
    const statuses = current.occurrences.map((item) => item.id === occurrence.id ? 'CANCELLED' as const : item.status)
    const parentStatus = statuses.includes('PENDING') ? 'PENDING' as const
      : statuses.includes('APPROVED') ? 'APPROVED' as const
        : statuses.includes('REJECTED') ? 'REJECTED' as const
          : statuses.every((status) => status === 'COMPLETED') ? 'COMPLETED' as const
            : 'CANCELLED' as const
    const updated = await transaction.reservation.update({
      where: { id },
      data: { status: parentStatus, ...(parentStatus === 'CANCELLED' ? { decisionReason: input.reason } : {}) },
      include: bookingInclude,
    })
    await audit(transaction, request, 'RESERVATION_OCCURRENCE_CANCELLED', id, {
      occurrenceId: occurrence.id,
      sequenceNumber: occurrence.sequenceNumber,
      startAt: occurrence.startAt.toISOString(),
      reason: input.reason,
    })
    if (current.requesterId === request.auth!.user.id) {
      await notifyAdministrators(transaction, {
        type: 'OCCURRENCE_CANCELLED',
        title: 'Booking date cancelled',
        message: `${current.referenceCode} · Occurrence ${occurrence.sequenceNumber}`,
        entityId: id,
      }, request.auth!.user.id)
    } else {
      await notifyUser(transaction, current.requesterId, {
        type: 'OCCURRENCE_CANCELLED',
        title: 'Booking date cancelled by an administrator',
        message: `${current.referenceCode} · Occurrence ${occurrence.sequenceNumber}`,
        entityId: id,
      })
    }
    await queueBookingChangedMail(transaction, bookingMailData(updated), `Booking date cancelled · ${updated.referenceCode}`, `Occurrence ${occurrence.sequenceNumber} was cancelled. The released time may now be offered to the waitlist.`)
    await advanceWaitlist(transaction, occurrence.resourceId, occurrence.startAt, occurrence.endAt)
    return updated
  }, { isolationLevel: 'Serializable' })

  response.json({ status: 'ok', data: reservation })
})

bookingRouter.post('/:id/cancel', checkOrigin, writeLimiter, async (request, response) => {
  const id = reservationId(request)
  const input = bookingCancelSchema.parse(request.body)
  const reservation = await prisma.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Reservation" WHERE "id" = ${id}::uuid FOR UPDATE
    `
    if (rows.length !== 1) throw new HttpError(404, 'Booking request not found.')
    const current = await transaction.reservation.findUnique({ where: { id }, include: bookingInclude })
    if (!current) throw new HttpError(404, 'Booking request not found.')
    if (!isAdministrator(request) && current.requesterId !== request.auth!.user.id) throw new HttpError(404, 'Booking request not found.')
    if (current.status !== 'PENDING' && current.status !== 'APPROVED') throw new HttpError(409, 'This request cannot be cancelled now.')
    const first = current.occurrences.find((occurrence) => activeOccurrenceStatuses.includes(occurrence.status as typeof activeOccurrenceStatuses[number]))
    if (!first) throw new HttpError(409, 'This request has no scheduled occurrence.')
    if (!isAdministrator(request)) {
      const resource = await transaction.resource.findUniqueOrThrow({ where: { id: first.resourceId } })
      const deadline = new Date(first.startAt.getTime() - resource.cancellationDeadlineHours * 60 * 60 * 1000)
      if (new Date() > deadline) throw new HttpError(409, 'The self-service cancellation deadline has passed. Contact an administrator.')
    }
    const cancelledAt = new Date()
    const releasedOccurrences = current.occurrences.filter((occurrence) => activeOccurrenceStatuses.includes(occurrence.status as typeof activeOccurrenceStatuses[number]))
    await transaction.reservationOccurrence.updateMany({
      where: { reservationId: id, status: { in: [...activeOccurrenceStatuses] } },
      data: { status: 'CANCELLED', cancelledAt, cancelledById: request.auth!.user.id, cancellationReason: input.reason },
    })
    const updated = await transaction.reservation.update({
      where: { id },
      data: { status: 'CANCELLED', decisionReason: input.reason },
      include: bookingInclude,
    })
    await audit(transaction, request, 'RESERVATION_CANCELLED', id, { reason: input.reason })
    if (current.requesterId === request.auth!.user.id) {
      await notifyAdministrators(transaction, {
        type: 'BOOKING_CANCELLED',
        title: 'Booking cancelled',
        message: `${current.referenceCode} · ${current.title}`,
        entityId: id,
      }, request.auth!.user.id)
    } else {
      await notifyUser(transaction, current.requesterId, {
        type: 'BOOKING_CANCELLED',
        title: 'Booking cancelled by an administrator',
        message: `${current.referenceCode} · ${current.title}`,
        entityId: id,
      })
    }
    await queueBookingChangedMail(transaction, bookingMailData(updated), `Booking cancelled · ${updated.referenceCode}`, 'Your CampusReserve booking has been cancelled successfully.')
    for (const released of releasedOccurrences) {
      await advanceWaitlist(transaction, released.resourceId, released.startAt, released.endAt)
    }
    return updated
  }, { isolationLevel: 'Serializable' })
  response.json({ status: 'ok', data: reservation })
})
