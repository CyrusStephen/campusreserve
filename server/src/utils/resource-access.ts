export function canManageResources(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export function canViewResource(role: string | undefined, resource: { status: string; isDemo: boolean }): boolean {
  if (canManageResources(role)) return true
  return (role === 'FACULTY' || role === 'STAFF') && resource.status === 'ACTIVE' && !resource.isDemo
}
