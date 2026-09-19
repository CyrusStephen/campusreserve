import { hkdfSync, randomBytes, randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from '../utils/tokens.js'

// Mount at /api/auth after express.json() and cookieParser().
export const authRouter = Router()

const trustedOrigin = new URL(env.CLIENT_ORIGIN).origin
const refreshCookieName = 'campusreserve_refresh'

// Derive a separate signing key without adding another .env value.
// A signed session ID lets us identify and revoke the session when an older
// refresh token is replayed, without storing token history or raw tokens.
const refreshSigningKey = Buffer.from(
  hkdfSync(
    'sha256',
    Buffer.from(env.JWT_ACCESS_SECRET, 'hex'),
    'campusreserve-api',
    'refresh-token-signing:v1',
    32,
  ),
)

// Suitable for localhost and a same-site frontend/API deployment.
// Revisit the cookie policy if production uses different sites.
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
} as const

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  // Validate the supplied password without trimming or truncating it.
  password: z.string().min(1).max(1_024),
})

// The default store is per process. Review proxy configuration and a shared
// store before deploying multiple API instances. Do not set trust proxy=true.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again later.',
  },
})

const sessionLimiter = rateLimit({
  windowMs: 60 * 1_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many session requests. Please try again shortly.',
  },
})

function createSessionRefreshToken(
  sessionId: string,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ jti: createRefreshToken() })
    .setProtectedHeader({ alg: 'HS256', typ: 'rt+jwt' })
    .setSubject(sessionId)
    .setIssuer('campusreserve-api')
    .setAudience('campusreserve-refresh')
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
    .sign(refreshSigningKey)
}

async function readRefreshSessionId(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length > 2_048) return null

  try {
    const { payload } = await jwtVerify(token, refreshSigningKey, {
      algorithms: ['HS256'],
      typ: 'rt+jwt',
      issuer: 'campusreserve-api',
      audience: 'campusreserve-refresh',
      requiredClaims: ['sub', 'jti', 'iat', 'exp'],
      maxTokenAge: REFRESH_TOKEN_TTL_MS / 1_000,
    })

    if (
      typeof payload.sub !== 'string' ||
      !z.uuid().safeParse(payload.sub).success ||
      typeof payload.jti !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(payload.jti)
    ) {
      return null
    }

    return payload.sub
  } catch {
    return null
  }
}

function readRefreshCookie(request: Request): unknown {
  return request.cookies?.[refreshCookieName]
}

function invalidSession(response: Response): void {
  // Do not clear cookies on failed refresh requests: a late failure must not
  // overwrite the cookie from a concurrent successful login.
  response.status(401).json({
    status: 'error',
    message: 'Please log in to continue.',
  })
}

async function revokeSession(sessionId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

let dummyPasswordHash: Promise<string> | undefined

function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword(
    randomBytes(32).toString('hex'),
  ).catch((error: unknown) => {
    dummyPasswordHash = undefined
    throw error
  })

  return dummyPasswordHash
}

function invalidCredentials(response: Response): void {
  response.status(401).json({
    status: 'error',
    message: 'Invalid email or password.',
  })
}

authRouter.use((request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')

  // CORS alone does not prevent cookie-based CSRF, including login CSRF.
  // Browser mutations must come from our configured frontend origin.
  // CLI tests must also explicitly send the matching Origin header.
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    request.get('origin') !== trustedOrigin
  ) {
    response.status(403).json({
      status: 'error',
      message: 'This request origin is not allowed.',
    })
    return
  }

  next()
})

authRouter.post('/login', loginLimiter, async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({
      status: 'error',
      message: 'Send login details as application/json.',
    })
    return
  }

  const input = loginSchema.safeParse(request.body)

  if (!input.success) {
    response.status(400).json({
      status: 'error',
      message: 'Enter a valid email address and password.',
    })
    return
  }

  try {
    // Run password verification even when the email is not in the database.
    // Await initialization on every path so the first valid login also pays
    // the one-time cost. This is not a real account or a reusable credential.
    const fallbackHash = await getDummyPasswordHash()

    // Account provisioning must also store normalized, lowercase emails.
    const user = await prisma.user.findUnique({
      where: { email: input.data.email },
      select: { id: true, passwordHash: true, status: true },
    })

    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? fallbackHash,
      input.data.password,
    )

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      invalidCredentials(response)
      return
    }

    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS)

    const refreshToken = await createSessionRefreshToken(sessionId, expiresAt)
    const refreshTokenHash = hashRefreshToken(refreshToken)

    // Sign before persisting: signing failure must not leave a new session.
    const accessToken = await createAccessToken(user.id, sessionId)

    const publicUser = await prisma.$transaction(async (transaction) => {
      // Recheck credentials/status under the update's row lock. If either
      // changed while Argon2 was running, do not create a session.
      const updated = await transaction.user.updateMany({
        where: {
          id: user.id,
          status: 'ACTIVE',
          passwordHash: user.passwordHash,
        },
        data: { lastLoginAt: now },
      })

      if (updated.count !== 1) return null

      const currentUser = await transaction.user.findUniqueOrThrow({
        where: { id: user.id },
        select: publicUserSelect,
      })

      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshTokenHash,
          expiresAt,
          lastUsedAt: now,
        },
      })

      return currentUser
    })

    if (!publicUser) {
      invalidCredentials(response)
      return
    }

    response.cookie(refreshCookieName, refreshToken, {
      ...refreshCookieOptions,
      expires: expiresAt,
    })

    response.status(200).json({
      status: 'ok',
      data: {
        user: publicUser,
        accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
    })
  } catch (error: unknown) {
    // Do not serialize request bodies, token values, or database arguments.
    request.log.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Login could not be completed',
    )

    response.status(503).json({
      status: 'error',
      message: 'Login is temporarily unavailable. Please try again later.',
    })
  }
})

authRouter.post('/refresh', sessionLimiter, async (request, response) => {
  const refreshToken = readRefreshCookie(request)
  const sessionId = await readRefreshSessionId(refreshToken)

  if (!sessionId || typeof refreshToken !== 'string') {
    invalidSession(response)
    return
  }

  try {
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: { ...publicUserSelect, status: true },
        },
      },
    })

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== 'ACTIVE'
    ) {
      invalidSession(response)
      return
    }

    const presentedHash = hashRefreshToken(refreshToken)

    if (session.refreshTokenHash !== presentedHash) {
      // The signature is valid, but this is not the current token: revoke
      // this session, including its current refresh token and access JWTs.
      await revokeSession(session.id)
      invalidSession(response)
      return
    }

    // Retain the original seven-day deadline; refresh does not extend it.
    const nextRefreshToken = await createSessionRefreshToken(
      session.id,
      session.expiresAt,
    )
    const accessToken = await createAccessToken(session.userId, session.id)

    // One atomic compare-and-swap. Only the current, active token can rotate.
    // A concurrent logout or account deactivation must not revive a session.
    const rotated = await prisma.authSession.updateMany({
      where: {
        id: session.id,
        userId: session.userId,
        refreshTokenHash: presentedHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { is: { status: 'ACTIVE' } },
      },
      data: {
        refreshTokenHash: hashRefreshToken(nextRefreshToken),
        lastUsedAt: new Date(),
      },
    })

    if (rotated.count !== 1) {
      // Strict replay handling also covers two requests racing with the
      // same token. The frontend must serialize refreshes across tabs.
      await revokeSession(session.id)
      invalidSession(response)
      return
    }

    response.cookie(refreshCookieName, nextRefreshToken, {
      ...refreshCookieOptions,
      expires: session.expiresAt,
    })

    response.status(200).json({
      status: 'ok',
      data: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          departmentId: session.user.departmentId,
        },
        accessToken,
        tokenType: 'Bearer',
        expiresIn: Math.min(
          ACCESS_TOKEN_TTL_SECONDS,
          Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1_000)),
        ),
      },
    })
  } catch (error: unknown) {
    request.log.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Session refresh could not be completed',
    )

    response.status(503).json({
      status: 'error',
      message: 'Authentication is temporarily unavailable. Please try again later.',
    })
  }
})

authRouter.post('/logout', sessionLimiter, async (request, response) => {
  try {
    const sessionIds = new Set<string>()
    const cookieSessionId = await readRefreshSessionId(readRefreshCookie(request))

    if (cookieSessionId) sessionIds.add(cookieSessionId)

    // Also allow the current access JWT to identify a session when the
    // refresh cookie is missing. Never read session IDs from the body.
    const accessToken = request
      .get('authorization')
      ?.match(/^Bearer\s+(\S+)$/i)?.[1]

    if (accessToken) {
      try {
        const claims = await verifyAccessToken(accessToken)
        if (z.uuid().safeParse(claims.sessionId).success) {
          sessionIds.add(claims.sessionId)
        }
      } catch {
        // An invalid JWT is not proof of another session's identity.
      }
    }

    if (sessionIds.size > 0) {
      await prisma.authSession.updateMany({
        where: { id: { in: [...sessionIds] }, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }

    response.clearCookie(refreshCookieName, refreshCookieOptions)
    response.status(204).end()
  } catch (error: unknown) {
    request.log.error(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Logout could not be completed',
    )

    // Preserve the cookie on database failure so logout can be retried.
    response.status(503).json({
      status: 'error',
      message: 'Logout could not be completed. Please try again.',
    })
  }
})

authRouter.get('/me', requireAuth, (request, response) => {
  if (!request.auth) {
    response.setHeader('WWW-Authenticate', 'Bearer')
    response.status(401).json({
      status: 'error',
      message: 'Please log in to continue.',
    })
    return
  }

  response.status(200).json({
    status: 'ok',
    data: { user: request.auth.user },
  })
})
