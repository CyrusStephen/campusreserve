import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../utils/http-error.js'
import { sendCriticalSupportAlert } from '../utils/email.js'

let lastSupportAlertAt = 0

function alertSupport(message: string): void {
  const now = Date.now()
  if (now - lastSupportAlertAt < 5 * 60_000) return
  lastSupportAlertAt = now
  void sendCriticalSupportAlert('Unexpected application error', message).catch(() => undefined)
}

export const handleApiError: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) { next(error); return }
  response.setHeader('Cache-Control', 'no-store')
  if (error instanceof HttpError) {
    response.status(error.status).json({ status: 'error', message: error.message })
    return
  }
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    response.status(400).json({ status: 'error', message: issue ? `${issue.path.join('.') || 'Input'}: ${issue.message}` : 'Invalid input.' })
    return
  }
  const details = error !== null && typeof error === 'object' ? error as Record<string, unknown> : {}
  const status = details.status
  if (status === 413 || status === 415 || status === 400 || status === 404 || details.code === 'ENOENT') {
    const safeStatus = details.code === 'ENOENT' ? 404 : status as number
    const messages: Record<number, string> = { 400: 'Invalid request body.', 404: 'File not found.', 413: 'The uploaded file is too large.', 415: 'Unsupported request format.' }
    response.status(safeStatus).json({ status: 'error', message: messages[safeStatus] })
    return
  }
  if (details.code === 'P2034') {
    response.status(409).json({ status: 'error', message: 'Another edit happened at the same time. Reload and try again.' })
    return
  }
  if (details.code === 'P2004') {
    response.status(409).json({ status: 'error', message: 'That time is no longer available. Choose another time.' })
    return
  }
  // Do not log database error messages, bodies, URLs or credentials.
  const errorCode = typeof details.code === 'string' ? details.code : 'UNEXPECTED'
  request.log.error({ errorCode }, 'Resource request failed')
  alertSupport(`Error code: ${errorCode}\nMethod: ${request.method}\nTime: ${new Date().toISOString()}`)
  response.status(500).json({ status: 'error', message: 'The request could not be completed. Please try again.' })
}
