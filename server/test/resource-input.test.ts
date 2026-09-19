import assert from 'node:assert/strict'
import test from 'node:test'
import { resourceBlockCreateSchema, resourceCreateSchema, resourceQuerySchema, resourceUpdateSchema } from '../src/utils/resource-input.js'
import { adminCalendarQuerySchema, availabilityQuerySchema, bookingCancelSchema, bookingCreateSchema, bookingDecisionSchema, occurrenceRescheduleSchema } from '../src/utils/booking-input.js'
import { intervalTouchesWeekend, isWeekendInstant } from '../src/utils/campus-calendar.js'

const valid = {
  name: 'Example hall', type: 'HALL', status: 'INACTIVE', description: 'A test-only resource description.',
  building: 'Example building', location: 'Ground floor', capacity: 100,
  totalQuantity: 1, isExclusive: true, features: [], instructions: null, tourUrl: null,
  advanceBookingDays: 60, minimumNoticeHours: 1, maximumDurationMinutes: 480,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0, cancellationDeadlineHours: 24,
}
test('valid hall and optional public tour link', () => {
  assert.equal(resourceCreateSchema.safeParse(valid).success, true)
  assert.equal(resourceCreateSchema.safeParse({ ...valid, tourUrl: 'https://example.edu/tour' }).success, true)
})
test('trims names and descriptions', () => assert.equal(resourceCreateSchema.parse({ ...valid, name: '  Example hall  ' }).name, 'Example hall'))
test('allows shared equipment stock', () => assert.equal(resourceCreateSchema.safeParse({ ...valid, type: 'EQUIPMENT', capacity: null, isExclusive: false, totalQuantity: 10 }).success, true))
for (const [label, change] of Object.entries({
  'missing capacity': { capacity: null }, 'zero capacity': { capacity: 0 }, 'fractional capacity': { capacity: 1.5 },
  'shared hall': { isExclusive: false }, 'hall quantity greater than one': { totalQuantity: 2 },
  'empty name': { name: '' }, 'short description': { description: 'short' }, 'empty building': { building: ' ' },
  'negative buffer': { bufferBeforeMinutes: -1 }, 'negative notice': { minimumNoticeHours: -1 },
  'notice exceeds window': { minimumNoticeHours: 1440 }, 'cancellation exceeds window': { cancellationDeadlineHours: 1441 },
  'too long duration': { maximumDurationMinutes: 10081 }, 'too many features': { features: Array(21).fill('feature') },
  'unsafe tour': { tourUrl: 'javascript:alert(1)' }, 'HTML embed': { tourUrl: '<iframe src="https://example.com"></iframe>' },
  'equipment tour': { type: 'EQUIPMENT', tourUrl: 'https://example.edu/tour' },
  'demo flag injection': { isDemo: true }, 'id injection': { id: 'test' }, 'slug injection': { slug: 'test' },
  'image injection': { images: [] }, 'invalid enum': { status: 'DELETED' }, 'string numeric field': { capacity: '100' },
})) {
  test(`rejects ${label}`, () => assert.equal(resourceCreateSchema.safeParse({ ...valid, ...change }).success, false))
}
test('editing requires a positive revision', () => {
  assert.equal(resourceUpdateSchema.safeParse(valid).success, false)
  assert.equal(resourceUpdateSchema.safeParse({ ...valid, revision: 0 }).success, false)
  assert.equal(resourceUpdateSchema.safeParse({ ...valid, revision: 1 }).success, true)
})
test('list defaults use the real active catalogue', () => assert.equal(resourceQuerySchema.parse({}).scope, 'catalogue'))
test('list rejects arrays, invalid scopes and excessive page size', () => {
  for (const value of [{ pageSize: '1000' }, { q: ['a', 'b'] }, { scope: 'all-users' }, { page: '-1' }, { type: 'INVALID' }]) {
    assert.equal(resourceQuerySchema.safeParse(value).success, false)
  }
})

const validBooking = {
  resourceId: '64f21326-c783-4479-9e21-9293bea7d8e7',
  title: 'Department seminar',
  purpose: 'A curriculum planning seminar for the department.',
  expectedPeople: 30,
  notes: null,
  assignedToName: 'Programme Coordinator',
  assignedToEmail: 'coordinator@college.edu',
  assignedToPhone: '+91 98765 43210',
  occurrences: [{ startAt: '2026-09-10T10:00:00.000Z', endAt: '2026-09-10T11:00:00.000Z' }],
  quantity: 1,
}
test('accepts a valid single-occurrence booking request', () => assert.equal(bookingCreateSchema.safeParse(validBooking).success, true))
test('requires assigned-to contact details', () => {
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, assignedToName: undefined }).success, false)
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, assignedToEmail: 'bad-email' }).success, false)
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, assignedToPhone: 'abc' }).success, false)
})

test('rejects reversed booking times and injected fields', () => {
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, occurrences: [{ startAt: '2026-09-10T11:00:00.000Z', endAt: '2026-09-10T10:00:00.000Z' }] }).success, false)
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, status: 'APPROVED' }).success, false)
})
test('accepts custom dates and rejects overlapping occurrences', () => {
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, occurrences: [
    { startAt: '2026-09-10T10:00:00.000Z', endAt: '2026-09-10T11:00:00.000Z' },
    { startAt: '2026-09-17T12:00:00.000Z', endAt: '2026-09-17T13:00:00.000Z' },
  ] }).success, true)
  assert.equal(bookingCreateSchema.safeParse({ ...validBooking, occurrences: [
    { startAt: '2026-09-10T10:00:00.000Z', endAt: '2026-09-10T12:00:00.000Z' },
    { startAt: '2026-09-10T11:00:00.000Z', endAt: '2026-09-10T13:00:00.000Z' },
  ] }).success, false)
})
test('requires a reason for rejection and cancellation', () => {
  assert.equal(bookingDecisionSchema.safeParse({ decision: 'APPROVE', reason: null }).success, true)
  assert.equal(bookingDecisionSchema.safeParse({ decision: 'REJECT', reason: null }).success, false)
  assert.equal(bookingDecisionSchema.safeParse({ decision: 'REJECT', reason: 'Scheduling conflict' }).success, true)
  assert.equal(bookingCancelSchema.safeParse({ reason: '' }).success, false)
})

const availabilityQuery = {
  resourceId: validBooking.resourceId,
  from: '2026-09-10T00:00:00.000Z',
  to: '2026-09-17T00:00:00.000Z',
}
test('accepts a seven-day availability range', () => {
  const parsed = availabilityQuerySchema.parse(availabilityQuery)
  assert.equal(parsed.from instanceof Date, true)
  assert.equal(parsed.to instanceof Date, true)
})
test('rejects invalid availability ranges', () => {
  assert.equal(availabilityQuerySchema.safeParse({ ...availabilityQuery, to: availabilityQuery.from }).success, false)
  assert.equal(availabilityQuerySchema.safeParse({ ...availabilityQuery, to: '2026-10-20T00:00:00.000Z' }).success, false)
  assert.equal(availabilityQuerySchema.safeParse({ ...availabilityQuery, resourceId: 'not-a-uuid' }).success, false)
  assert.equal(availabilityQuerySchema.safeParse({ ...availabilityQuery, extra: true }).success, false)
})

test('detects weekends in the campus time zone', () => {
  assert.equal(isWeekendInstant(new Date('2026-09-12T06:00:00.000Z')), true)
  assert.equal(isWeekendInstant(new Date('2026-09-14T06:00:00.000Z')), false)
  assert.equal(intervalTouchesWeekend(new Date('2026-09-11T18:00:00.000Z'), new Date('2026-09-11T20:00:00.000Z')), true)
})

const validCampusBlock = {
  type: 'HOLIDAY',
  reason: 'College holiday',
  startAt: '2026-09-16T03:30:00.000Z',
  endAt: '2026-09-16T12:30:00.000Z',
}
test('accepts and trims a campus block', () => {
  const parsed = resourceBlockCreateSchema.parse({ ...validCampusBlock, reason: '  College holiday  ' })
  assert.equal(parsed.reason, 'College holiday')
})
test('rejects invalid campus blocks', () => {
  assert.equal(resourceBlockCreateSchema.safeParse({ ...validCampusBlock, endAt: validCampusBlock.startAt }).success, false)
  assert.equal(resourceBlockCreateSchema.safeParse({ ...validCampusBlock, type: 'PRIVATE' }).success, false)
  assert.equal(resourceBlockCreateSchema.safeParse({ ...validCampusBlock, extra: true }).success, false)
})

test('validates administrator calendar ranges and filters', () => {
  assert.equal(adminCalendarQuerySchema.safeParse({ from: availabilityQuery.from, to: availabilityQuery.to }).success, true)
  assert.equal(adminCalendarQuerySchema.safeParse({ from: availabilityQuery.from, to: availabilityQuery.from }).success, false)
  assert.equal(adminCalendarQuerySchema.safeParse({ from: availabilityQuery.from, to: availabilityQuery.to, resourceId: 'invalid' }).success, false)
})

test('accepts a reschedule reason and rejects reversed times', () => {
  assert.equal(occurrenceRescheduleSchema.safeParse({
    startAt: '2026-09-18T10:00:00.000Z',
    endAt: '2026-09-18T11:00:00.000Z',
    reason: 'Speaker availability changed',
  }).success, true)
  assert.equal(occurrenceRescheduleSchema.safeParse({
    startAt: '2026-09-18T11:00:00.000Z',
    endAt: '2026-09-18T10:00:00.000Z',
    reason: 'Speaker availability changed',
  }).success, false)
})
