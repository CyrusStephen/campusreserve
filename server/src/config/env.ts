import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z
    .string()
    .regex(
      /^[0-9a-f]{64}$/i,
      'JWT_ACCESS_SECRET must contain exactly 64 hexadecimal characters',
    ),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  CLIENT_ORIGIN: z
    .url()
    .default('http://localhost:5173'),
  RESOURCE_UPLOAD_DIR: z.string().trim().min(1).optional(),
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SMTP_USER: z.string().trim().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().email().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),
  SMTP_HELO_NAME: z.string().trim().min(1).default('campusreserve'),
  SMTP_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
})

const parsedEnvironment = environmentSchema.safeParse(process.env)

if (!parsedEnvironment.success) {
  console.error(
    'Invalid environment configuration:',
    parsedEnvironment.error.flatten().fieldErrors,
  )

  process.exit(1)
}

export const env = parsedEnvironment.data
