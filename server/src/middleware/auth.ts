import type { RequestHandler, Response } from 'express'
import type { UserRole } from '../generated/prisma/enums.js'
import { prisma } from '../config/prisma.js'
import { verifyAccessToken } from '../utils/tokens.js'

export interface AuthContext {
  sessionId: string
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    departmentId: string | null
  }
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

function unauthorized(response: Response): void {
  response.setHeader('WWW-Authenticate', 'Bearer')
  response.status(401).json({
    status: 'error',
    message: 'Please log in to continue.',
  })
}

export const requireAuth: RequestHandler = async (
  request,
  response,
  next,
) => {
  const token = request
    .get('authorization')
    ?.match(/^Bearer\s+(\S+)$/i)?.[1]

  if (!token) {
    unauthorized(response)
    return
  }

  let claims: { userId: string; sessionId: string }

  try {
    claims = await verifyAccessToken(token)
  } catch {
    unauthorized(response)
    return
  }

  try {
    const session = await prisma.authSession.findFirst({
      where: {
        id: claims.sessionId,
        userId: claims.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { is: { status: 'ACTIVE' } },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
          },
        },
      },
    })

    if (!session) {
      unauthorized(response)
      return
    }

    request.auth = {
      sessionId: session.id,
      user: session.user,
    }
  } catch (error) {
    request.log.error({ err: error }, 'Session validation failed')

    response.status(503).json({
      status: 'error',
      message: 'Authentication is temporarily unavailable.',
    })
    return
  }

  next()
}

export function requireRoles(...roles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.auth) {
      unauthorized(response)
      return
    }

    if (!roles.includes(request.auth.user.role)) {
      response.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action.',
      })
      return
    }

    next()
  }
}