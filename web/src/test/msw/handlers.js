import { http, HttpResponse, delay } from 'msw'
import { variablesHandlers } from './handlers.variables'
import { violationsHandlers } from './handlers.violations'
import { inspectionItemsHandlers } from './handlers.inspectionItems'

/**
 * Shared mock handlers used by Vitest (node) and Playwright (browser) for
 * deterministic network responses.
 */
export const handlers = [
  // Maintenance status
  http.get('/api/maintenance/status', async () => {
    await delay(20)
    return HttpResponse.json({ active: false })
  }),

  // Auth: CSRF token
  http.get('/api/auth/csrf-token', async () => {
    await delay(20)
    return HttpResponse.json({ token: 'test-csrf-token-123' })
  }),

  // Auth: login start (returns verification required by default)
  http.post('/api/auth/login/start', async ({ request }) => {
    await delay(100)
    const body = await request.json().catch(() => ({}))
    if (body?.email?.includes('locked')) {
      return HttpResponse.json({ sent: false, locked: true, lockedUntil: new Date(Date.now() + 120000).toISOString() }, { status: 423 })
    }
    if (body?.email?.includes('rate-limited')) {
      return HttpResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } })
    }
    if (body?.email?.includes('mfa-required')) {
      return HttpResponse.json({ sent: true, mfaMethod: 'totp', expiresAt: Date.now() + 300000 })
    }
    if (body?.email?.includes('passkey')) {
      return HttpResponse.json({ sent: true, mfaMethod: 'passkey' })
    }
    return HttpResponse.json({ sent: true, expiresAt: Date.now() + 300000 })
  }),

  // Auth: login finalize (single-step)
  http.post('/api/auth/login', async ({ request }) => {
    await delay(100)
    const { email } = await request.json().catch(() => ({}))
    if (email === 'admin@example.com') {
      return HttpResponse.json({ role: 'admin', token: 'admintoken' })
    }
    if (email === 'invalid@example.com') {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json({ role: 'business_owner', token: 'user-token', name: 'Test User' })
  }),

  // Auth: signup start
  http.post('/api/auth/signup/start', async ({ request }) => {
    await delay(100)
    const body = await request.json().catch(() => ({}))
    if (body?.email === 'existing@example.com') {
      return HttpResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    return HttpResponse.json({ sent: true, expiresAt: Date.now() + 300000 })
  }),

  // Auth: resend code
  http.post('/api/auth/resend', async ({ request }) => {
    await delay(100)
    const body = await request.json().catch(() => ({}))
    if (body?.email?.includes('rate-limited')) {
      return HttpResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '90' } })
    }
    return HttpResponse.json({ sent: true, devCode: '123456', retryAfter: 90 })
  }),

  // Auth: get current user
  http.get('/api/auth/me', () => {
    return HttpResponse.json({ role: 'business_owner', token: 'user-token', name: 'Test User' })
  }),

  // Auth: logout
  http.post('/api/auth/logout', async () => {
    await delay(50)
    return HttpResponse.json({ success: true })
  }),
  ...variablesHandlers,
  ...violationsHandlers,
  ...inspectionItemsHandlers
]
