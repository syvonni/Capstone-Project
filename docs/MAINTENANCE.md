# BizClear Maintenance Guide

## 1. Backup Procedures

### Automated Backups (Atlas)
- MongoDB Atlas provides continuous automated backups with point-in-time recovery
- Backups are encrypted at rest via AWS KMS
- Configure retention period in Atlas dashboard (default: 2 days continuous, 7 days daily snapshots)

### Manual Backup
```bash
# Run the backup script
./deploy/backup.sh

# With encryption (set BACKUP_ENCRYPTION_PASSWORD in .env)
BACKUP_ENCRYPTION_PASSWORD=<password> ./deploy/backup.sh
```

### Restore from Backup
```bash
# Atlas: use the Atlas UI to restore to a point in time
# Local: use mongorestore with the backup file
mongorestore --uri="$MONGO_URI" --drop <backup_path>
```

## 2. Database Maintenance

### Field Encryption Migration
When adding encryption to existing data:
```bash
node backend/scripts/migrate-encrypt-data.js
```

### Check Database Health
```bash
node backend/scripts/check-database.js
```

### Clear Stale Data
```bash
# Clear expired sessions (handled automatically by background jobs)
# Clear old audit view logs (30+ days)
# Background jobs run via node-cron in auth-service (src/jobs/)
```

## 3. Dependency Updates

### Backend
```bash
cd backend
npm audit                    # Check for vulnerabilities
npm audit fix                # Auto-fix non-breaking updates
npm outdated                 # List outdated packages
```

### Web Frontend
```bash
cd web
npm audit
npm audit fix
npm outdated
```

### AI Service
```bash
cd ai
pip list --outdated
pip install -r requirements.txt --upgrade
```

## 4. Monitoring

### Health Checks
Each service exposes a health endpoint:

| Service | Endpoint | Expected |
|---------|----------|----------|
| Auth | `GET /api/health` | `{ ok: true, service: 'auth-service', database: 'connected' }` |
| Business | `GET /api/health` | `{ ok: true, service: 'business-service' }` |
| Admin | `GET /api/health` | `{ ok: true, service: 'admin-service' }` |
| Audit | `GET /api/health` | `{ ok: true, service: 'audit-service' }` |

### Log Monitoring
```bash
# View all service logs
docker-compose logs -f

# View specific service
docker logs capstone-auth-service -f --tail 100

# Use Dozzle (if configured) at http://localhost:9999
```

### Security Monitoring
- `securityMonitor.js` tracks failed logins, rate limit violations, suspicious requests
- Security stats available via `GET /api/admin/monitoring/security` (admin only)
- Alerts triggered at: 5+ failed logins from same IP, 10+ rate limit violations

### Performance Monitoring
- `performanceMonitor.js` tracks API response times and database query durations
- Performance stats via `GET /api/admin/monitoring/performance` (admin only)

## 5. Scheduled Tasks

The auth-service runs background jobs via `node-cron`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Session cleanup | Every hour | Remove expired sessions |
| Security data cleanup | Every hour | Clear stale security event data (>24h) |
| Password expiry check | Daily | Flag accounts with expired passwords |

## 8. Auto-Shutdown (AWS)

For cost control on AWS deployments:
```bash
./deploy/auto-shutdown.sh
```
Configures automatic instance shutdown during off-hours.
