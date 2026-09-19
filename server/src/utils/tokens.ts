import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env.js'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1_000

const issuer = 'campusreserve-api'
const audience = 'campusreserve-web'
const signingKey = Buffer.from(env.JWT_ACCESS_SECRET, 'hex')

export function createAccessToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(
      Math.floor(Date.now() / 1_000) + ACCESS_TOKEN_TTL_SECONDS,
    )
    .sign(signingKey)
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; sessionId: string }> {
  const { payload } = await jwtVerify(token, signingKey, {
    algorithms: ['HS256'],
    typ: 'at+jwt',
    issuer,
    audience,
    requiredClaims: ['sub', 'sid', 'iat', 'exp'],
    maxTokenAge: ACCESS_TOKEN_TTL_SECONDS,
  })

  const sessionId = payload['sid']

  if (
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    typeof sessionId !== 'string' ||
    sessionId.length === 0
  ) {
    throw new Error('Invalid access token')
  }

  return { userId: payload.sub, sessionId }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}