import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'

async function main() {
  if (env.NODE_ENV !== 'development' || !process.argv.includes('--confirm-demo')) {
    throw new Error('Demo resources can only be created explicitly in development mode.')
  }
  const entries = [
    ...Array.from({ length: 7 }, (_, index) => ({ type: 'HALL' as const, label: 'Hall', number: index + 1, capacity: 100 })),
    ...Array.from({ length: 3 }, (_, index) => ({ type: 'LABORATORY' as const, label: 'Lab', number: index + 1, capacity: 30 })),
  ].map(({ type, label, number, capacity }) => ({
    name: `DEMO — ${label} ${String(number).padStart(2, '0')}`,
    slug: `campusreserve-demo-${label.toLowerCase()}-${number}`,
    type,
    status: 'INACTIVE' as const,
    isDemo: true,
    description: 'Development example only. This is not a verified college venue and is never listed for requesters. Add a separate real resource when the college details arrive.',
    building: 'Sample building — unverified',
    location: 'Sample location — unverified',
    capacity,
    totalQuantity: 1,
    isExclusive: true,
    features: ['Sample feature'],
  }))
  const count = await prisma.$transaction(async (transaction) => {
    const existingReal = await transaction.resource.count({ where: { slug: { in: entries.map((entry) => entry.slug) }, isDemo: false } })
    if (existingReal) throw new Error('A demo identifier is already used by a real resource. Nothing was changed.')
    const result = await transaction.resource.createMany({ data: entries, skipDuplicates: true })
    if (result.count) await transaction.auditLog.create({ data: {
      action: 'DEMO_RESOURCES_CREATED', entityType: 'Resource', entityId: 'development-seed',
      metadata: { count: result.count, method: 'operator-cli' },
    } })
    return result.count
  })
  console.log(`Created ${count} demo resources. Existing entries were not overwritten.`)
  console.log('Sign in as an administrator, open Manage resources, then choose Demo venues.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && !('code' in error) ? error.message : 'Demo creation failed. Check the database and apply the migration first.')
  process.exitCode = 1
}).finally(async () => { await prisma.$disconnect() })
