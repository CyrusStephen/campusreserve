import type { AuthUser } from './types'
const prefix = 'campusreserve:last-workspace:'
const pages = new Set(['/app','/app/profile','/app/resources','/app/bookings','/app/waitlist','/app/notifications','/app/canteen','/app/canteen/notifications','/app/events','/app/events/notifications'])
const adminPages = new Set(['/app/manage/bookings','/app/manage/bookings/history','/app/manage/calendar','/app/manage/reports','/app/manage/resources','/app/canteen/manage'])
export function workspaceHome(user: AuthUser): string { return user.role === 'SECURITY' ? '/app/security' : user.role === 'CANTEEN_STAFF' ? '/app/canteen/manage' : '/app' }
export function allowedWorkspace(user: AuthUser, path: string): boolean {
  if (user.role === 'SECURITY') return path === '/app/security' || path === '/app/profile'
  if (user.role === 'CANTEEN_STAFF') return path === '/app/canteen/manage' || path === '/app/profile'
  if (/^\/app\/bookings\/[0-9a-f-]{36}\/confirmation$/i.test(path)) return true
  if (/^\/app\/resources\/[0-9a-f-]{36}$/i.test(path)) return true
  if ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') &&
    (path === '/app/manage/resources/new' || /^\/app\/manage\/resources\/[0-9a-f-]{36}\/edit$/i.test(path))) return true
  return pages.has(path) || ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && adminPages.has(path))
}
export function rememberWorkspace(user: AuthUser, path: string): void { if (allowedWorkspace(user, path)) window.localStorage.setItem(prefix + user.id, path) }
export function lastWorkspace(user: AuthUser): string { const path = window.localStorage.getItem(prefix + user.id); return path && allowedWorkspace(user, path) ? path : workspaceHome(user) }
export function forgetWorkspace(user: AuthUser): void { window.localStorage.removeItem(prefix + user.id) }
