import { randomBytes } from 'node:crypto'
import { Router, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { HttpError } from '../utils/http-error.js'
import { canteenItemSchema, canteenOrderCreateSchema, canteenOrderUpdateSchema } from '../utils/canteen-input.js'

export const canteenRouter = Router()
const trustedOrigin = new URL(process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').origin
const checkOrigin: RequestHandler = (request, _response, next) => { if (request.get('origin') !== trustedOrigin) throw new HttpError(403, 'This request origin is not allowed.'); next() }
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 80, standardHeaders: 'draft-7', legacyHeaders: false })
const manage = requireRoles('CANTEEN_STAFF', 'ADMIN', 'SUPER_ADMIN')
const includeOrder = { items: { orderBy: { id: 'asc' as const } }, requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } }, handler: { select: { id: true, name: true } } }

canteenRouter.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next() }, requireAuth)

canteenRouter.get('/items', async (_request, response) => {
  const items = await prisma.canteenItem.findMany({ where: { status: { not: 'INACTIVE' } }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] })
  response.json({ status: 'ok', data: items })
})

canteenRouter.get('/orders/mine', async (request, response) => {
  const orders = await prisma.canteenOrder.findMany({ where: { requesterId: request.auth!.user.id }, include: includeOrder, orderBy: { createdAt: 'desc' } })
  response.json({ status: 'ok', data: orders })
})

canteenRouter.post('/orders', requireRoles('FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN'), checkOrigin, limiter, async (request, response) => {
  const input = canteenOrderCreateSchema.parse(request.body)
  if (input.deliveryAt.getTime() < Date.now() + 10 * 60_000) throw new HttpError(400, 'Choose a delivery time at least 10 minutes from now.')
  const uniqueIds = [...new Set(input.items.map((item) => item.itemId))]
  if (uniqueIds.length !== input.items.length) throw new HttpError(400, 'Each menu item may appear only once.')
  const menu = await prisma.canteenItem.findMany({ where: { id: { in: uniqueIds }, status: 'AVAILABLE' } })
  if (menu.length !== uniqueIds.length) throw new HttpError(409, 'One or more items are no longer available.')
  const byId = new Map(menu.map((item) => [item.id, item]))
  const lines = input.items.map((line) => { const item = byId.get(line.itemId)!; if (line.customization && !item.options.includes(line.customization)) throw new HttpError(400, `Choose a valid option for ${item.name}.`); return { item: { connect: { id: item.id } }, itemName: item.name, unitPricePaise: item.pricePaise, quantity: line.quantity, ...(line.customization ? { customization: line.customization } : {}), lineTotalPaise: item.pricePaise * line.quantity } })
  const order = await prisma.canteenOrder.create({ data: {
    referenceCode: `CRF-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`, requesterId: request.auth!.user.id,
    deliveryLocation: input.deliveryLocation, deliveryAt: input.deliveryAt, ...(input.notes ? { notes: input.notes } : {}), paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentMethod === 'UPI' ? 'PENDING_VERIFICATION' : 'PAY_ON_DELIVERY', ...(input.upiReference ? { upiReference: input.upiReference } : {}),
    ...(input.paymentScreenshotDataUrl ? { paymentScreenshotUrl: input.paymentScreenshotDataUrl } : {}), totalPaise: lines.reduce((sum, line) => sum + line.lineTotalPaise, 0), items: { create: lines },
  }, include: includeOrder })
  response.status(201).json({ status: 'ok', data: order })
})

canteenRouter.get('/manage/orders', manage, async (_request, response) => {
  response.json({ status: 'ok', data: await prisma.canteenOrder.findMany({ include: includeOrder, orderBy: [{ deliveryAt: 'asc' }, { createdAt: 'asc' }] }) })
})

canteenRouter.patch('/manage/orders/:id', manage, checkOrigin, limiter, async (request, response) => {
  const id = z.uuid().parse(request.params.id); const input = canteenOrderUpdateSchema.parse(request.body)
  const current = await prisma.canteenOrder.findUnique({ where: { id } }); if (!current) throw new HttpError(404, 'Canteen order not found.')
  const updated = await prisma.canteenOrder.update({ where: { id }, data: { ...(input.status ? { status: input.status } : {}), ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}), ...(input.rejectionReason ? { rejectionReason: input.rejectionReason } : {}), handlerId: request.auth!.user.id, ...(input.status === 'ACCEPTED' ? { acceptedAt: new Date() } : {}), ...(input.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}) }, include: includeOrder })
  await prisma.notification.create({ data: { userId: updated.requesterId, type: 'CANTEEN_ORDER_UPDATED', title: `Canteen order ${updated.status.toLowerCase().replaceAll('_', ' ')}`, message: `${updated.referenceCode} is now ${updated.status.toLowerCase().replaceAll('_', ' ')}.`, entityType: 'CanteenOrder', entityId: updated.id } })
  response.json({ status: 'ok', data: updated })
})

canteenRouter.get('/manage/items', manage, async (_request, response) => response.json({ status: 'ok', data: await prisma.canteenItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }) }))
canteenRouter.post('/manage/items', manage, checkOrigin, limiter, async (request, response) => { const input = canteenItemSchema.parse(request.body); response.status(201).json({ status: 'ok', data: await prisma.canteenItem.create({ data: { ...input, imageUrl: input.imageUrl || null } }) }) })
canteenRouter.put('/manage/items/:id', manage, checkOrigin, limiter, async (request, response) => { const input = canteenItemSchema.parse(request.body); response.json({ status: 'ok', data: await prisma.canteenItem.update({ where: { id: z.uuid().parse(request.params.id) }, data: { ...input, imageUrl: input.imageUrl || null } }) }) })
