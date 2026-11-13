import test from 'node:test'
import assert from 'node:assert/strict'
import type { Prisma } from '../src/generated/prisma/client.js'
import { collegeBetaPolicy, collegeBetaResources } from '../src/utils/college-resources.js'
import { applyCollegeBetaResources } from '../src/utils/college-resource-setup.js'
import { applyCollegeBetaNotice } from '../src/utils/college-beta-notice.js'
import { resourceCreateSchema, resourceQuerySchema } from '../src/utils/resource-input.js'

test('five beta spaces exclude chapel and use one day notice within a 60 day window', () => {
  assert.equal(collegeBetaResources.length, 5)
  assert.deepEqual(collegeBetaResources.map((item) => item.input.name), ['Kavukattu Hall', 'Padiyara Hall', 'Basketball Court', 'Hockey Ground', 'Sports Open Ground'])
  for (const { input } of collegeBetaResources) {
    assert.equal(input.minimumNoticeHours, 24)
    assert.equal(input.advanceBookingDays, 60)
    assert.equal(input.bufferBeforeMinutes, 30)
    assert.equal(input.bufferAfterMinutes, 30)
    assert.equal(input.cancellationDeadlineHours, 24)
    assert.equal(input.maximumDurationMinutes, 480)
    assert.equal(input.isExclusive, true)
    assert.equal(input.capacity, 100)
    assert.match(input.description, /temporary testing limit/)
    assert.equal(resourceCreateSchema.safeParse(input).success, true)
  }
})

test('sports facilities support filtering but require capacity and exclusive use', () => {
  const input = collegeBetaResources[2]!.input
  assert.equal(input.type, 'SPORTS_FACILITY')
  assert.equal(resourceQuerySchema.parse({ type: 'SPORTS_FACILITY' }).type, 'SPORTS_FACILITY')
  assert.equal(resourceCreateSchema.safeParse({ ...input, capacity: null }).success, false)
  assert.equal(resourceCreateSchema.safeParse({ ...input, isExclusive: false }).success, false)
  assert.equal(resourceCreateSchema.safeParse({ ...input, minimumNoticeHours: 60 * 24 }).success, false)
})

// This fake transaction tests setup behaviour without connecting to a user's database.
function database(initial: Record<string, unknown>[] = []) {
  const rows = initial.map((row) => ({ ...row }))
  const audits: Record<string, unknown>[] = []
  const transaction = {
    $executeRaw: async () => 1,
    resource: {
      findMany: async () => rows,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { ...data, id: `created-${rows.length}`, revision: 1 }
        rows.push(row)
        return row
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = rows.find((entry) => entry.id === where.id)!
        const revision = Number(row.revision) + 1
        Object.assign(row, data, { revision })
        return row
      },
    },
    auditLog: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => audits.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)),
      create: async ({ data }: { data: Record<string, unknown> }) => { audits.push(data); return data },
    },
  } as unknown as Prisma.TransactionClient
  return { rows, audits, transaction }
}

test('setup creates five real resources and rerunning preserves administrator edits', async () => {
  const db = database()
  await applyCollegeBetaResources(db.transaction)
  assert.equal(db.rows.length, 5)
  assert.equal(db.audits.length, 5)
  assert.ok(db.rows.every((row) => row.isDemo === false && row.status === 'ACTIVE'))
  db.rows[0]!.capacity = 350
  db.rows[0]!.minimumNoticeHours = 48
  await applyCollegeBetaResources(db.transaction)
  assert.equal(db.rows.length, 5)
  assert.equal(db.audits.length, 5)
  assert.equal(db.rows[0]!.capacity, 350)
  assert.equal(db.rows[0]!.minimumNoticeHours, 48)
})

test('first setup reuses existing hall ID and capacity while applying the requested policies', async () => {
  const db = database([{ ...collegeBetaResources[0]!.input, id: 'existing-hall', slug: 'existing-hall-slug', name: 'KAVUKATTU HALL', capacity: 600, revision: 7, minimumNoticeHours: 1, isDemo: false }])
  await applyCollegeBetaResources(db.transaction)
  assert.equal(db.rows.length, 5)
  assert.equal(db.rows[0]!.id, 'existing-hall')
  assert.equal(db.rows[0]!.slug, 'existing-hall-slug')
  assert.equal(db.rows[0]!.capacity, 600)
  assert.equal(db.rows[0]!.revision, 8)
  assert.equal(db.rows[0]!.minimumNoticeHours, collegeBetaPolicy.minimumNoticeHours)
})

test('setup rejects ambiguous venue names and does not reactivate archived resources', async () => {
  const duplicate = { ...collegeBetaResources[0]!.input, slug: 'a', isDemo: false, id: 'a' }
  await assert.rejects(applyCollegeBetaResources(database([duplicate, { ...duplicate, id: 'b', slug: 'b' }]).transaction), /Multiple resources/)
  const db = database([{ ...duplicate, status: 'ARCHIVED' }])
  await applyCollegeBetaResources(db.transaction)
  assert.equal(db.rows[0]!.status, 'ARCHIVED')
  assert.equal(db.audits.length, 4)
})

test('beta notice updates only the five named venues and keeps unrelated settings', async () => {
  const db = database(collegeBetaResources.map((venue, index) => ({
    ...venue.input, id: `venue-${index}`, slug: venue.slug, revision: 3,
    minimumNoticeHours: 720, capacity: 250, isDemo: false,
  })).concat([{ id: 'unrelated', name: 'Another Hall', minimumNoticeHours: 168, isDemo: false }]))
  await applyCollegeBetaNotice(db.transaction)
  for (const row of db.rows.slice(0, 5)) {
    assert.equal(row.minimumNoticeHours, 24)
    assert.equal(row.capacity, 250)
    assert.equal(row.bufferBeforeMinutes, 30)
    assert.equal(row.revision, 4)
  }
  assert.equal(db.rows[5]!.minimumNoticeHours, 168)
  assert.equal(db.audits.length, 5)
  await applyCollegeBetaNotice(db.transaction)
  assert.equal(db.audits.length, 5)
})

test('beta notice skips archived and demo resources and rejects duplicate real names', async () => {
  const venue = { ...collegeBetaResources[0]!.input, id: 'archived', minimumNoticeHours: 720, isDemo: false }
  const db = database([{ ...venue, status: 'ARCHIVED' }, { ...venue, id: 'demo', isDemo: true }])
  await applyCollegeBetaNotice(db.transaction)
  assert.equal(db.audits.length, 0)
  assert.equal(db.rows[0]!.minimumNoticeHours, 720)
  await assert.rejects(applyCollegeBetaNotice(database([venue, { ...venue, id: 'duplicate' }]).transaction), /Multiple resources/)
})
