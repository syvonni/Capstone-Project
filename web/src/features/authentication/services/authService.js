import { fetchJsonWithFallback, fetchWithFallback } from "@/lib/http.js"
import { authHeaders } from '@/lib/authHeaders.js'
import { getCurrentUser } from '@/features/authentication/lib/authEvents.js'

/**
 * Authentication service layer — centralizes HTTP calls used by
 * forms, hooks, and multi-step flows within the authentication feature.
 */

// Sign up (customer/provider)
export async function signupStart(payload) {
  return await fetchJsonWithFallback('/api/auth/signup/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// Step-up start: passkey verification challenge for email change confirmation
export async function changeEmailConfirmPasskeyStart() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-email/confirm/passkey/start', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
}

export async function deleteAccountPasskeyStart() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/delete-account/passkey/start', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
}

// Step-up start: passkey verification challenge for password change
export async function changePasswordPasskeyStart() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-password/passkey/start', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
}

export async function signup(payload) {
  return await fetchJsonWithFallback('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function verifySignupCode(payload) {
  return await fetchJsonWithFallback('/api/auth/signup/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function resendSignupCode(payload) {
  return await fetchJsonWithFallback('/api/auth/signup/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// Login
export async function loginStart(payload) {
  return await fetchJsonWithFallback('/api/auth/login/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function loginResend(payload) {
  return await fetchJsonWithFallback('/api/auth/login/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function loginPost(payload) {
  return await fetchJsonWithFallback('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function verifyLoginCode(payload) {
  return await fetchJsonWithFallback('/api/auth/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function verifyLoginTotp(payload) {
  return await fetchJsonWithFallback('/api/auth/login/verify-totp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// Admin login (two-step) — reuse standard login endpoints
export async function adminLoginStart(payload) {
  const res = await fetchWithFallback('/api/auth/login/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res || !res.ok) {
    let body = null
    try { body = await res.json() } catch { /* ignore */ }
    return Promise.reject({ status: res?.status || 0, body })
  }
  return res.json()
}

export async function adminVerifyLoginCode(payload) {
  const res = await fetchWithFallback('/api/auth/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res || !res.ok) {
    let body = null
    try { body = await res?.json() } catch { /* ignore */ }
    return Promise.reject({ status: res?.status || 0, body })
  }
  return res.json()
}

export async function getMe(options = {}) {
  // Default 10-second timeout for initial auth check to avoid indefinite hang
  const timeoutMs = options.timeoutMs ?? 10000
  // Disable 503 retry for auth check — we want fast fail so page renders with stored user
  return await fetchJsonWithFallback('/api/auth/me', { method: 'GET', timeoutMs, retryOn503: false })
}

/** Call server to record logout in notification history. Does not clear local session. */
export async function logoutApi() {
  return await fetchJsonWithFallback('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

// Password reset
export async function sendForgotPassword(payload) {
  return await fetchJsonWithFallback('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function resendForgotPasswordCode(payload) {
  return await fetchJsonWithFallback('/api/auth/forgot-password/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function verifyForgotPasswordMfa(payload) {
  return await fetchJsonWithFallback('/api/auth/forgot-password/verify-mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function verifyMfa(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/mfa/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function verifyResetCode(payload) {
  // Return Response to allow callers to inspect status codes
  return await fetchWithFallback('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function changePassword(payload) {
  return await fetchJsonWithFallback('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// Change password for an authenticated user by verifying current password
export async function changePasswordAuthenticated(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-password-authenticated', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Step 1: Send OTP to email for password change
export async function changePasswordStart(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-password/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Step 2: Verify TOTP and change password
export async function changePasswordVerifyTotp(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-password/verify-totp', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Step 2: Verify OTP and change password
export async function changePasswordVerify(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-password/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function changeEmail(payload) {
  return await fetchJsonWithFallback('/api/auth/change-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// Start change email flow (send OTP to the new email)
export async function changeEmailStart(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-email/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Verify the OTP sent to the new email and finalize change
export async function changeEmailVerify(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  // Add Authorization Bearer token for backend requireJwt middleware
  if (current?.token) {
    headers['Authorization'] = `Bearer ${current.token}`
  }
  return await fetchJsonWithFallback('/api/auth/change-email/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Get email change status (for grace period)
export async function getEmailChangeStatus() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null)
  return await fetchJsonWithFallback('/api/auth/profile/email/change-status', {
    method: 'GET',
    headers,
  })
}

// Revert email change within grace period
export async function revertEmailChange() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/profile/email/revert', {
    method: 'POST',
    headers,
  })
}

// Send OTP to current email to confirm identity before allowing change
export async function changeEmailConfirmStart(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-email/confirm/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Verify OTP sent to current email
export async function changeEmailConfirmVerify(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/change-email/confirm/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Account Deletion
export async function cancelAccountDeletion() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  // Return the raw response or handle error logic here, but keeping consistent with other methods that might return result or throw
  // The hook expects to handle the response object for error parsing, so we'll return the raw response for now or standard json.
  // Looking at useCancelDeleteAccount, it manually parses response. Let's standardize to return JSON or throw.
  // Actually, let's stick to the pattern of returning the promise of the fetch result or the parsed JSON.
  // Most methods here return `fetchJsonWithFallback` which returns the parsed JSON or throws.
  
  return await fetchJsonWithFallback('/api/auth/delete-account/cancel', {
    method: 'POST',
    headers,
  })
}

export async function confirmAccountDeletion(payload) {
  return await fetchJsonWithFallback('/api/auth/delete-account/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteAccountAuthenticated(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/delete-account/authenticated', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Step 1: Send OTP to email for account deletion
export async function deleteAccountStart(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/delete-account/send-code', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function deleteAccountVerifyCode(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/delete-account/verify-code', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

// Step 2: Verify OTP and delete account
export async function deleteAccountConfirm(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/delete-account/confirm', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function getProfile() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/me', {
    method: 'GET',
    headers,
  })
}

/**
 * Mark the business-owner welcome state as completed
 */
export async function markWelcomeComplete() {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/welcome-complete', {
    method: 'PATCH',
    headers,
  })
}

export async function firstLoginChangeCredentials(payload) {
  const current = getCurrentUser()
  const headers = authHeaders(current, null, { 'Content-Type': 'application/json' })
  return await fetchJsonWithFallback('/api/auth/first-login/change-credentials', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}
