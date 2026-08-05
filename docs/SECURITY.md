# BizClear Security Documentation

## 1. Authentication

### 1.1 Password Storage
- **Algorithm:** bcrypt with 10 salt rounds (`bcryptjs`)
- **Password history:** Last 5 hashes stored to prevent reuse
- **90-day expiry:** `passwordChangedAt` triggers forced rotation via `isPasswordExpiredByPolicy()`
- **Source:** `backend/services/auth-service/src/routes/login.js`

### 1.2 Session Management
- **Model:** `Session.js` — stores userId, tokenVersion, IP, user agent, expiry, active status
- **Role-based timeouts:** Admin 10 min, Staff/Business Owner 60 min
- **Token versioning:** Incrementing `tokenVersion` invalidates all existing sessions instantly
- **Cookie flags:** `secure: true` (production), `sameSite: 'lax'`

### 1.3 Multi-Factor Authentication (MFA)
- **TOTP:** Authenticator app via `speakeasy` — setup, verify, disable flows (`mfa.js`)
- **FIDO2 Passkeys:** WebAuthn registration and authentication (`webauthn.js`)
- **MFA bootstrap:** One-time token for first-time setup (`mfaBootstrap.js`)
- **Enforcement:** Mandatory for staff/admin roles (`mustSetupMfa` flag)
- **Replay prevention:** `mfaLastUsedTotpCounter` rejects reused TOTP codes
- **Secret encryption:** MFA secret encrypted with user's password hash (`secretCipher.js`)

### 1.4 JWT Token Validation
- **Middleware:** `requireJwt()` in `auth.js` — verifies signature, expiry, tokenVersion
- **Payload:** `sub`, `email`, `role`, `tokenVersion`, `iat`, `exp`
- **Step-up tokens:** 5-minute short-lived JWTs for admin-sensitive operations
- **Role enforcement:** `requireRole(allowedRoles)` middleware

### 1.5 Rate Limiting & Account Lockout
- **Login start:** 5 requests per 10 min per email
- **Login verify:** 10 attempts per 10 min per email
- **Account lockout:** 5 failed attempts → 15-minute lockout (`accountLockout.js`)
- **CAPTCHA:** Cloudflare Turnstile integration (`turnstile.js`)
- **Source:** `backend/services/auth-service/src/middleware/rateLimit.js`

### 1.6 Logout & Session Invalidation
- `POST /api/auth/logout` — audit log + notification
- `POST /api/auth/session/invalidate` — invalidate specific session
- `POST /api/auth/session/invalidate-all` — invalidate all other sessions

---

## 2. Input Validation

### 2.1 Schema Validation (Joi)
- **Middleware:** `validateBody(schema)` — `abortEarly: false`, `stripUnknown: true`
- Every endpoint has a Joi schema defining fields, types, min/max, patterns
- Role injection blocked: `role` field marked forbidden; returns `403 field_restricted`
- **Source:** `backend/services/auth-service/src/middleware/validation.js`

### 2.2 SQL / NoSQL Injection Protection
- **Sanitizer:** `containsSqlInjection()` — 11 regex patterns (UNION, SELECT, DROP, etc.)
- **NoSQL protection:** `sanitizeObject()` strips `$`-prefixed keys (prevents MongoDB operator injection)
- **Mongoose ORM:** All queries parameterized by default
- **Source:** `backend/services/auth-service/src/lib/sanitizer.js`

### 2.3 XSS Protection
- **Detection:** `containsXss()` — `<script>`, `<iframe>`, `javascript:`, event handlers
- **Cleaning:** `sanitizeString()` — removes script tags, event handlers, null bytes, shell metacharacters
- **CSP:** Helmet with strict Content-Security-Policy (`script-src: 'self'`)
- **Source:** `backend/services/auth-service/src/index.js` (L43–56)

### 2.4 CSRF Protection
- **Method:** Double-submit cookie pattern
- **Token:** `crypto.randomBytes(32).toString('hex')` (256-bit)
- **Flow:** SPA reads `csrf-token` cookie → sends in `X-CSRF-Token` header → middleware compares
- **Cookie:** `secure: true`, `sameSite: 'lax'`, 24-hour max-age
- **Source:** `backend/services/auth-service/src/lib/csrf.js`

---

## 3. Database Security

### 3.1 Field-Level Encryption (AES-256-GCM)
- **Cipher:** AES-256-GCM with 12-byte IV (`backend/shared/lib/fieldCipher.js`)
- **Plugin:** Mongoose auto-encrypt on save / auto-decrypt on find (`encryptionPlugin.js`)
- **Modes:**
  - Randomized (`enc:v2:` prefix) — different ciphertext each time (PII fields)
  - Deterministic (`det:v2:` prefix) — same ciphertext for same input (searchable fields like email)
- **Coverage:** 35+ models across auth-service and business-service
- **Key:** `FIELD_ENCRYPTION_KEY` environment variable (256-bit)

### 3.2 Role-Based Access Control
- **Application:** Role model with slugs: `admin`, `staff`, `business_owner`, `inspector`, `lgu_officer`
- **Middleware:** `requireRole()`, `requireAdminStepUp()`
- **Database:** Dedicated MongoDB app user with restricted privileges

### 3.3 TLS Connections
- MongoDB Atlas enforces TLS by default (`mongodb+srv://`)
- Docker TLS config: `docker-compose.tls.yml` with certificates

### 3.4 Backups
- `deploy/backup.sh` — automated MongoDB backup script
- Atlas: continuous automated backups with point-in-time recovery (encrypted at rest)

---

## 4. Audit Trail

### 4.1 Comprehensive Logging
All critical actions generate audit log entries with SHA-256 hashes:
- Login, logout, MFA enable/disable, session invalidation
- Profile updates, password changes, email changes
- Account deletion, security events (suspicious activity)
- **Source:** `backend/services/auth-service/src/lib/auditLogger.js`

### 4.2 Tamper-Evidence
- **SHA-256 hashing:** Every audit entry hashed from `userId + eventType + fieldChanged + oldValue + newValue + role + metadata + timestamp`
- **Database storage:** Audit logs stored in MongoDB with hash verification

### 4.3 Security Monitoring
- `securityMonitor.js` — real-time detection of SQL injection, XSS, suspicious user agents, rapid requests
- Alert thresholds: 5+ failed logins → high-severity alert; 10+ rate limit violations → alert
- All security events logged to both structured logger and audit trail

---

## 5. Smart Contract Security

### 5.1 Access Control
- `AccessControl.sol` — 4 roles: ADMIN, AUDITOR, USER_REGISTRAR, DOCUMENT_MANAGER
- All write functions gated by role-specific modifiers (`onlyAuditor()`, `onlyDocumentManager()`, etc.)
- `onlyOwner` modifier for administrative operations

### 5.2 Input Validation
- Zero-address checks on all constructors
- Zero-hash and empty-string checks on all logging functions
- Duplicate hash prevention via `hashExists` mapping

### 5.3 Gas Optimization
- V1→V2: `verifyHash()` optimized from O(n) loop to O(1) mapping lookup
- V2: Compact logging (hash-only, numeric event codes) — ~60–70% gas reduction
- V2: Batch logging — up to 50 hashes per transaction
- V3: Epoch digest root anchoring — single hash for entire time window (~87.4% reduction)
