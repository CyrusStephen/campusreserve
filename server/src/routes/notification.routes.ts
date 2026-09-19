import { Router, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../utils/http-error.js'

export const notificationRouter = Router()

const trustedOrigin = new URL(env.CLIENT_ORIGIN).origin
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many notification updates. Please try again shortly.' },
})
const noStore: RequestHandler = (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  next()
}
const checkOrigin: RequestHandler = (request, _response, next) => {
  if (request.get('origin') !== trustedOrigin) throw new HttpError(403, 'This request origin is not allowed.')
  next()
}

notificationRouter.use(noStore, requireAuth)

notificationRouter.get('/', async (request, response) => {
  const [items, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId: request.auth!.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.notification.count({ where: { userId: request.auth!.user.id, readAt: null } }),
  ])
  response.json({ status: 'ok', data: { items, unreadCount } })
})

notificationRouter.patch('/:id/read', checkOrigin, writeLimiter, async (request, response) => {
  const id = z.uuid().parse(request.params.id)
  const existing = await prisma.notification.findFirst({ where: { id, userId: request.auth!.user.id } })
  if (!existing) throw new HttpError(404, 'Notification not found.')
  const item = existing.readAt
    ? existing
    : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
  response.json({ status: 'ok', data: item })
})

notificationRouter.post('/read-all', checkOrigin, writeLimiter, async (request, response) => {
  await prisma.notification.updateMany({
    where: { userId: request.auth!.user.id, readAt: null },
    data: { readAt: new Date() },
  })
  response.json({ status: 'ok', data: { unreadCount: 0 } })
})
