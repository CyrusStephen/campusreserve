import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import type { Prisma } from '../generated/prisma/client.js'
import { signupVerificationLifetimeMs, signupVerificationMessage } from './signup-verification.js'

interface EmailPayload {
  to: string
  subject: string
  text: string
  html?: string
}

const sendTimeoutMs = 10_000
const lockTimeoutMs = 2 * 60_000
const maxAttempts = 8

const smtp = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
  ? nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    name: env.SMTP_HELO_NAME,
    tls: { rejectUnauthorized: env.NODE_ENV === 'production' || env.SMTP_REJECT_UNAUTHORIZED },
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: sendTimeoutMs,
    greetingTimeout: sendTimeoutMs,
    socketTimeout: sendTimeoutMs,
  })
  : null

export function emailConfigured(): boolean {
  return Boolean(env.MAIL_FROM && (env.RESEND_API_KEY || smtp))
}

export async function enqueueEmail(
  transaction: Prisma.TransactionClient,
  payload: EmailPayload,
): Promise<void> {
  await transaction.emailDelivery.create({
    data: { to: payload.to, subject: payload.subject, textBody: payload.text, htmlBody: payload.html ?? null },
  })
}

class MailDeliveryError extends Error {}

async function sendEmail(payload: EmailPayload, deliveryId?: string): Promise<void> {
  const from = env.MAIL_FROM
  if (!from) throw new MailDeliveryError('MAIL_FROM is required for email delivery.')

  if (env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(deliveryId ? { 'Idempotency-Key': `campusreserve/${deliveryId}` } : {}),
      },
      body: JSON.stringify({ ...payload, from: `CampusReserve <${from}>`, to: [payload.to] }),
      signal: AbortSignal.timeout(sendTimeoutMs),
      redirect: 'error',
    }).catch(() => { throw new MailDeliveryError('Could not reach the Resend email API.') })
    // The response body can contain recipient or sender details.
    void response.body?.cancel().catch(() => undefined)
    if (!response.ok) throw new MailDeliveryError(`Resend returned HTTP ${response.status}.`)
    return
  }

  if (!smtp) throw new MailDeliveryError('SMTP email delivery is not configured.')
  try {
    const result = await smtp.sendMail({
      ...payload,
      from: { name: 'CampusReserve', address: from },
      to: { name: '', address: payload.to },
    })
    if (!result.accepted.length) throw new MailDeliveryError('SMTP did not accept the recipient.')
  } catch (error) {
    if (error instanceof MailDeliveryError) throw error
    const code = error && typeof error === 'object' && 'responseCode' in error ? error.responseCode : null
    throw new MailDeliveryError(typeof code === 'number' ? `SMTP returned code ${code}.` : 'Could not deliver via SMTP.')
  }
}

type Delivery = {
  id: string
  to: string
  subject: string
  textBody: string
  htmlBody: string | null
  signupVerificationId: string | null
  createdAt: Date
  attempts: number
}

async function claimDelivery() {
  const [record] = await prisma.$queryRaw<Delivery[]>`
    WITH next_delivery AS (
      SELECT "id" FROM "EmailDelivery"
      WHERE "attempts" < ${maxAttempts}
        AND (
          ("status" IN ('PENDING', 'FAILED') AND "nextAttemptAt" <= CURRENT_TIMESTAMP)
          OR ("status" = 'SENDING' AND COALESCE("lockedAt", "updatedAt") <= CURRENT_TIMESTAMP - (${lockTimeoutMs}::int * INTERVAL '1 millisecond'))
        )
      ORDER BY ("signupVerificationId" IS NOT NULL) DESC, "nextAttemptAt", "createdAt", "id"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "EmailDelivery" AS delivery
    SET "status" = 'SENDING', "lockedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP, "attempts" = delivery."attempts" + 1
    FROM next_delivery
    WHERE delivery."id" = next_delivery."id"
    RETURNING delivery."id", delivery."to", delivery."subject", delivery."textBody",
              delivery."htmlBody", delivery."signupVerificationId", delivery."createdAt", delivery."attempts"
  `
  return record
}

async function deliver(record: Delivery, log: (message: string, meta?: unknown) => void) {
  const where = { id: record.id, status: 'SENDING' as const, attempts: record.attempts }
  let payload: EmailPayload = {
    to: record.to,
    subject: record.subject,
    text: record.textBody,
    ...(record.htmlBody ? { html: record.htmlBody } : {}),
  }

  if (record.signupVerificationId) {
    const verification = await prisma.signupVerification.findUnique({ where: { id: record.signupVerificationId } })
    if (!verification || verification.expiresAt.getTime() <= Date.now()
      || record.createdAt.getTime() < verification.expiresAt.getTime() - signupVerificationLifetimeMs) {
      await prisma.emailDelivery.deleteMany({ where })
      return
    }
    payload = signupVerificationMessage(verification)
  }

  try {
    await sendEmail(payload, record.id)
  } catch (error) {
    const message = error instanceof MailDeliveryError ? error.message : 'Email delivery failed.'
    const retryDelayMs = Math.min(32, 2 ** record.attempts) * 30_000
    const status = record.attempts >= maxAttempts ? 'FAILED' : 'PENDING'
    await prisma.$executeRaw`
      UPDATE "EmailDelivery"
      SET "status" = ${status}::"EmailDeliveryStatus", "lockedAt" = NULL, "lastError" = ${message},
          "nextAttemptAt" = CURRENT_TIMESTAMP + (${retryDelayMs}::int * INTERVAL '1 millisecond'),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}::uuid AND "status" = 'SENDING' AND "attempts" = ${record.attempts}
    `
    log('Email delivery failed', { deliveryId: record.id, error: message })
    return
  }

  await prisma.emailDelivery.updateMany({
    where,
    data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null },
  })
}

export function startEmailWorker(log: (message: string, meta?: unknown) => void): NodeJS.Timeout | undefined {
  if (!emailConfigured()) {
    log('Email delivery is disabled until a mail sender is configured.')
    return
  }
  let running = false
  let nextCleanupAt = 0

  async function run() {
    if (running) return
    running = true
    try {
      const now = Date.now()
      if (now >= nextCleanupAt) {
        await prisma.signupVerification.deleteMany({ where: { expiresAt: { lt: new Date(now - 24 * 60 * 60_000) } } })
        await prisma.emailDelivery.updateMany({
          where: { status: 'SENDING', attempts: { gte: maxAttempts }, updatedAt: { lte: new Date(now - lockTimeoutMs) } },
          data: { status: 'FAILED', lockedAt: null, lastError: 'Delivery was interrupted on its final attempt.' },
        })
        nextCleanupAt = now + 60 * 60_000
      }
      for (let sent = 0; sent < 10; sent += 1) {
        const delivery = await claimDelivery()
        if (!delivery) break
        await deliver(delivery, log)
      }
    } catch (error) {
      // Keep polling through database disconnects without logging email contents.
      log('Email queue could not be processed', { errorType: error instanceof Error ? error.name : 'UnknownError' })
    } finally {
      running = false
    }
  }

  void run()
  return setInterval(() => { void run() }, 5_000)
}

export async function sendCriticalSupportAlert(subject: string, message: string): Promise<void> {
  if (!emailConfigured() || !env.SUPPORT_EMAIL) return
  await sendEmail({ to: env.SUPPORT_EMAIL, subject: `[CampusReserve Alert] ${subject}`, text: message })
}
