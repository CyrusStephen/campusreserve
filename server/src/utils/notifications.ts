import type { Prisma } from '../generated/prisma/client.js'

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

interface NotificationInput {
  type: NotificationType
  title: string
  message: string
  entityId: string
  entityType?: string
}

export async function notifyUser(
  transaction: Prisma.TransactionClient,
  userId: string,
  input: NotificationInput,
): Promise<void> {
  await transaction.notification.create({
    data: { userId, ...input, entityType: input.entityType ?? 'Reservation' },
  })
}

export async function notifyAdministrators(
  transaction: Prisma.TransactionClient,
  input: NotificationInput,
  excludeUserId?: string,
): Promise<void> {
  const administrators = await transaction.user.findMany({
    where: {
      status: 'ACTIVE',
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })
  if (administrators.length === 0) return
  await transaction.notification.createMany({
    data: administrators.map(({ id: userId }) => ({ userId, ...input, entityType: input.entityType ?? 'Reservation' })),
  })
}
