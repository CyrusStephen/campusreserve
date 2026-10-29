import { prisma } from '../config/prisma.js'
import { applyCollegeBetaResources } from '../utils/college-resource-setup.js'

async function main() {
  if (!process.argv.includes('--confirm-beta')) throw new Error('Run npm run resources:college to apply the five beta venues.')
  const results = await prisma.$transaction(applyCollegeBetaResources, { timeout: 30_000 })
  for (const result of results) console.log(result)
  console.log('Chapel was not added. New capacities are provisional (100); review them in Manage resources.')
  console.log('Default minimum notice: 1 day. Booking window: 60 days. Existing resource settings and reservations were retained. Use resources:beta-notice to update existing venues to 24 hours.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && !('code' in error) ? error.message : 'College setup failed. Check the database and run prisma migrate deploy first.')
  process.exitCode = 1
}).finally(async () => { await prisma.$disconnect() })
