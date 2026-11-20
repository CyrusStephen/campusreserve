import { randomUUID } from 'node:crypto'
import { Router, type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { emailConfigured, enqueueEmail } from '../utils/email.js'
import { HttpError } from '../utils/http-error.js'
import { hashPassword } from '../utils/password.js'
import { readSignupToken, signupResendCooldownMs, signupVerificationLifetimeMs } from '../utils/signup-verification.js'

export const registrationRouter = Router()

const signupLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sign-up requests. Please try again later.' },
})

const collegeEmail = z.string().trim().toLowerCase().max(255).pipe(z.email())
  .refine((email) => email.endsWith('@sbcollege.ac.in'), 'Use your official @sbcollege.ac.in email address.')

const verifySchema = z.object({
  token: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(120),
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
}).strict()

const reviewSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('APPROVE'),
    role: z.enum(['FACULTY', 'STAFF', 'CANTEEN_STAFF', 'SECURITY']),
    departmentId: z.uuid().nullable(),
  }).strict(),
  z.object({ decision: z.literal('REJECT') }).strict(),
])

const requireJson: RequestHandler = (request, _response, next) => {
  if (!request.is('application/json')) throw new HttpError(415, 'Send registration details as application/json.')
  next()
}

registrationRouter.post('/signup', signupLimiter, requireJson, async (request, response) => {
  const { email } = z.object({ email: collegeEmail }).strict().parse(request.body)
  if (!emailConfigured()) throw new HttpError(503, 'Sign-up email is temporarily unavailable. Please try again later.')

  const now = new Date()
  const cooldownBefore = new Date(now.getTime() - signupResendCooldownMs)
  const newExpiry = new Date(now.getTime() + signupVerificationLifetimeMs)

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) return

    // The one row per email serializes concurrent resend requests. An existing
    // link stays valid until its original expiry, even if another copy is sent.
    const [verification] = await transaction.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "SignupVerification" AS verification ("id", "email", "lastRequestedAt", "expiresAt")
      VALUES (${randomUUID()}::uuid, ${email}, ${now}, ${newExpiry})
      ON CONFLICT ("email") DO UPDATE
        SET "lastRequestedAt" = EXCLUDED."lastRequestedAt",
            "expiresAt" = CASE WHEN verification."expiresAt" <= EXCLUDED."lastRequestedAt"
              THEN EXCLUDED."expiresAt" ELSE verification."expiresAt" END
      WHERE verification."lastRequestedAt" <= ${cooldownBefore}
      RETURNING "id"
    `
    if (!verification) return

    // A completed verification can have created the user while the upsert waited.
    const registered = await transaction.user.findUnique({ where: { email }, select: { id: true } })
    if (registered) {
      await transaction.signupVerification.delete({ where: { id: verification.id } })
      return
    }

    await transaction.emailDelivery.deleteMany({
      where: { signupVerificationId: verification.id, status: { in: ['PENDING', 'FAILED'] } },
    })
    await transaction.emailDelivery.create({
      data: {
        to: email,
        subject: 'Verify your CampusReserve email',
        textBody: 'CampusReserve email verification',
        signupVerificationId: verification.id,
        createdAt: now,
      },
    })
  })

  response.status(202).json({
    status: 'ok',
    message: 'If this address can register, a verification email will arrive shortly.',
  })
})

registrationRouter.post('/signup/verify', signupLimiter, requireJson, async (request, response) => {
  const input = verifySchema.parse(request.body)
  const invalidLink = new HttpError(410, 'This link has expired or was already used. Request a new verification email or sign in.')
  const claim = readSignupToken(input.token)
  if (!claim) throw invalidLink

  const verification = await prisma.signupVerification.findFirst({
    where: { id: claim.id, expiresAt: claim.expiresAt },
    select: { email: true },
  })
  if (!verification) throw invalidLink

  // Hash before locking the verification row. The emailed link holder is the
  // first person allowed to set a password for this registration.
  const passwordHash = await hashPassword(input.password)
  try {
    await prisma.$transaction(async (transaction) => {
      const verifiedAt = new Date()
      const consumed = await transaction.signupVerification.deleteMany({
        where: { id: claim.id, expiresAt: { equals: claim.expiresAt, gt: verifiedAt } },
      })
      if (consumed.count !== 1) throw invalidLink

      await transaction.user.create({
        data: {
          email: verification.email,
          name: input.name,
          signupDepartment: input.department,
          passwordHash,
          role: 'FACULTY',
          status: 'PENDING',
          emailVerifiedAt: verifiedAt,
        },
        select: { id: true },
      })
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new HttpError(409, 'An account already exists for this email. Please sign in.')
    }
    throw error
  }

  response.status(201).json({ status: 'ok', message: 'Email verified. Your account is awaiting administrator approval.' })
})

registrationRouter.use('/registrations', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'))

registrationRouter.get('/registrations', async (request, response) => {
  const page = z.coerce.number().int().min(1).max(10_000).default(1).parse(request.query.page)
  const pageSize = 25
  const where = { status: 'PENDING' as const, emailVerifiedAt: { not: null } }
  const [accounts, total, departments] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, signupDepartment: true, emailVerifiedAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  response.json({ status: 'ok', data: { accounts, departments, total, pageSize } })
})

registrationRouter.post('/registrations/:id/decision', requireJson, async (request, response) => {
  const id = z.uuid().parse(request.params.id)
  const input = reviewSchema.parse(request.body)
  const approved = input.decision === 'APPROVE'

  await prisma.$transaction(async (transaction) => {
    if (approved && input.departmentId) {
      const department = await transaction.department.findFirst({
        where: { id: input.departmentId, isActive: true },
        select: { id: true },
      })
      if (!department) throw new HttpError(400, 'Choose an active department.')
    }

    const reviewed = await transaction.user.updateMany({
      where: { id, status: 'PENDING', emailVerifiedAt: { not: null } },
      data: approved
        ? { status: 'ACTIVE', role: input.role, departmentId: input.departmentId }
        : { status: 'INACTIVE' },
    })
    if (reviewed.count !== 1) throw new HttpError(409, 'This account is no longer pending review.')
    const account = await transaction.user.findUniqueOrThrow({ where: { id }, select: { email: true } })

    await transaction.auditLog.create({
      data: {
        actorId: request.auth!.user.id,
        action: approved ? 'SIGNUP_APPROVED' : 'SIGNUP_REJECTED',
        entityType: 'User',
        entityId: id,
        metadata: approved ? { role: input.role, departmentId: input.departmentId } : {},
      },
    })
    const signInUrl = new URL('/login', env.CLIENT_ORIGIN).href
    await enqueueEmail(transaction, {
      to: account.email,
      subject: approved ? 'Your CampusReserve account is ready' : 'CampusReserve account request declined',
      text: approved
        ? `Your CampusReserve account has been approved. Sign in using the password you chose.\n\n${signInUrl}`
        : 'Your CampusReserve account request was declined. Please contact the college administrator if you need help.',
    })
  })

  response.json({ status: 'ok', message: approved ? 'Account approved.' : 'Account declined.' })
})
