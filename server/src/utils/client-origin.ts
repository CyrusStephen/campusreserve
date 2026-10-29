import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { HttpError } from './http-error.js'

const configuredClientOrigin = new URL(env.CLIENT_ORIGIN).origin

function isPrivateDevelopmentHost(hostname: string) {
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
}

export function isAllowedClientOrigin(origin: string) {
  if (origin === configuredClientOrigin) return true
  if (env.NODE_ENV !== 'development') return false

  try {
    const url = new URL(origin)
    return (url.protocol === 'http:' || url.protocol === 'https:') &&
      isPrivateDevelopmentHost(url.hostname)
  } catch {
    return false
  }
}

export const requireClientOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin')
  if (!origin || !isAllowedClientOrigin(origin)) {
    throw new HttpError(403, 'This request origin is not allowed.')
  }

  next()
}
