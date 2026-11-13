import type { Prisma } from '../generated/prisma/client.js'
import { collegeBetaResources, normalizeCollegeResourceName } from './college-resources.js'

export async function applyCollegeBetaNotice(transaction: Prisma.TransactionClient): Promise<string[]> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(29102026)`
  const resources = await transaction.resource.findMany()
  const results: string[] = []
  for (const venue of collegeBetaResources) {
    const matches = resources.filter((resource) => !resource.isDemo &&
      normalizeCollegeResourceName(resource.name) === normalizeCollegeResourceName(venue.input.name))
    if (matches.length > 1) throw new Error(`Multiple resources match ${venue.input.name}. Resolve duplicate names first.`)
    const resource = matches[0]
    if (!resource || resource.status === 'ARCHIVED') {
      results.push(`Skipped missing or archived venue: ${venue.input.name}`)
      continue
    }
    if (resource.minimumNoticeHours === 24) {
      results.push(`Already 24 hours: ${resource.name}`)
      continue
    }
    await transaction.resource.update({ where: { id: resource.id }, data: { minimumNoticeHours: 24, revision: { increment: 1 } } })
    await transaction.auditLog.create({ data: {
      action: 'COLLEGE_BETA_NOTICE_UPDATED', entityType: 'Resource', entityId: resource.id,
      metadata: { method: 'operator-cli', previousMinimumNoticeHours: resource.minimumNoticeHours, minimumNoticeHours: 24 },
    } })
    results.push(`Minimum notice set to 24 hours: ${resource.name}`)
  }
  return results
}
