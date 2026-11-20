import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { env } from '../config/env.js'

export const signupVerificationLifetimeMs = 30 * 60_000
export const signupResendCooldownMs = 60_000

const signingKey = Buffer.from(hkdfSync(
  'sha256',
  Buffer.from(env.JWT_ACCESS_SECRET, 'hex'),
  'campusreserve-api',
  'signup-verification:v1',
  32,
))

function signature(value: string) {
  return createHmac('sha256', signingKey).update(value).digest()
}

export function readSignupToken(token: string): { id: string; expiresAt: Date } | null {
  const [id, timestamp, mac, extra] = token.split('.')
  if (!id || !z.uuid().safeParse(id).success || !timestamp || !/^\d{13}$/.test(timestamp)
    || !mac || !/^[a-f0-9]{64}$/.test(mac) || extra !== undefined) return null

  const expiresAt = new Date(Number(timestamp))
  if (expiresAt.getTime() <= Date.now()) return null
  if (!timingSafeEqual(Buffer.from(mac, 'hex'), signature(`${id}.${timestamp}`))) return null

  return { id, expiresAt }
}

export function signupVerificationMessage(verification: { id: string; email: string; expiresAt: Date }) {
  const value = `${verification.id}.${verification.expiresAt.getTime()}`
  const link = new URL('/verify-email', env.CLIENT_ORIGIN)
  // The fragment stays in the browser. Completing registration requires a
  // separate form submission, so opening a link will never consume it.
  link.hash = `token=${value}.${signature(value).toString('hex')}`
  const subject = 'Verify your CampusReserve email'
  const intro = 'Open this link to verify your college email and choose your CampusReserve password.'
  const followUp = 'The link expires 30 minutes after it is issued. If you did not request a CampusReserve account, you can ignore this email.'
  return {
    to: verification.email,
    subject,
    text: `${intro}\n\n${link.href}\n\n${followUp}\n\nCampusReserve`,
    html: `<h2>${subject}</h2><p>${intro}</p><p><a href="${link.href}">Verify email and set password</a></p><p>${followUp}</p>`,
  }
}
