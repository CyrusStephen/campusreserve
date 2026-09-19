import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router, raw, type Request, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import type { Prisma } from '../generated/prisma/client.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { HttpError } from '../utils/http-error.js'
import { canManageResources, canViewResource } from '../utils/resource-access.js'
import { resourceBlockCreateSchema, resourceCreateSchema, resourceQuerySchema, resourceUpdateSchema } from '../utils/resource-input.js'
import { inspectJpeg, MAX_PHOTOS, MAX_PHOTO_BYTES, photoFilenamePattern } from '../utils/resource-media.js'

export const resourceRouter = Router()
export const resourceImageRouter = Router()

const uploadDirectory = env.RESOURCE_UPLOAD_DIR
  ? resolve(env.RESOURCE_UPLOAD_DIR)
  : fileURLToPath(new URL('../../storage/resource-images/', import.meta.url))
const includeImages = { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } satisfies Prisma.ResourceInclude
const trustedOrigin = new URL(env.CLIENT_ORIGIN).origin
const revisionSchema = z.number().int().positive().max(2_147_483_646)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many edits. Please try again shortly.' },
})
const checkOrigin: RequestHandler = (request, _response, next) => {
  if (request.get('origin') !== trustedOrigin) throw new HttpError(403, 'This request origin is not allowed.')
  next()
}
const adminWrite = [requireRoles('ADMIN', 'SUPER_ADMIN'), checkOrigin, writeLimiter]
const noStore: RequestHandler = (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  next()
}

resourceRouter.use(noStore, requireAuth)
resourceImageRouter.use(noStore, requireAuth)

function isAdmin(request: Request): boolean {
  return canManageResources(request.auth?.user.role)
}

function idFrom(request: Request): string {
  return z.uuid().parse(request.params.id)
}

async function getResource(id: string, role: string | undefined) {
  const resource = await prisma.resource.findUnique({ where: { id }, include: includeImages })
  if (!resource || !canViewResource(role, resource)) {
    throw new HttpError(404, 'Resource not found.')
  }
  return resource
}

async function audit(transaction: Prisma.TransactionClient, request: Request, action: string, id: string, metadata: Prisma.InputJsonObject = {}) {
  await transaction.auditLog.create({ data: {
    actorId: request.auth!.user.id,
    action,
    entityType: 'Resource',
    entityId: id,
    metadata,
  } })
}

async function claimRevision(transaction: Prisma.TransactionClient, id: string, revision: number) {
  const result = await transaction.resource.updateMany({
    where: { id, revision },
    data: { revision: { increment: 1 } },
  })
  if (result.count !== 1) throw new HttpError(409, 'This resource changed or no longer exists. Reload it before editing again.')
}

async function lockResource(transaction: Prisma.TransactionClient, id: string): Promise<void> {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Resource" WHERE "id" = ${id}::uuid FOR UPDATE
  `
  if (rows.length !== 1) throw new HttpError(404, 'Resource not found.')
}

resourceRouter.get('/', async (request, response) => {
  const query = resourceQuerySchema.parse(request.query)
  if (query.scope !== 'catalogue' && !isAdmin(request)) throw new HttpError(403, 'Administrator access is required.')
  const where: Prisma.ResourceWhereInput = {
    isDemo: query.scope === 'demo',
    ...(query.scope === 'catalogue' ? { status: 'ACTIVE' } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.q ? { OR: [
      { name: { contains: query.q, mode: 'insensitive' as const } },
      { building: { contains: query.q, mode: 'insensitive' as const } },
      { location: { contains: query.q, mode: 'insensitive' as const } },
    ] } : {}),
  }
  const [resources, total] = await prisma.$transaction([
    prisma.resource.findMany({ where, include: includeImages, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.resource.count({ where }),
  ])
  response.json({ status: 'ok', data: { resources, total, page: query.page, pageSize: query.pageSize } })
})

resourceRouter.get('/:id', async (request, response) => {
  response.json({ status: 'ok', data: await getResource(idFrom(request), request.auth?.user.role) })
})

resourceRouter.post('/', ...adminWrite, async (request, response) => {
  const data = resourceCreateSchema.parse(request.body)
  const id = randomUUID()
  const slugBase = data.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 130) || 'resource'
  const resource = await prisma.$transaction(async (transaction) => {
    const created = await transaction.resource.create({ data: { ...data, id, slug: `${slugBase}-${id}`, isDemo: false }, include: includeImages })
    await audit(transaction, request, 'RESOURCE_CREATED', id, { name: created.name, status: created.status })
    return created
  })
  response.status(201).json({ status: 'ok', data: resource })
})

resourceRouter.put('/:id', ...adminWrite, async (request, response) => {
  const id = idFrom(request)
  const { revision, ...data } = resourceUpdateSchema.parse(request.body)
  const resource = await prisma.$transaction(async (transaction) => {
    // This row lock must also be respected by future booking writers.
    await claimRevision(transaction, id, revision)
    const previous = await transaction.resource.findUniqueOrThrow({ where: { id } })
    const schedulingChanged = previous.type !== data.type || previous.totalQuantity !== data.totalQuantity ||
      previous.isExclusive !== data.isExclusive || previous.bufferBeforeMinutes !== data.bufferBeforeMinutes ||
      previous.bufferAfterMinutes !== data.bufferAfterMinutes
    if (schedulingChanged) {
      const held = await transaction.reservationOccurrence.count({ where: { resourceId: id, status: { in: ['PENDING', 'APPROVED'] }, blockedEndAt: { gt: new Date() } } })
      if (held > 0) throw new HttpError(409, 'Resolve upcoming reservations before changing resource type, quantity, exclusivity or buffers.')
    }
    // isDemo cannot be changed through this API; test venues never become live.
    const updated = await transaction.resource.update({ where: { id }, data, include: includeImages })
    await audit(transaction, request, 'RESOURCE_UPDATED', id, { revision: updated.revision, status: updated.status })
    return updated
  }, { isolationLevel: 'Serializable' })
  response.json({ status: 'ok', data: resource })
})

resourceRouter.post('/:id/blocks', ...adminWrite, async (request, response) => {
  const id = idFrom(request)
  const input = resourceBlockCreateSchema.parse(request.body)
  if (input.endAt <= new Date()) throw new HttpError(400, 'A campus block must end in the future.')

  const block = await prisma.$transaction(async (transaction) => {
    await lockResource(transaction, id)
    const resource = await transaction.resource.findUnique({ where: { id }, select: { isDemo: true, status: true } })
    if (!resource || resource.isDemo || resource.status === 'ARCHIVED') {
      throw new HttpError(409, 'Campus blocks can only be added to current college resources.')
    }

    const heldBooking = await transaction.reservationOccurrence.count({
      where: {
        resourceId: id,
        status: { in: ['PENDING', 'APPROVED'] },
        blockedStartAt: { lt: input.endAt },
        blockedEndAt: { gt: input.startAt },
      },
    })
    if (heldBooking > 0) {
      throw new HttpError(409, 'A pending or approved booking already uses part of this time. Resolve that booking before blocking the venue.')
    }

    const overlappingBlock = await transaction.resourceBlock.count({
      where: { resourceId: id, startAt: { lt: input.endAt }, endAt: { gt: input.startAt } },
    })
    if (overlappingBlock > 0) throw new HttpError(409, 'Another campus block already covers part of this time.')

    const created = await transaction.resourceBlock.create({
      data: { resourceId: id, createdById: request.auth!.user.id, ...input },
    })
    await audit(transaction, request, 'RESOURCE_BLOCK_CREATED', id, {
      blockId: created.id,
      type: created.type,
      reason: created.reason,
      startAt: created.startAt.toISOString(),
      endAt: created.endAt.toISOString(),
    })
    return created
  }, { isolationLevel: 'Serializable' })

  response.status(201).json({ status: 'ok', data: block })
})

resourceRouter.delete('/:id/blocks/:blockId', ...adminWrite, async (request, response) => {
  const id = idFrom(request)
  const blockId = z.uuid().parse(request.params.blockId)
  await prisma.$transaction(async (transaction) => {
    await lockResource(transaction, id)
    const block = await transaction.resourceBlock.findFirst({ where: { id: blockId, resourceId: id } })
    if (!block) throw new HttpError(404, 'Campus block not found.')
    await transaction.resourceBlock.delete({ where: { id: block.id } })
    await audit(transaction, request, 'RESOURCE_BLOCK_REMOVED', id, {
      blockId: block.id,
      type: block.type,
      reason: block.reason,
      startAt: block.startAt.toISOString(),
      endAt: block.endAt.toISOString(),
    })
  }, { isolationLevel: 'Serializable' })
  response.json({ status: 'ok', data: { id: blockId } })
})

resourceRouter.post('/:id/photos', ...adminWrite, raw({ type: 'image/jpeg', limit: MAX_PHOTO_BYTES, inflate: false }), async (request, response) => {
  const id = idFrom(request)
  const revision = z.coerce.number().pipe(revisionSchema).parse(request.get('x-resource-revision'))
  const altText = z.string().trim().min(1).max(255).parse(request.query.alt)
  if (!request.is('image/jpeg') || !Buffer.isBuffer(request.body) || !inspectJpeg(request.body)) {
    throw new HttpError(400, 'Upload a valid JPEG photo up to 3 MB and 4096 pixels per side.')
  }
  await getResource(id, request.auth?.user.role)
  const filename = `${randomUUID()}.jpg`
  const filePath = resolve(uploadDirectory, filename)
  await mkdir(uploadDirectory, { recursive: true })
  await writeFile(filePath, request.body, { flag: 'wx', mode: 0o600 })
  let committed = false
  try {
    const resource = await prisma.$transaction(async (transaction) => {
      await claimRevision(transaction, id, revision)
      const photos = await transaction.resourceImage.findMany({ where: { resourceId: id }, select: { sortOrder: true } })
      if (photos.length >= MAX_PHOTOS) throw new HttpError(400, `A resource can have up to ${MAX_PHOTOS} photos.`)
      const created = await transaction.resourceImage.create({ data: {
        resourceId: id,
        url: `/api/resource-images/${filename}`,
        altText,
        sortOrder: photos.reduce((highest, photo) => Math.max(highest, photo.sortOrder), -1) + 1,
      } })
      await audit(transaction, request, 'RESOURCE_PHOTO_ADDED', id, { imageId: created.id })
      return transaction.resource.findUniqueOrThrow({ where: { id }, include: includeImages })
    })
    committed = true
    response.status(201).json({ status: 'ok', data: resource })
  } finally {
    // Only roll back the newly written file if its database write failed.
    if (!committed) await unlink(filePath).catch(() => { request.log.warn('An unattached resource photo needs storage cleanup.') })
  }
})

resourceRouter.patch('/:id/photos/:photoId', ...adminWrite, async (request, response) => {
  const id = idFrom(request)
  const photoId = z.uuid().parse(request.params.photoId)
  const input = z.object({ revision: revisionSchema, altText: z.string().trim().min(1).max(255), cover: z.boolean() }).strict().parse(request.body)
  const resource = await prisma.$transaction(async (transaction) => {
    await claimRevision(transaction, id, input.revision)
    const photos = await transaction.resourceImage.findMany({ where: { resourceId: id }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
    if (!photos.some((photo) => photo.id === photoId)) throw new HttpError(404, 'Photo not found.')
    await transaction.resourceImage.update({ where: { id: photoId }, data: { altText: input.altText } })
    if (input.cover) {
      const ordered = [photoId, ...photos.filter((photo) => photo.id !== photoId).map((photo) => photo.id)]
      for (const [sortOrder, imageId] of ordered.entries()) {
        await transaction.resourceImage.update({ where: { id: imageId }, data: { sortOrder } })
      }
    }
    await audit(transaction, request, 'RESOURCE_PHOTO_UPDATED', id, { imageId: photoId, cover: input.cover })
    return transaction.resource.findUniqueOrThrow({ where: { id }, include: includeImages })
  })
  response.json({ status: 'ok', data: resource })
})

resourceRouter.delete('/:id/photos/:photoId', ...adminWrite, async (request, response) => {
  const id = idFrom(request)
  const photoId = z.uuid().parse(request.params.photoId)
  const { revision } = z.object({ revision: revisionSchema }).strict().parse(request.body)
  const resource = await prisma.$transaction(async (transaction) => {
    await claimRevision(transaction, id, revision)
    const photo = await transaction.resourceImage.findFirst({ where: { id: photoId, resourceId: id } })
    if (!photo) throw new HttpError(404, 'Photo not found.')
    await transaction.resourceImage.delete({ where: { id: photo.id } })
    await audit(transaction, request, 'RESOURCE_PHOTO_REMOVED', id, { imageId: photo.id, retainedUrl: photo.url })
    return transaction.resource.findUniqueOrThrow({ where: { id }, include: includeImages })
  })
  // Retain the bytes for recovery; the authenticated serving route immediately
  // stops exposing a file when its ResourceImage record has been removed.
  response.json({ status: 'ok', data: resource })
})

resourceImageRouter.get('/:filename', async (request, response, next) => {
  const filename = z.string().regex(photoFilenamePattern).parse(request.params.filename)
  const photo = await prisma.resourceImage.findFirst({
    where: { url: `/api/resource-images/${filename}` },
    select: { resource: { select: { status: true, isDemo: true } } },
  })
  if (!photo || !canViewResource(request.auth?.user.role, photo.resource)) {
    throw new HttpError(404, 'Photo not found.')
  }
  response.setHeader('Content-Type', 'image/jpeg')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Content-Disposition', 'inline')
  response.sendFile(filename, { root: uploadDirectory, dotfiles: 'deny', cacheControl: false, acceptRanges: false }, (error) => {
    if (error) next(error)
  })
})
