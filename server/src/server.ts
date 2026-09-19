import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { startEmailWorker } from './utils/email.js'
import { startWaitlistWorker } from './utils/waitlist-worker.js'
import { sendCriticalSupportAlert } from './utils/email.js'

async function startServer() {
  await prisma.$connect()
  console.log('PostgreSQL connection established.')

  const emailWorker = startEmailWorker((message, meta) => console.warn(message, meta ?? ''))
  const waitlistWorker = startWaitlistWorker((message, meta) => console.error(message, meta ?? ''))

  const server = app.listen(env.PORT, () => {
    console.log(
      `CampusReserve API running at http://localhost:${env.PORT}`,
    )
  })

  let shuttingDown = false

  function shutDown(signal: string) {
    if (shuttingDown) return
    shuttingDown = true

    console.log(`${signal} received. Closing the server.`)

    const timeout = setTimeout(() => {
      console.error('Shutdown timed out.')
      process.exit(1)
    }, 10_000)

    timeout.unref()

    clearInterval(emailWorker)
    clearInterval(waitlistWorker)
    server.close((error) => {
      void prisma.$disconnect()
        .then(() => {
          if (error) {
            console.error('Failed to close the server:', error)
          }

          process.exit(error ? 1 : 0)
        })
        .catch((disconnectError: unknown) => {
          console.error('Database disconnect failed:', disconnectError)
          process.exit(1)
        })
    })
  }

  process.on('SIGINT', () => shutDown('SIGINT'))
  process.on('SIGTERM', () => shutDown('SIGTERM'))
}

startServer().catch(async (error: unknown) => {
  console.error('Server startup failed:', error)
  void sendCriticalSupportAlert('Server startup failed', `CampusReserve could not start at ${new Date().toISOString()}. Check the server logs for the technical error.`).catch(() => undefined)

  try {
    await prisma.$disconnect()
  } finally {
    process.exit(1)
  }
})