import { prisma } from '../config/prisma.js'
import { advanceWaitlist } from './waitlist.js'

let running = false

export function startWaitlistWorker(log: (message: string, meta?: unknown) => void): NodeJS.Timeout {
  const run = async () => {
    if (running) return
    running = true
    try {
      await prisma.$transaction(async (transaction) => {
        const expired = await transaction.waitlistEntry.findMany({
          where: { status: 'ACTIVE', claimExpiresAt: { lte: new Date() } },
          select: { id: true, resourceId: true, startAt: true, endAt: true },
          take: 50,
        })
        for (const entry of expired) {
          await transaction.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'EXPIRED' } })
          await advanceWaitlist(transaction, entry.resourceId, entry.startAt, entry.endAt)
        }
      })
    } catch (error) {
      log('Waitlist worker failed', { error: error instanceof Error ? error.message : 'unknown' })
    } finally {
      running = false
    }
  }
  void run()
  return setInterval(() => { void run() }, 60_000)
}
