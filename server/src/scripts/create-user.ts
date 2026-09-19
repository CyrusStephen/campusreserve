import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { z } from 'zod'
import { prisma } from '../config/prisma.js'
import { hashPassword } from '../utils/password.js'

const roles = ['FACULTY', 'STAFF', 'CANTEEN_STAFF', 'ADMIN', 'SUPER_ADMIN'] as const
type Role = (typeof roles)[number]

const emailSchema = z.string().trim().toLowerCase().max(255).pipe(z.email())

function isRole(value: string): value is Role {
  return roles.some((role) => role === value)
}

async function readHidden(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) {
    throw new Error('A terminal is required for hidden password entry.')
  }

  stdout.write(label)
  stdin.setEncoding('utf8')
  stdin.setRawMode(true)
  stdin.resume()

  return new Promise<string>((resolve, reject) => {
    let value = ''
    let readingEscapeSequence = false

    function finish() {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
      stdout.write('\n')
    }

    function onData(chunk: string | Buffer) {
      for (const character of String(chunk)) {
        if (readingEscapeSequence) {
          if (/[A-Za-z~]/.test(character)) readingEscapeSequence = false
          continue
        }

        if (character === '\u001b') {
          readingEscapeSequence = true
          continue
        }

        if (character === '\u0003') {
          finish()
          reject(new Error('User creation cancelled.'))
          return
        }

        if (character === '\r' || character === '\n') {
          finish()
          resolve(value)
          return
        }

        if (character === '\u007f' || character === '\b') {
          if (value.length > 0) {
            value = Array.from(value).slice(0, -1).join('')
            stdout.write('\b \b')
          }
          continue
        }

        if (character >= ' ') {
          value += character
          stdout.write('*')
        }
      }
    }

    stdin.on('data', onData)
  })
}

async function collectInput() {
  const prompt = createInterface({ input: stdin, output: stdout })

  const name = (await prompt.question('Full name: ')).trim()
  const emailInput = await prompt.question('Email: ')
  const roleInput = (
    await prompt.question(
      'Role [FACULTY, STAFF, CANTEEN_STAFF, ADMIN, SUPER_ADMIN] (ADMIN): ',
    )
  )
    .trim()
    .toUpperCase()
  const departmentCode = (
    await prompt.question('Department code (optional): ')
  )
    .trim()
    .toUpperCase()

  prompt.close()

  const password = await readHidden('Password (12–128 characters): ')
  const confirmation = await readHidden('Confirm password: ')

  if (name.length < 2 || name.length > 120) {
    throw new Error('Name must contain between 2 and 120 characters.')
  }

  const parsedEmail = emailSchema.safeParse(emailInput)
  if (!parsedEmail.success) throw new Error('Enter a valid email address.')

  const role = roleInput || 'ADMIN'
  if (!isRole(role)) throw new Error('Select one of the listed roles.')

  if (password.length < 12 || password.length > 128) {
    throw new Error('Password must contain between 12 and 128 characters.')
  }

  if (password !== confirmation) throw new Error('Passwords do not match.')

  return {
    name,
    email: parsedEmail.data,
    role,
    departmentCode,
    password,
  }
}

async function main() {
  const input = await collectInput()
  await prisma.$connect()

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  if (existingUser) {
    throw new Error('A user with that email address already exists.')
  }

  let departmentId: string | null = null

  if (input.departmentCode) {
    const department = await prisma.department.findUnique({
      where: { code: input.departmentCode },
      select: { id: true, isActive: true },
    })

    if (!department || !department.isActive) {
      throw new Error('That department does not exist or is inactive.')
    }

    departmentId = department.id
  }

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        departmentId,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
      },
    })

    await transaction.auditLog.create({
      data: {
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: createdUser.id,
        metadata: {
          role: createdUser.role,
          method: 'operator-cli',
        },
      },
    })

    return createdUser
  })

  stdout.write(
    `Created ${user.name} (${user.email}) with role ${user.role}.\n`,
  )
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'User creation failed.'
    console.error(message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
