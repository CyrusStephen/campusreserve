import { prisma } from '../config/prisma.js'
import { applyCollegeBetaNotice } from '../utils/college-beta-notice.js'

async function main() {
  if (!process.argv.includes('--confirm-beta')) throw new Error('Use npm run resources:beta-notice to apply the 24-hour beta policy.')
  const results = await prisma.$transaction(applyCollegeBetaNotice, { timeout: 30_000 })
  for (const result of results) console.log(result)
  console.log('Only minimum notice was changed. Existing bookings and other policies were retained.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && !('code' in error) ? error.message : 'Beta notice update failed. Check database access and migrations.')
  process.exitCode = 1
}).finally(async () => { await prisma.$disconnect() })
