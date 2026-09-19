import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

const session = (token = 'test-access-token') => ({
  status: 'ok', data: { accessToken: token, tokenType: 'Bearer', expiresIn: 900,
    user: { id: 'test-user', name: 'Test User', email: 'test@example.invalid', role: 'ADMIN', departmentId: null } },
})
const unauthorized = () => Response.json({ status: 'error', message: 'Please log in to continue.' }, { status: 401 })

async function loadApi(context, handler, locks) {
  const originalFetch = globalThis.fetch
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  globalThis.fetch = handler
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: locks ? { locks } : {} })
  context.after(() => {
    globalThis.fetch = originalFetch
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
  })
  // Use the actual API implementation, replacing only Vite's environment object.
  // No network, browser or database is involved in these unit tests.
  const source = (await readFile(new URL('../src/auth/api.ts', import.meta.url), 'utf8')).replaceAll('import.meta.env', '({ DEV: true })')
  const javascript = stripTypeScriptTypes(source, { mode: 'strip' })
  return import(`data:text/javascript;base64,${Buffer.from(`${javascript}\n// ${randomUUID()}`).toString('base64')}`)
}

test('login keeps the token in memory and authenticates the next request', async (context) => {
  const calls = []
  const api = await loadApi(context, async (url, init) => {
    calls.push({ url, init })
    return url.endsWith('/auth/login') ? Response.json(session()) : Response.json({ status: 'ok', data: [] })
  })
  const events = []
  api.subscribeSession((value) => events.push(value))
  await api.loginRequest('test@example.invalid', 'local-test-only')
  await api.apiRequest('/resources')
  assert.equal(calls[0].init.headers.has('Authorization'), false)
  assert.equal(calls[0].init.headers.get('Content-Type'), 'application/json')
  assert.equal(calls[1].init.headers.get('Authorization'), 'Bearer test-access-token')
  assert.equal(calls[1].init.credentials, 'include')
  assert.equal(events.at(-1).user.role, 'ADMIN')
})

test('simultaneous refreshes share one request', async (context) => {
  let calls = 0
  const api = await loadApi(context, async () => { calls++; return Response.json(session()) })
  const first = api.refreshSession()
  const second = api.refreshSession()
  assert.equal(first, second)
  await Promise.all([first, second])
  assert.equal(calls, 1)
})

test('protected request refreshes once after 401, then retries with the new token', async (context) => {
  let reads = 0
  let refreshes = 0
  const api = await loadApi(context, async (url, init) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return Response.json(session('rotated-token')) }
    reads++
    if (reads === 1) return unauthorized()
    assert.equal(init.headers.get('Authorization'), 'Bearer rotated-token')
    return Response.json({ result: 'resource' })
  })
  assert.deepEqual(await api.apiRequest('/resources'), { result: 'resource' })
  assert.equal(reads, 2)
  assert.equal(refreshes, 1)
})

test('concurrent resource requests share refresh', async (context) => {
  let refreshes = 0
  const api = await loadApi(context, async (url, init) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return Response.json(session('rotated-token')) }
    return init.headers.get('Authorization') === 'Bearer rotated-token' ? Response.json({ ok: true }) : unauthorized()
  })
  await Promise.all([api.apiRequest('/resources'), api.apiRequest('/resources/example')])
  assert.equal(refreshes, 1)
})

test('expired sessions notify the provider and do not retry forever', async (context) => {
  let requests = 0
  const api = await loadApi(context, async () => { requests++; return unauthorized() })
  const events = []
  api.subscribeSession((value) => events.push(value))
  await assert.rejects(api.apiRequest('/resources'), (error) => error instanceof api.ApiError && error.status === 401)
  assert.equal(events.at(-1), null)
  assert.equal(requests, 2)
})

test('binary photo responses are not parsed as JSON', async (context) => {
  const api = await loadApi(context, async () => new Response(new Uint8Array([255, 216, 255]), { headers: { 'Content-Type': 'image/jpeg' } }))
  const blob = await api.apiBlobRequest('/resource-images/example.jpg')
  assert.equal(blob.type, 'image/jpeg')
  assert.equal(blob.size, 3)
})

test('403 is surfaced without refreshing', async (context) => {
  let calls = 0
  const api = await loadApi(context, async () => { calls++; return Response.json({ message: 'Administrator access required.' }, { status: 403 }) })
  await assert.rejects(api.apiRequest('/resources'), (error) => error.status === 403 && error.message === 'Administrator access required.')
  assert.equal(calls, 1)
})

test('a removed subscriber receives no session events', async (context) => {
  const api = await loadApi(context, async () => Response.json(session()))
  let notified = false
  const unsubscribe = api.subscribeSession(() => { notified = true })
  unsubscribe()
  await api.loginRequest('test@example.invalid', 'local-test-only')
  assert.equal(notified, false)
})

test('login, refresh and logout use the same lock and execute in order', async (context) => {
  const requests = []
  const lockNames = []
  let releaseLogin
  const loginGate = new Promise((resolve) => { releaseLogin = resolve })
  const api = await loadApi(context, async (url) => {
    requests.push(url.split('/').at(-1))
    if (url.endsWith('/auth/login')) { await loginGate; return Response.json(session('login-token')) }
    if (url.endsWith('/auth/refresh')) return Response.json(session('refresh-token'))
    return new Response(null, { status: 204 })
  }, { request: async (name, task) => { lockNames.push(name); return task() } })
  const events = []
  api.subscribeSession((value) => events.push(value))
  const login = api.loginRequest('test@example.invalid', 'local-test-only')
  const refresh = api.refreshSession()
  const logout = api.logoutRequest()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(requests, ['login'])
  releaseLogin()
  await Promise.all([login, refresh, logout])
  assert.deepEqual(requests, ['login', 'refresh', 'logout'])
  assert.equal(new Set(lockNames).size, 1)
  assert.equal(lockNames.length, 3)
  assert.equal(events.at(-1), null)
})

test('a failed login does not break subsequent session operations', async (context) => {
  const api = await loadApi(context, async (url) => url.endsWith('/auth/logout') ? new Response(null, { status: 204 }) : unauthorized())
  await assert.rejects(api.loginRequest('test@example.invalid', 'local-test-only'))
  assert.equal(await api.refreshSession(), null)
  await api.logoutRequest()
})
