# BizClear Troubleshooting Guide

## 1. Docker & Startup Issues

### Services won't start
```bash
# Check container status
docker-compose ps

# View logs for a specific service
docker logs capstone-auth-service 2>&1 | tail -50

# Restart a specific service
docker-compose up -d --force-recreate auth-service
```

### Port already in use
```bash
# Find what's using the port
lsof -i :3001

# Kill the process or change the port in .env
kill -9 <PID>
```

### MongoDB connection failed
- Verify `MONGO_URI` in `.env` is correct
- For Docker: ensure mongo container is running (`docker-compose ps`)
- For Atlas: check IP whitelist and credentials
- Auth service retries 10 times with 2-second delays before failing

### IPFS not available
- IPFS is optional — file uploads fall back to local storage
- Use `./start.sh --skip-ipfs` to skip IPFS container
- Check: `docker logs capstone-ipfs 2>&1 | tail -20`

## 2. Authentication Issues

### "Invalid email or password"
- This is a **generic error** (by design — no info leakage)
- Verify the email exists in the database
- Check the password is exactly right (case-sensitive, including special chars)
- Default seeded password: `TempPass123!` (capital T, P, and `!`)

### "Account locked"
- After 5 failed attempts → 15-minute lockout
- Wait for lockout to expire, or admin can unlock:
  ```bash
  node backend/scripts/reset-admin-mfa.js <email>
  ```

### Login OTP not arriving
Check auth-service logs:
```bash
docker logs capstone-auth-service 2>&1 | tail -80
```
- **"Mock sender"**: `EMAIL_API_KEY` not set — code is only in logs
- **"EMAIL API FAILED"**: Sender domain not verified with provider
- **"TOTP MFA enabled"**: User has authenticator app — no email OTP sent

### JWT token_invalidated
- Another session called "invalidate all"
- User's `tokenVersion` was incremented
- Solution: log in again to get a new token

### CSRF invalid (403)
- Ensure SPA reads the `csrf-token` cookie and sends it in `X-CSRF-Token` header
- Cookie may have expired (24-hour max-age) — refresh by calling `GET /api/auth/csrf-token`

## 3. Database Issues

### Encrypted fields showing ciphertext
- This is **expected** when querying MongoDB directly (mongosh/Compass)
- Fields prefixed with `enc:v2:` (randomized) or `det:v2:` (deterministic) are encrypted
- The application decrypts automatically via the Mongoose plugin
- If `FIELD_ENCRYPTION_KEY` is missing or wrong, decryption will fail silently

### Migration after adding encryption
```bash
node backend/scripts/migrate-encrypt-data.js
```
This encrypts any existing plaintext data in the database.

## 4. Blockchain Issues

### Smart contract deployment failed
```bash
# Ensure Ganache is running
docker logs capstone-ganache 2>&1 | tail -20

# Redeploy contracts
cd blockchain
npx truffle migrate --reset --network development
node write-env.js
node GRANT_ROLES.js
```

### "Caller does not have AUDITOR_ROLE"
- Roles need to be granted after contract deployment
- Run: `cd blockchain && node GRANT_ROLES.js`

### Audit log blockchain anchoring failed
- This is **non-blocking** — audit logs still save to MongoDB
- Check audit service: `docker logs capstone-audit-service 2>&1 | tail -20`
- Verify Ganache is running and contracts are deployed
- Business description may be too short (minimum 10 chars)
- Try lowering `minConfidence` or providing a more descriptive input

## 6. Web Frontend Issues

### Blank page / build errors
```bash
cd web
rm -rf node_modules
npm install
npm run dev
```

### API calls returning 401
- Token may have expired — log in again
- Check that `VITE_BACKEND_ORIGIN` in `web/.env.local` points to the correct backend

### WebSocket connection errors
- Transient "WebSocket closed before connection established" in dev mode is normal (React StrictMode)
- Socket reconnects automatically
