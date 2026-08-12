import { getCurrentUser, setCurrentUser } from '@/features/authentication/lib/authEvents.js'
import { authHeaders } from './authHeaders.js'

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
const csrfTokenCache = new Map()

function syncCsrfCookie(cookieName, token) {
  if (typeof document === 'undefined' || !cookieName || !token) return
  document.cookie = `${cookieName}=${encodeURIComponent(token)}; path=/; SameSite=Lax`
}

/** Get CSRF token for auth API (double-submit cookie). Uses cache; refetches on 403 csrf_invalid. */
async function getAuthCsrfToken(authBaseUrl) {
  const cacheKey = 'auth'
  if (csrfTokenCache.has(cacheKey)) return csrfTokenCache.get(cacheKey)
  const base = (authBaseUrl || '').replace(/\/$/, '')
  const url = base ? `${base}/api/auth/csrf-token` : '/api/auth/csrf-token'
  const res = await fetch(url, { method: 'GET', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to get security token')
  const data = await res.json()
  const token = data?.csrfToken
  if (!token) throw new Error('Invalid security token response')
  syncCsrfCookie('csrf-token', token)
  csrfTokenCache.set(cacheKey, token)
  return token
}

/** Clear cached CSRF token (e.g. after 403 csrf_invalid so next request refetches). */
export function clearAuthCsrfToken() {
  csrfTokenCache.delete('auth')
}

/** Get CSRF token for business/inspector/lgu-officer APIs. Uses cache; refetches on 403 csrf_invalid. */
async function getBusinessCsrfToken(pathPrefix, baseUrl) {
  const cacheKey = `scope:${pathPrefix}`
  if (csrfTokenCache.has(cacheKey)) return csrfTokenCache.get(cacheKey)
  const base = (baseUrl || '').replace(/\/$/, '')
  const url = base ? `${base}${pathPrefix}/csrf-token` : `${pathPrefix}/csrf-token`
  const res = await fetch(url, { method: 'GET', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to get security token')
  const data = await res.json()
  const token = data?.csrfToken
  if (!token) throw new Error('Invalid security token response')
  const cookieName = pathPrefix === '/api/business'
    ? 'csrf-token-business'
    : pathPrefix === '/api/inspector'
      ? 'csrf-token-inspector'
      : pathPrefix === '/api/lgu-officer'
        ? 'csrf-token-lgu-officer'
        : 'csrf-token'
  syncCsrfCookie(cookieName, token)
  csrfTokenCache.set(cacheKey, token)
  return token
}

/** Clear business CSRF cache (e.g. after 403 csrf_invalid). */
export function clearBusinessCsrfToken(pathPrefix) {
  if (pathPrefix) {
    csrfTokenCache.delete(`scope:${pathPrefix}`)
    return
  }
  csrfTokenCache.delete('scope:/api/business')
  csrfTokenCache.delete('scope:/api/inspector')
  csrfTokenCache.delete('scope:/api/lgu-officer')
}

/** Get CSRF token for admin APIs. Uses cache; refetches on 403 csrf_invalid. */
async function getAdminCsrfToken(baseUrl) {
  const cacheKey = 'admin'
  if (csrfTokenCache.has(cacheKey)) return csrfTokenCache.get(cacheKey)
  const base = (baseUrl || '').replace(/\/$/, '')
  const url = base ? `${base}/api/admin/csrf-token` : '/api/admin/csrf-token'
  const res = await fetch(url, { method: 'GET', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to get security token')
  const data = await res.json()
  const token = data?.csrfToken
  if (!token) throw new Error('Invalid security token response')
  syncCsrfCookie('csrf-token-admin', token)
  csrfTokenCache.set(cacheKey, token)
  return token
}

/** Clear admin CSRF cache (e.g. after 403 csrf_invalid). */
export function clearAdminCsrfToken() {
  csrfTokenCache.delete('admin')
}

// In production build, pick the correct backend origin per path (auth=3001, business=3002, admin/maintenance=3003, audit=3004).
function getProductionApiOrigin(path) {
  const env = import.meta.env || {}
  const auth = env.VITE_BACKEND_ORIGIN || env.VITE_AUTH_ORIGIN || 'http://localhost:3001'
  if (!auth) return null
  const admin = env.VITE_ADMIN_ORIGIN
  const business = env.VITE_BUSINESS_ORIGIN
  const audit = env.VITE_AUDIT_ORIGIN
  // Derive admin/business/audit from auth origin if not set (e.g. http://localhost:3001 -> 3003, 3002, 3004)
  const base = auth.replace(/:\d+(\/?)$/, '')
  const adminOrigin = admin || `${base}:3003`
  const businessOrigin = business || `${base}:3002`
  const auditOrigin = audit || `${base}:3004`
  const authOrigin = auth.replace(/\/$/, '')
  if (path.startsWith('/api/admin') || path.startsWith('/api/maintenance') || path.startsWith('/api/lgu-officer') || path.startsWith('/api/lgus') || path.startsWith('/api/forms')) return adminOrigin
  if (path.startsWith('/api/business')) return businessOrigin
  if (path.startsWith('/api/audit')) return auditOrigin
  return authOrigin
}

/** Get the API origin for a path (for EventSource etc). Returns '' for same-origin (dev with proxy). */
export function getApiOriginForPath(path) {
  const isProductionBuild = import.meta.env.PROD === true
  if (isProductionBuild && path.startsWith('/api')) return getProductionApiOrigin(path)
  return ''
}

export async function fetchWithFallback(path, options = {}) {
  const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN

  // Clone options so we don't mutate the caller's object
  const opts = { ...(options || {}) }
  const retryOnCsrfInvalid = opts.retryOnCsrfInvalid !== false
  const skipAuth = opts.skipAuth === true
  const retryOn503 = opts.retryOn503 !== false // Default: retry on 503 (service starting)
  const maxRetries = opts.maxRetries ?? 3
  const retryDelay = opts.retryDelay ?? 1000
  delete opts.retryOnCsrfInvalid
  delete opts.skipAutoLogout
  delete opts.skipAuth
  delete opts.retryOn503
  delete opts.maxRetries
  delete opts.retryDelay

  // Merge and normalize headers
  const incomingHeaders = opts.headers || {}
  const headers = { ...incomingHeaders }

  // If no Authorization header provided, attach stored token (if any)
  const hasAuthHeader = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization')
  try {
    if (!hasAuthHeader && !skipAuth) {
      let current = getCurrentUser()
      
      // Fallback: try reading from storage if not in memory (e.g. on fresh page load)
      if (!current) {
        const LOCAL_KEY = 'auth__currentUser'
        const SESSION_KEY = 'auth__sessionUser'
        try {
          let raw = localStorage.getItem(LOCAL_KEY)
          if (!raw) raw = sessionStorage.getItem(SESSION_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            // Handle { user, expiresAt } wrapper or direct user object
            current = parsed.user || parsed
          }
        } catch { /* ignore storage errors */ }
      }

      const token = current?.token
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
  } catch { /* ignore errors reading storage */ }

  // In production build (e.g. preview on 4173), there is no Vite proxy — use the correct backend origin per path.
  const isProductionBuild = import.meta.env.PROD === true
  const pathStr = path.startsWith('/') ? path : `/${path}`
  const origin = isProductionBuild && path.startsWith('/api') ? getProductionApiOrigin(path) : null
  const apiUrl = origin ? `${origin.replace(/\/$/, '')}${pathStr}` : path

  // CSRF: for mutating requests, fetch token and send header per API; send cookies so double-submit works.
  const isMutating = MUTATING_METHODS.includes((opts.method || 'GET').toUpperCase())
  const isAuthPath = path.startsWith('/api/auth') && !path.includes('/api/auth/csrf-token')
  const isBusinessPath = path.startsWith('/api/business') && !path.includes('/api/business/csrf-token')
  const isInspectorPath = path.startsWith('/api/inspector') && !path.includes('/api/inspector/csrf-token')
  const isLguOfficerPath = path.startsWith('/api/lgu-officer') && !path.includes('/api/lgu-officer/csrf-token')
  const isAdminPath = path.startsWith('/api/admin') && !path.includes('/api/admin/csrf-token')
  const businessPathPrefix = isBusinessPath ? '/api/business' : isInspectorPath ? '/api/inspector' : isLguOfficerPath ? '/api/lgu-officer' : null
  if (isMutating && isAuthPath) {
    opts.credentials = opts.credentials ?? 'include'
    try {
      const authBase = origin || (isProductionBuild && path.startsWith('/api') ? getProductionApiOrigin('/api/auth/login/start') : '')
      const csrfToken = await getAuthCsrfToken(authBase)
      headers['X-CSRF-Token'] = csrfToken
    } catch {
      // Proceed without token; backend will return 403 and we map to generic message
    }
  }
  if (isMutating && (isBusinessPath || isInspectorPath || isLguOfficerPath)) {
    opts.credentials = opts.credentials ?? 'include'
    try {
      const businessOrigin = origin || (isProductionBuild && path.startsWith('/api') ? getProductionApiOrigin(path) : '')
      const csrfToken = await getBusinessCsrfToken(businessPathPrefix, businessOrigin)
      headers['X-CSRF-Token'] = csrfToken
    } catch {
      // Proceed without token; backend will return 403 and we map to generic message
    }
  }
  if (isMutating && isAdminPath) {
    opts.credentials = opts.credentials ?? 'include'
    try {
      const adminOrigin = origin || (isProductionBuild && path.startsWith('/api') ? getProductionApiOrigin(path) : '')
      const csrfToken = await getAdminCsrfToken(adminOrigin)
      headers['X-CSRF-Token'] = csrfToken
    } catch {
      // Proceed without token; backend will return 403 and we map to generic message
    }
  }
  opts.headers = headers

  // Request timeout to prevent indefinite hangs. Uses AbortController.
  // Default: 30s for all requests as a safety net; explicit timeoutMs overrides.
  let timeoutId = null
  const effectiveTimeout = opts.timeoutMs ?? 30000
  if (effectiveTimeout > 0 && !opts.signal) {
    const ac = new AbortController()
    timeoutId = setTimeout(() => ac.abort(), effectiveTimeout)
    opts.signal = ac.signal
  }

  let res
  try {
    res = await fetch(apiUrl, opts)
  } catch {
    res = null
  }

  // Fallback when request fails (e.g. dev server not proxying)
  const isAuthEndpoint = path.includes('/login') || path.includes('/signup') || path.includes('/sign-up') || path.includes('/forgot-password')
  const isAdminOrMaintenanceApi = path.includes('/api/admin') || path.includes('/api/maintenance')
  const has4xxResponse = res && res.status >= 400 && res.status < 500
  // Use path-aware origin for fallback when path is /api/* (dev and prod) so /api/business falls back to 3002, not 3001
  const fallbackOrigin = path.startsWith('/api') ? (getProductionApiOrigin(path) || BACKEND_ORIGIN) : BACKEND_ORIGIN
  // In dev we use the proxy (relative URLs only). Do not retry with absolute backend URL — it can trigger CSP
  // and the backend is the same process the proxy forwards to anyway. In production we do use absolute URLs and fallback.
  const useAbsoluteFallback = isProductionBuild
  const isRelativeRequest = !origin && path.startsWith('/')
  const allow404Fallback = isAuthEndpoint && res?.status === 404 && isRelativeRequest
  const shouldFallback = (!res || !res.ok) && (!has4xxResponse || allow404Fallback) && !(isAuthEndpoint && res?.status === 500) && !isAdminOrMaintenanceApi && fallbackOrigin && useAbsoluteFallback && apiUrl !== `${fallbackOrigin.replace(/\/$/, '')}${pathStr}`

  if (shouldFallback) {
    try {
      res = await fetch(`${fallbackOrigin.replace(/\/$/, '')}${pathStr}`, opts)
    } catch {
      res = null
    }
  }

  if (timeoutId != null) clearTimeout(timeoutId)

  if (retryOnCsrfInvalid && isMutating && res?.status === 403) {
    let errorCode = null
    try {
      const retryClone = res.clone()
      const err = await retryClone.json()
      errorCode = err?.error?.code || err?.code || null
    } catch {
      errorCode = null
    }

    if (errorCode === 'csrf_invalid') {
      if (isAuthPath) clearAuthCsrfToken()
      if (businessPathPrefix) clearBusinessCsrfToken(businessPathPrefix)
      if (isAdminPath) clearAdminCsrfToken()
      return fetchWithFallback(path, { ...options, retryOnCsrfInvalid: false })
    }
  }

  // Retry on 503 (Service Unavailable) - backend is starting up
  const currentRetryCount = options._retryCount || 0
  if (retryOn503 && res?.status === 503 && currentRetryCount < maxRetries) {
    console.log(`[HTTP] Service unavailable (503), retrying in ${retryDelay}ms... (${currentRetryCount + 1}/${maxRetries})`)
    await new Promise(r => setTimeout(r, retryDelay))
    return fetchWithFallback(path, { 
      ...options, 
      _retryCount: currentRetryCount + 1,
      retryDelay: Math.min(retryDelay * 1.5, 5000) // Exponential backoff, max 5s
    })
  }

  return res
}

export async function fetchJsonWithFallback(path, options = {}) {
  const skipAutoLogout = options.skipAutoLogout === true
  const res = await fetchWithFallback(path, options)
  if (!res || !res.ok) {
    let errMsg = `Request failed: ${res?.status || 'network'}`
    let errorCode = null
    let statusCode = res?.status
    
    // Handle 401 Unauthorized - session invalidated (e.g., after password change)
    if (statusCode === 401) {
      try {
        const err = await res?.json()
        const errCode = String(err?.error?.code || err?.code || '').toLowerCase()
        const errMsgLower = String(err?.error?.message || err?.message || '').toLowerCase()
        
        // Check if this is a session invalidation error
        // Skip auto-logout for login/signup endpoints to avoid redirect loops
        const isAuthEndpoint = path.includes('/login') || path.includes('/signup') || path.includes('/sign-up') || path.includes('/forgot-password')
        
        if (!isAuthEndpoint && !skipAutoLogout) {
          // Decide based on the backend error CODE first (reliable), and only
          // fall back to specific message phrases. Do NOT match the bare word
          // "token" — that fires on unrelated 401s (e.g. "missing token") and
          // wrongly force-logs-out the user.
          const isSessionInvalidation =
            errCode === 'token_invalidated' ||
            (errMsgLower.includes('session') && errMsgLower.includes('invalidated'))
          const isTokenExpired =
            errCode === 'invalid_token' ||
            errCode === 'token_expired' ||
            errMsgLower.includes('expired') ||
            errMsgLower.includes('jwt expired')
          if (isSessionInvalidation || isTokenExpired) {
            setCurrentUser(null)
            try {
              localStorage.removeItem('auth__currentUser')
              sessionStorage.removeItem('auth__sessionUser')
            } catch { /* ignore */ }
            
            const reason = isSessionInvalidation ? 'session_invalidated' : 'token_expired'
            setTimeout(() => {
              if (window.location.pathname !== '/login' && window.location.pathname !== '/sign-up') {
                window.location.href = `/login?reason=${reason}`
              }
            }, 100)
          }
        }
      } catch { /* ignore JSON parse errors */ }
    }
    
    try {
      const err = await res?.json()
      // Normalize common error response shapes into a string message
      if (err) {
        if (typeof err.error === 'string') {
          errMsg = err.error
        } else if (typeof err.message === 'string') {
          errMsg = err.message
        } else if (err.error && typeof err.error.message === 'string') {
          errMsg = err.error.message
          // Extract error code from nested error structure (backend format: { ok: false, error: { code, message } })
          if (err.error.code) {
            errorCode = err.error.code
          }
        } else if (err.error && typeof err.error === 'object' && err.error.code) {
          // Also check if error is an object with code property
          errMsg = err.error.message || errMsg
          errorCode = err.error.code
        }
        // Backend validation: error.details is array of { message, path }
        const details = err?.error?.details ?? err?.details
        if (Array.isArray(details) && details.length > 0) {
          const first = details[0]
          const detailMsg = typeof first === 'string' ? first : first?.message
          if (detailMsg && (errorCode === 'validation_error' || res?.status === 400)) {
            errMsg = detailMsg
          }
        }
        if (Array.isArray(err.errors) && err.errors.length > 0 && !errMsg) {
          const first = err.errors[0]
          if (typeof first === 'string') errMsg = first
          else if (typeof first?.message === 'string') errMsg = first.message
        }
        // Check for code at top level
        if (!errorCode && err.code) errorCode = err.code
      }

      // On CSRF 403, clear cached token so next request refetches; never surface raw CSRF message to user
      if (statusCode === 403 && errorCode === 'csrf_invalid') {
        clearAuthCsrfToken()
        clearBusinessCsrfToken()
        clearAdminCsrfToken()
      }

      // Map error codes to user-friendly messages (never expose internal security details like CSRF)
      const codeMap = {
        'csrf_invalid': 'Request could not be completed. Please refresh the page and try again.',
        'forgot_password_not_available': 'Password reset is not available for your account type. If you are staff, use Request Recovery from the staff portal. If you are an administrator, contact another administrator.',
        'invalid_code': 'Incorrect verification code. Please check the code and try again.',
        'invalid_mfa_code': 'Incorrect verification code. Please check the code from your authenticator app and try again.',
        'verification_failed': 'Verification failed. Please check your code and try again.',
        'captcha_failed': 'CAPTCHA verification failed. Please complete the CAPTCHA and try again.',
        'invalid_credentials': 'The email address or password you entered is incorrect. Please check your credentials and try again.',
        'webauthn_verification_failed': 'Passkey verification failed. Please try again.',
        'webauthn_verification_exception': 'Registration failed. Please try again.',
        'webauthn_auth_failed': 'Authentication failed. Please try again.',
        'webauthn_invalid_publickey': 'Invalid passkey format. Please try again.',
        'credential_not_found': 'Passkey not found. Please register a passkey first.',
        'session_not_found': 'Session expired. Please scan the QR code again.',
        'session_expired': 'Session expired. Please scan the QR code again.',
        'challenge_missing': 'Session error. Please scan the QR code again.',
        'cross_device_complete_failed': 'Failed to complete authentication. Please try again.',
        'email_send_failed': 'Verification email could not be sent. Please try again in a moment, or contact support if the problem continues.',
        'request_not_found': 'Your login session expired or was not found. Please sign in again from the login page.',
        'step_up_required': 'This action requires you to confirm your identity. Please enter your authenticator code again and retry.',
        'invalid_step_up': 'Your confirmation has expired or was invalid. Please confirm your identity again and retry.',
        'step_up_user_mismatch': 'Session mismatch. Please confirm your identity again and retry.',
        'forbidden': 'You don\'t have permission to perform this action.',
        'login_code_rate_limited': 'Too many login attempts. Please wait before trying again.',
        'login_verify_rate_limited': 'Too many verification attempts. Please wait before trying again.',
        'rate_limit_exceeded': 'Too many requests. Please slow down and try again later.',
        'account_locked': 'Account temporarily locked due to too many failed attempts. Try again later.',
        'file_rejected': 'File could not be accepted. Please try a different file.',
      }
      
      if (errorCode && codeMap[errorCode]) {
        errMsg = codeMap[errorCode]
      }

      // 403: never show generic "Request failed: 403" — use backend message or friendly fallback
      if (statusCode === 403 && (!errMsg || errMsg.toLowerCase().includes('request failed'))) {
        if (err?.error?.message && !String(err.error.message).toLowerCase().includes('request failed')) {
          errMsg = err.error.message
        } else if (errorCode && codeMap[errorCode]) {
          errMsg = codeMap[errorCode]
        } else {
          errMsg = 'You don\'t have permission to perform this action. You may need to confirm your identity again.'
        }
      }

      // 401 with verification/step-up style codes: prefer user-friendly message over "Request failed"
      if (statusCode === 401 && (errorCode === 'invalid_mfa_code' || errorCode === 'verification_failed' || errorCode === 'invalid_code')) {
        if (codeMap[errorCode]) errMsg = codeMap[errorCode]
      }

      // Login credentials endpoints: never expose validation details (password length, email format, etc.)
      // and show generic invalid credentials only.
      // IMPORTANT: keep verification endpoint errors intact so OTP/TOTP screens can show correct guidance.
      const isLoginPath = path.includes('/login')
      const isLoginVerificationPath = path.includes('/login/verify') || path.includes('/login/verify-totp')
      const shouldMaskAsInvalidCredentials = isLoginPath && !isLoginVerificationPath
      if (shouldMaskAsInvalidCredentials && (statusCode === 400 || statusCode === 422 || errorCode === 'validation_error') && errorCode !== 'captcha_failed') {
        errMsg = 'The email address or password you entered is incorrect. Please check your credentials and try again.'
        errorCode = 'invalid_credentials'
      }
      
      // For 401 errors on login endpoints, assume invalid credentials if not already handled
      if (statusCode === 401 && shouldMaskAsInvalidCredentials) {
        // If we have an error code, use the mapped message
        if (errorCode && codeMap[errorCode]) {
          errMsg = codeMap[errorCode]
        } else if (!errorCode || errMsg.toLowerCase().includes('request failed')) {
          // No error code or generic message - assume invalid credentials
          errMsg = 'The email address or password you entered is incorrect. Please check your credentials and try again.'
          errorCode = 'invalid_credentials'
        }
      }
      
      // Ensure error message is never "Something went wrong"
      if (errMsg.toLowerCase().includes('something went wrong')) {
        // Try to extract a better message from the error structure
        if (err?.error?.message && !err.error.message.toLowerCase().includes('request failed')) {
          errMsg = err.error.message
        } else if (errorCode && codeMap[errorCode]) {
          errMsg = codeMap[errorCode]
        } else if (!errorCode) {
          errMsg = `Request failed: ${res?.status || 'network'}`
        }
      }
      
      const errorObj = new Error(String(errMsg))
      const errDetails = err?.error?.details ?? err?.details
      if (errDetails) errorObj.details = errDetails
      if (errorCode) {
        errorObj.code = errorCode
      }
      // Extract rate-limit retry-after from backend extra payload
      const errExtra = err?.error?.extra ?? err?.extra
      const retryAfterSec = errExtra?.retryAfterSec
      if (retryAfterSec != null) {
        errorObj.retryAfterSec = Number(retryAfterSec)
        errorObj.retryAfter = Number(retryAfterSec) * 1000
      }
      // Store status code and original error for more detailed inspection
      if (statusCode) {
        errorObj.status = statusCode
      }
      if (err) {
        errorObj.originalError = { ...err, status: statusCode }
        // Also try to extract code from originalError if not already set
        if (!errorObj.code && err.error && typeof err.error === 'object' && err.error.code) {
          errorObj.code = err.error.code
        }
      }
      throw errorObj
    } catch (e) {
      if (e.details || e.code || e.status) throw e // re-throw if it's the error we just created
      // If JSON parsing failed, create error with status code
      const errorObj = new Error(String(errMsg))
      if (statusCode) {
        errorObj.status = statusCode
        errorObj.code = statusCode === 404 ? 'not_found' : statusCode === 400 ? 'bad_request' : null
      }
      throw errorObj
    }
  }
  return res.json()
}

export async function verifyLoginTotp(payload) {
  return await fetchJsonWithFallback('/api/auth/login/verify-totp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export const get = (path, options) => fetchJsonWithFallback(path, { ...options, method: 'GET' })

export const post = (path, body, options) => fetchJsonWithFallback(path, { 
  ...options, 
  method: 'POST', 
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
    ...options?.headers
  }
})

export const put = (path, body, options) => fetchJsonWithFallback(path, { 
  ...options, 
  method: 'PUT', 
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
    ...options?.headers
  }
})

export const del = (path, options) => fetchJsonWithFallback(path, { ...options, method: 'DELETE' })

export const patch = (path, body, options) => fetchJsonWithFallback(path, {
  ...options,
  method: 'PATCH',
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
    ...options?.headers
  }
})

// Re-export shared header helper for convenience across feature services
export { authHeaders }