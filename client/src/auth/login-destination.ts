import { allowedWorkspace, workspaceHome } from './landing'
import type { AuthUser } from './types'

// Resolve using the account returned by login, never the previous render's user.
export function loginDestination(user: AuthUser, service: string | null, requested: unknown): string {
  if (typeof requested === 'string' && allowedWorkspace(user, requested)) return requested
  if (user.role === 'SECURITY' || user.role === 'CANTEEN_STAFF') return workspaceHome(user)
  if (service === 'canteen') return '/app/canteen'
  if (service === 'events') return '/app/events'
  // Signing out of Security Desk must not make the next administrator inherit it.
  return workspaceHome(user)
}
