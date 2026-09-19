export function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `cr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
