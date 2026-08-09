import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.PORT, () => {
  console.log(
    `CampusReserve API running at http://localhost:${env.PORT}`,
  )
})

function shutDown(signal: string) {
  console.log(`${signal} received. Closing the server.`)

  server.close((error) => {
    if (error) {
      console.error('Failed to close the server:', error)
      process.exit(1)
    }

    process.exit(0)
  })
}

process.on('SIGINT', () => shutDown('SIGINT'))
process.on('SIGTERM', () => shutDown('SIGTERM'))