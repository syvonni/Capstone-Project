import { authHeaders, clearAuthCsrfToken, fetchJsonWithFallback, post } from '@/lib/http.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

function base64ToBuffer(b64) {
  if (!b64 || typeof b64 !== 'string') throw new Error('Invalid base64 input')
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Step-up with TOTP code. Returns { stepUpToken, expiresAtMs }.
 * @param {string} code - 6-digit TOTP code
 */
export async function stepUpWithTotp(code) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', { 'Content-Type': 'application/json' })
  return post('/api/auth/admin/step-up', { code }, { headers })
}

/**
 * Start passkey step-up; returns publicKey options for navigator.credentials.get.
 * Clears auth CSRF cache so a fresh token (and cookie) is used, avoiding 403 on first attempt.
 * Retries once on 403 in case of stale CSRF.
 * @returns {Promise<{ publicKey: object }>}
 */
export async function stepUpPasskeyStart() {
  // Force a fresh CSRF token so cookie and header match (avoids 403 when cached token was from another context)
  clearAuthCsrfToken()
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', { 'Content-Type': 'application/json' })
  const options = {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
    credentials: 'include',
  }
  try {
    return await fetchJsonWithFallback('/api/auth/admin/step-up/start', options)
  } catch (err) {
    if (err?.status === 403) {
      clearAuthCsrfToken()
      return fetchJsonWithFallback('/api/auth/admin/step-up/start', options)
    }
    throw err
  }
}

/**
 * Complete passkey step-up with the credential from the browser.
 * @param {object} credential - { id, rawId, response: { clientDataJSON, authenticatorData, signature, userHandle } } (base64url strings)
 * @returns {Promise<{ stepUpToken: string, expiresAtMs: number }>}
 */
export async function stepUpPasskeyComplete(credential) {
  const current = getCurrentUser()
  const headers = authHeaders(current, 'admin', { 'Content-Type': 'application/json' })
  if (current?.token) headers['Authorization'] = `Bearer ${current.token}`
  return fetchJsonWithFallback('/api/auth/webauthn/authenticate/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ credential, purpose: 'admin_step_up' }),
  })
}

/**
 * Run full passkey step-up: start, get credential from browser, complete.
 * @returns {Promise<{ stepUpToken: string, expiresAtMs: number }>}
 */
export async function stepUpWithPasskey() {
  if (!('credentials' in navigator)) throw new Error('Passkeys are not supported in this browser')
  const start = await stepUpPasskeyStart()
  const pub = start?.publicKey
  if (!pub?.challenge) throw new Error('Invalid step-up response')
  const publicKey = {
    ...pub,
    challenge: base64ToBuffer(pub.challenge),
  }
  if (pub.allowCredentials?.length) {
    publicKey.allowCredentials = pub.allowCredentials.map((c) => ({
      ...c,
      id: base64ToBuffer(c.id),
    }))
  }
  const cred = await navigator.credentials.get({ publicKey })
  if (!cred?.response) throw new Error('Authentication was cancelled or timed out')
  const resp = cred.response
  const payload = {
    id: cred.id,
    rawId: bufferToBase64(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufferToBase64(resp.clientDataJSON),
      authenticatorData: bufferToBase64(resp.authenticatorData),
      signature: bufferToBase64(resp.signature),
      userHandle: resp.userHandle ? bufferToBase64(resp.userHandle) : null,
    },
  }
  return stepUpPasskeyComplete(payload)
}
