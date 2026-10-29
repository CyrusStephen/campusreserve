import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
const landingUrl = moduleUrl(await readFile(new URL('../src/auth/landing.ts', import.meta.url), 'utf8'))
const source = (await readFile(new URL('../src/auth/login-destination.ts', import.meta.url), 'utf8'))
  .replace("'./landing'", JSON.stringify(landingUrl))
const { loginDestination } = await import(moduleUrl(source))
const user = (role) => ({ id: role, role, name: 'Test User', email: 'test@example.invalid', departmentId: null })

test('administrator switching from Security Desk lands in their own workspace', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    assert.equal(loginDestination(user(role), 'security', undefined), '/app')
    assert.equal(loginDestination(user(role), 'security', '/app/security'), '/app')
  }
})

test('every role has a suitable landing page after credential login', () => {
  for (const role of ['FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN']) {
    assert.equal(loginDestination(user(role), null, undefined), '/app')
  }
  assert.equal(loginDestination(user('SECURITY'), null, undefined), '/app/security')
  assert.equal(loginDestination(user('CANTEEN_STAFF'), null, undefined), '/app/canteen/manage')
})

test('restricted roles cannot inherit another role destination', () => {
  assert.equal(loginDestination(user('SECURITY'), 'canteen', '/app/manage/bookings'), '/app/security')
  assert.equal(loginDestination(user('CANTEEN_STAFF'), 'security', '/app/manage/resources'), '/app/canteen/manage')
  assert.equal(loginDestination(user('FACULTY'), null, '/app/manage/bookings'), '/app')
})

test('valid destinations survive while external redirects are rejected', () => {
  assert.equal(loginDestination(user('ADMIN'), null, '/app/manage/bookings'), '/app/manage/bookings')
  assert.equal(loginDestination(user('FACULTY'), null, '/app/bookings'), '/app/bookings')
  const resource = '/app/resources/12345678-1234-4234-9234-123456789012'
  assert.equal(loginDestination(user('FACULTY'), null, resource), resource)
  assert.equal(loginDestination(user('FACULTY'), 'canteen', undefined), '/app/canteen')
  assert.equal(loginDestination(user('FACULTY'), null, '//example.invalid'), '/app')
  assert.equal(loginDestination(user('FACULTY'), null, 'https://example.invalid'), '/app')
})
