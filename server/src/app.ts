import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'

export const app = express()

app.disable('x-powered-by')

app.use(
  pinoHttp({
    quietReqLogger: true,
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

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'campusreserve-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

app.use((_request, response) => {
  response.status(404).json({
    status: 'error',
    message: 'API route not found',
  })
})