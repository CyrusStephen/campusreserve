import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { authRouter } from './routes/auth.routes.js'
import { resourceRouter, resourceImageRouter } from './routes/resource.routes.js'
import { bookingRouter } from './routes/booking.routes.js'
import { notificationRouter } from './routes/notification.routes.js'
import { canteenRouter } from './routes/canteen.routes.js'
import { handleApiError } from './middleware/error.js'
import { sendCriticalSupportAlert } from './utils/email.js'

export const app = express()

app.disable('x-powered-by')

app.use(
  pinoHttp({
    quietReqLogger: true,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body',
      ],
      remove: true,
    },
  }),
)

app.use(helmet())

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
)

app.use(
  express.json({
    limit: '1mb',
  }),
)

app.use(cookieParser())
app.use('/api/auth', authRouter)
app.use('/api/resources', resourceRouter)
app.use('/api/resource-images', resourceImageRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/canteen', canteenRouter)

app.get('/api/health', async (request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    response.status(200).json({
      status: 'ok',
      service: 'campusreserve-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    request.log.error({ err: error }, 'Database health check failed')
    void sendCriticalSupportAlert('Database health check failed', `PostgreSQL did not respond to the CampusReserve health check at ${new Date().toISOString()}.`).catch(() => undefined)

    response.status(503).json({
      status: 'error',
      service: 'campusreserve-api',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    })
  }
})

app.use((_request, response) => {
  response.status(404).json({
    status: 'error',
    message: 'API route not found',
  })
})

app.use(handleApiError)
