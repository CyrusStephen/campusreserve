import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test, { after } from 'node:test'
import type { Request, Response } from 'express'
import type { UserRole } from '../src/generated/prisma/enums.js'

// Generated test-only configuration; these tests never connect to PostgreSQL.
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unused'
process.env.JWT_ACCESS_SECRET = randomBytes(32).toString('hex')
const { requireRoles } = await import('../src/middleware/auth.js')
const { prisma } = await import('../src/config/prisma.js')
after(async () => { await prisma.$disconnect() })

const roles: UserRole[] = ['FACULTY', 'STAFF', 'CANTEEN_STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN']
for (const [label, allowed] of [
  ['administration', ['ADMIN', 'SUPER_ADMIN']],
  ['booking creation', ['FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN']],
  ['security verification', ['SECURITY', 'ADMIN', 'SUPER_ADMIN']],
] as const) {
  test(`backend permission middleware checks all six roles for ${label}`, () => {
    for (const role of roles) {
      let nextCalled = false
      let status = 200
      const request = { auth: { user: { role } } } as Request
      const response = {
        status(code: number) { status = code; return this },
        json() { return this },
      } as unknown as Response
      requireRoles(...allowed)(request, response, () => { nextCalled = true })
      assert.equal(nextCalled, (allowed as readonly string[]).includes(role), role)
      assert.equal(status, nextCalled ? 200 : 403, role)
    }
  })
}

test('backend permission middleware rejects an absent authenticated identity', () => {
  let status = 200
  const response = {
    setHeader() { return this },
    status(code: number) { status = code; return this },
    json() { return this },
  } as unknown as Response
  requireRoles('ADMIN')({} as Request, response, () => assert.fail('Anonymous request passed'))
  assert.equal(status, 401)
})
