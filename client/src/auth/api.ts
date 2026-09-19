import type { AuthSession } from './types'

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
const apiBaseUrl = configuredApiUrl ?? (import.meta.env.DEV ? 'http://localhost:5000' : '')
const apiRoot = `${apiBaseUrl}/api`

let accessToken: string | null = null
let refreshInFlight: Promise<AuthSession | null> | null = null
let sessionMutationQueue: Promise<void> = Promise.resolve()
const sessionListeners = new Set<(session: AuthSession | null) => void>()

export function subscribeSession(listener: (session: AuthSession | null) => void) {
  sessionListeners.add(listener)
  return () => { sessionListeners.delete(listener) }
}

function notifySession(session: AuthSession | null) {
  for (const listener of sessionListeners) listener(session)
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function setAccessToken(token: string | null) {
  accessToken = token
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return fallback
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload, 'The request could not be completed.'),
    )
  }

  return payload as T
}

async function sendRequest(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers)

  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(`${apiRoot}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
}

function readAuthSession(payload: unknown): AuthSession {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('status' in payload) ||
    payload.status !== 'ok' ||
    !('data' in payload) ||
    typeof payload.data !== 'object' ||
    payload.data === null ||
    !('accessToken' in payload.data) ||
    typeof payload.data.accessToken !== 'string' ||
    !('user' in payload.data) ||
    typeof payload.data.user !== 'object' ||
    payload.data.user === null ||
    !('id' in payload.data.user) ||
    typeof payload.data.user.id !== 'string' ||
    !('name' in payload.data.user) ||
    typeof payload.data.user.name !== 'string' ||
    !('email' in payload.data.user) ||
    typeof payload.data.user.email !== 'string' ||
    !('role' in payload.data.user) ||
    !['FACULTY', 'STAFF', 'CANTEEN_STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(
      String(payload.data.user.role),
    ) ||
    !('departmentId' in payload.data.user) ||
    !(
      typeof payload.data.user.departmentId === 'string' ||
      payload.data.user.departmentId === null
    ) ||
    !('tokenType' in payload.data) ||
    payload.data.tokenType !== 'Bearer' ||
    !('expiresIn' in payload.data) ||
    typeof payload.data.expiresIn !== 'number'
  ) {
    throw new ApiError(502, 'The server returned an unexpected login response.')
  }

  return payload.data as AuthSession
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  // Serialize login, refresh and logout within this tab and, where Web Locks
  // are supported, across tabs. No credentials are written to browser storage.
  const scheduled = sessionMutationQueue.then(async () => {
  const lockManager = (
    navigator as Navigator & {
      locks?: {
        request: <Result>(
          name: string,
          callback: () => Promise<Result>,
        ) => Promise<Result>
      }
    }
  ).locks

  if (lockManager) {
    return lockManager.request('campusreserve-session-refresh', task)
  }

  return task()
  })
  sessionMutationQueue = scheduled.then(() => undefined, () => undefined)
  return scheduled
}

async function performRefresh(): Promise<AuthSession | null> {
  return withRefreshLock(async () => {
    const response = await sendRequest('/auth/refresh', { method: 'POST' }, null)

    if (response.status === 401) {
      await response.text()
      setAccessToken(null)
      notifySession(null)
      return null
    }

    const session = readAuthSession(await parseResponse<unknown>(response))
    setAccessToken(session.accessToken)
    notifySession(session)
    return session
  })
}

export function refreshSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = performRefresh().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthSession> {
  return withRefreshLock(async () => {
  const response = await sendRequest(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    null,
  )

  const session = readAuthSession(await parseResponse<unknown>(response))
  setAccessToken(session.accessToken)
  notifySession(session)
  return session
  })
}

export async function logoutRequest(): Promise<void> {
  return withRefreshLock(async () => {
  const response = await sendRequest('/auth/logout', { method: 'POST' }, accessToken)
  await parseResponse<void>(response)
  setAccessToken(null)
  notifySession(null)
  })
}

async function authorizedResponse(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const tokenUsed = accessToken
  let response = await sendRequest(path, init, tokenUsed)

  if (response.status === 401) {
    if (accessToken && accessToken !== tokenUsed) {
      response = await sendRequest(path, init, accessToken)
    } else {
      const session = await refreshSession()
      if (session) response = await sendRequest(path, init, session.accessToken)
    }
  }

  if (response.status === 401) {
    setAccessToken(null)
    notifySession(null)
  }
  return response
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return parseResponse<T>(await authorizedResponse(path, init))
}

export async function apiBlobRequest(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await authorizedResponse(path, init)
  if (!response.ok) await parseResponse<never>(response)
  return response.blob()
}
