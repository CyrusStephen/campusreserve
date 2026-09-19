import type { Prisma } from '../generated/prisma/client.js'
import { notifyUser } from './notifications.js'

const CLAIM_WINDOW_MS = 4 * 60 * 60 * 1000

export async function advanceWaitlist(
  transaction: Prisma.TransactionClient,
  resourceId: string,
  startAt?: Date,
  endAt?: Date,
): Promise<void> {
  const now = new Date()
  const resource = await transaction.resource.findUnique({ where: { id: resourceId } })
  if (!resource) return

  const candidates = await transaction.waitlistEntry.findMany({
    where: {
      resourceId,
      status: 'ACTIVE',
      ...(startAt && endAt ? { startAt: { lt: endAt }, endAt: { gt: startAt } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 25,
  })

  for (const candidate of candidates) {
    if (candidate.claimExpiresAt && candidate.claimExpiresAt <= now) {
      await transaction.waitlistEntry.update({
        where: { id: candidate.id },
        data: { status: 'EXPIRED' },
      })
      continue
    }
    if (candidate.notifiedAt && candidate.claimExpiresAt && candidate.claimExpiresAt > now) return

    const blocked = await transaction.resourceBlock.count({
      where: { resourceId, startAt: { lt: candidate.endAt }, endAt: { gt: candidate.startAt } },
    })
    if (blocked > 0) continue

    if (resource.isExclusive) {
      const overlap = await transaction.reservationOccurrence.count({
        where: {
          resourceId,
          status: { in: ['PENDING', 'APPROVED'] },
          blockedStartAt: { lt: candidate.endAt },
          blockedEndAt: { gt: candidate.startAt },
        },
      })
      if (overlap > 0) continue
    } else {
      const reserved = await transaction.reservationOccurrence.aggregate({
        where: {
          resourceId,
          status: { in: ['PENDING', 'APPROVED'] },
          blockedStartAt: { lt: candidate.endAt },
          blockedEndAt: { gt: candidate.startAt },
        },
        _sum: { quantity: true },
      })
      if ((reserved._sum.quantity ?? 0) + candidate.quantity > resource.totalQuantity) continue
    }

    const claimExpiresAt = new Date(now.getTime() + CLAIM_WINDOW_MS)
    await transaction.waitlistEntry.update({
      where: { id: candidate.id },
      data: { notifiedAt: now, claimExpiresAt },
    })
    await notifyUser(transaction, candidate.requesterId, {
      type: 'WAITLIST_AVAILABLE',
      title: 'A requested slot is available',
      message: `${resource.name} · ${candidate.startAt.toISOString()} – ${candidate.endAt.toISOString()} · Claim within 4 hours`,
      entityId: candidate.id,
      entityType: 'WaitlistEntry',
    })
    return
  }
}

export async function expireWaitlists(transaction: Prisma.TransactionClient): Promise<void> {
  await transaction.waitlistEntry.updateMany({
    where: { status: 'ACTIVE', claimExpiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  })
}
