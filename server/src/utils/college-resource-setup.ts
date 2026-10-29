import type { Prisma } from '../generated/prisma/client.js'
import { collegeBetaPolicy, collegeBetaResources, normalizeCollegeResourceName } from './college-resources.js'

const setupAction = 'COLLEGE_BETA_RESOURCE_SETUP_V1'

export async function applyCollegeBetaResources(transaction: Prisma.TransactionClient): Promise<string[]> {
  // Serialize setup runs so matching names cannot produce duplicate resources.
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(29102026)`
  const resources = await transaction.resource.findMany()
  const results: string[] = []
  for (const venue of collegeBetaResources) {
    const matches = resources.filter((resource) => !resource.isDemo && normalizeCollegeResourceName(resource.name) === normalizeCollegeResourceName(venue.input.name))
    if (matches.length > 1) throw new Error(`Multiple resources match ${venue.input.name}. Resolve their names before running setup.`)
    const existing = matches[0]
    if (existing?.status === 'ARCHIVED') {
      results.push(`Skipped archived resource: ${existing.name}`)
      continue
    }
    if (existing && await transaction.auditLog.findFirst({ where: { action: setupAction, entityType: 'Resource', entityId: existing.id } })) {
      results.push(`Already set up; preserved current settings: ${existing.name}`)
      continue
    }
    const collision = resources.find((resource) => resource.slug === venue.slug && resource.id !== existing?.id)
    if (collision) throw new Error(`The reserved identifier for ${venue.input.name} is in use. Nothing was changed.`)
    // Reuse existing IDs, capacities, photos and reservations; apply policies only on first setup.
    const saved = existing
      ? await transaction.resource.update({ where: { id: existing.id }, data: { ...collegeBetaPolicy, type: venue.input.type, status: 'ACTIVE', revision: { increment: 1 } } })
      : await transaction.resource.create({ data: { ...venue.input, slug: venue.slug, isDemo: false } })
    await transaction.auditLog.create({ data: {
      action: setupAction, entityType: 'Resource', entityId: saved.id,
      metadata: { method: 'operator-cli', created: !existing, policy: collegeBetaPolicy, provisionalCapacity: !existing,
        ...(existing ? { previousPolicy: { advanceBookingDays: existing.advanceBookingDays, minimumNoticeHours: existing.minimumNoticeHours,
          maximumDurationMinutes: existing.maximumDurationMinutes, bufferBeforeMinutes: existing.bufferBeforeMinutes,
          bufferAfterMinutes: existing.bufferAfterMinutes, cancellationDeadlineHours: existing.cancellationDeadlineHours }, previousType: existing.type, previousStatus: existing.status } : {}),
      },
    } })
    results.push(`${existing ? 'Updated beta policy' : 'Created beta resource'}: ${saved.name}`)
  }
  return results
}
