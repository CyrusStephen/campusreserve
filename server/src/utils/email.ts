import net from 'node:net'
import tls from 'node:tls'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import type { Prisma } from '../generated/prisma/client.js'

interface EmailPayload {
  to: string
  subject: string
  text: string
  html?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function emailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM)
}

export async function enqueueEmail(
  transaction: Prisma.TransactionClient,
  payload: EmailPayload,
): Promise<void> {
  await transaction.emailDelivery.create({
    data: {
      to: payload.to,
      subject: payload.subject,
      textBody: payload.text,
      ...(payload.html ? { htmlBody: payload.html } : {}),
    },
  })
}

function smtpRead(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString()
      const lines = buffer.split('\r\n')
      const complete = lines.filter((line) => line.length > 0)
      if (complete.length === 0) return
      const last = complete[complete.length - 1]
      if (!last) return
      const match = last.match(/^(\d{3})([ -])/)
      if (!match) return
      if (match[2] === '-') return
      cleanup()
      resolve(buffer)
    }
    const onError = (error: Error) => { cleanup(); reject(error) }
    const cleanup = () => {
      socket.off('data', onData)
      socket.off('error', onError)
    }
    socket.on('data', onData)
    socket.once('error', onError)
  })
}

async function smtpCommand(socket: net.Socket | tls.TLSSocket, command: string, expected: number[] = [250]): Promise<void> {
  socket.write(`${command}\r\n`)
  const response = await smtpRead(socket)
  const code = Number(response.slice(0, 3))
  if (!expected.includes(code)) throw new Error(`SMTP command failed with code ${code}`)
}

function socketConnect(): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: env.SMTP_HOST!, port: env.SMTP_PORT! })
    socket.once('connect', () => resolve(socket))
    socket.once('error', reject)
  })
}

function tlsConnect(socket: net.Socket): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: env.SMTP_HOST!,
      rejectUnauthorized: env.SMTP_REJECT_UNAUTHORIZED,
    })
    secureSocket.once('secureConnect', () => resolve(secureSocket))
    secureSocket.once('error', reject)
  })
}

async function sendSmtpEmail(payload: EmailPayload): Promise<void> {
  if (!emailConfigured()) throw new Error('SMTP email delivery is not configured.')
  let socket: net.Socket | tls.TLSSocket = env.SMTP_SECURE ? await new Promise<tls.TLSSocket>((resolve, reject) => {
    const secure = tls.connect({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT!,
      servername: env.SMTP_HOST!,
      rejectUnauthorized: env.SMTP_REJECT_UNAUTHORIZED,
    })
    secure.once('secureConnect', () => resolve(secure))
    secure.once('error', reject)
  }) : await socketConnect()

  try {
    await smtpRead(socket)
    await smtpCommand(socket, `EHLO ${env.SMTP_HELO_NAME}`, [250])
    if (!env.SMTP_SECURE) {
      await smtpCommand(socket, 'STARTTLS', [220])
      socket = await tlsConnect(socket as net.Socket)
      await smtpCommand(socket, `EHLO ${env.SMTP_HELO_NAME}`, [250])
    }
    await smtpCommand(socket, 'AUTH LOGIN', [334])
    await smtpCommand(socket, Buffer.from(env.SMTP_USER!).toString('base64'), [334])
    await smtpCommand(socket, Buffer.from(env.SMTP_PASSWORD!).toString('base64'), [235])
    await smtpCommand(socket, `MAIL FROM:<${env.MAIL_FROM}>`, [250])
    await smtpCommand(socket, `RCPT TO:<${payload.to}>`, [250, 251])
    await smtpCommand(socket, 'DATA', [354])

    const boundary = `CampusReserve_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const headers = [
      `From: ${env.MAIL_FROM}`,
      `To: ${payload.to}`,
      `Subject: ${payload.subject.replaceAll(/\r|\n/g, ' ')}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].join('\r\n')
    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      payload.text,
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      payload.html ?? `<p>${escapeHtml(payload.text).replaceAll('\n', '<br>')}</p>`,
      `--${boundary}--`,
      '',
    ].join('\r\n')
    socket.write(`${headers}\r\n\r\n${body.replaceAll('\n', '\r\n')}\r\n.\r\n`)
    const response = await smtpRead(socket)
    if (Number(response.slice(0, 3)) !== 250) throw new Error('SMTP server did not accept the message.')
    await smtpCommand(socket, 'QUIT', [221])
  } finally {
    socket.end()
  }
}

let workerRunning = false
let configWarningShown = false

export function startEmailWorker(log: (message: string, meta?: unknown) => void): NodeJS.Timeout {
  const run = async () => {
    if (workerRunning || !emailConfigured()) {
      if (!emailConfigured() && !configWarningShown) {
        configWarningShown = true
        log('Email delivery is disabled until SMTP settings are configured.')
      }
      return
    }
    workerRunning = true
    try {
      const deliveryIds = await prisma.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "EmailDelivery"
          WHERE "status" IN ('PENDING', 'FAILED')
            AND "nextAttemptAt" <= NOW()
          ORDER BY "createdAt" ASC
          LIMIT 10
          FOR UPDATE SKIP LOCKED
        `
        if (rows.length > 0) {
          await transaction.emailDelivery.updateMany({
            where: { id: { in: rows.map((row) => row.id) } },
            data: { status: 'SENDING', lockedAt: new Date(), attempts: { increment: 1 } },
          })
        }
        return rows.map((row) => row.id)
      })
      for (const deliveryId of deliveryIds) {
        try {
          const record = await prisma.emailDelivery.findUniqueOrThrow({ where: { id: deliveryId } })
          await sendSmtpEmail({
            to: record.to,
            subject: record.subject,
            text: record.textBody,
            ...(record.htmlBody ? { html: record.htmlBody } : {}),
          })
          await prisma.emailDelivery.update({
            where: { id: deliveryId },
            data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed.'
          const record = await prisma.emailDelivery.findUnique({ where: { id: deliveryId }, select: { attempts: true } })
          const attempts = record?.attempts ?? 1
          const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 5))
          await prisma.emailDelivery.update({
            where: { id: deliveryId },
            data: {
              status: attempts >= 8 ? 'FAILED' : 'PENDING',
              lockedAt: null,
              lastError: message,
              nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
            },
          })
          log('Email delivery failed', { deliveryId, error: message })
        }
      }
    } finally {
      workerRunning = false
    }
  }
  void run()
  return setInterval(() => { void run() }, 15_000)
}

export async function sendCriticalSupportAlert(
  subject: string,
  message: string,
): Promise<void> {
  if (!emailConfigured() || !env.SUPPORT_EMAIL) return
  await sendSmtpEmail({
    to: env.SUPPORT_EMAIL,
    subject: `[CampusReserve Alert] ${subject}`,
    text: message,
    html: `<div style="font-family:system-ui,sans-serif"><h2>CampusReserve system alert</h2><p>${escapeHtml(message).replaceAll('\n', '<br>')}</p></div>`,
  })
}
