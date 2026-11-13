import test from 'node:test'
import assert from 'node:assert/strict'
import { allowedWorkspace, forgetWorkspace, lastWorkspace, rememberWorkspace } from '../src/auth/landing.ts'

const entries = new Map()
globalThis.window = { localStorage: {
  getItem: (key) => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, value),
  removeItem: (key) => entries.delete(key),
} }
const user = (id, role) => ({ id, role })

test('security returns to its last permitted page and cannot reopen admin pages', () => {
  const guard = user('guard', 'SECURITY')
  assert.equal(lastWorkspace(guard), '/app/security')
  rememberWorkspace(guard, '/app/profile')
  assert.equal(lastWorkspace(guard), '/app/profile')
  rememberWorkspace(guard, '/app/manage/bookings')
  assert.equal(lastWorkspace(guard), '/app/profile')
  forgetWorkspace(guard)
  assert.equal(lastWorkspace(guard), '/app/security')
})

test('last page is isolated per account and checked against role', () => {
  const faculty = user('faculty', 'FACULTY')
  const admin = user('admin', 'ADMIN')
  rememberWorkspace(faculty, '/app/bookings')
  rememberWorkspace(admin, '/app/manage/bookings')
  assert.equal(lastWorkspace(faculty), '/app/bookings')
  assert.equal(lastWorkspace(admin), '/app/manage/bookings')
  assert.equal(allowedWorkspace(faculty, '/app/manage/bookings'), false)
  assert.equal(allowedWorkspace(user('faculty', 'SECURITY'), '/app/bookings'), false)
  forgetWorkspace(faculty); forgetWorkspace(admin)
})
