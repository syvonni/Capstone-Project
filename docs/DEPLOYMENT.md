# BizClear Deployment Guide

## 1. Prerequisites

- **Docker** and **Docker Compose** (v2+)
- **Node.js** 18+ and **npm**
- **Flutter SDK** (for mobile app)

## 2. Environment Setup

Copy example env files and fill in values:

```bash
cp .env.example .env
cp backend/services/.env.example backend/services/.env
cp web/.env.example web/.env.local
```

**Required environment variables** (root `.env`):

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` or `mongodb://localhost:27017/capstone_project` |
| `JWT_SECRET` | JWT signing secret | Any strong random string (32+ chars) |
| `FIELD_ENCRYPTION_KEY` | AES-256 field encryption key | 64-char hex string |
| `EMAIL_API_KEY` | Email provider API key (Resend/SendGrid) | `re_xxxxx` |
| `DEFAULT_FROM_EMAIL` | Verified sender email | `noreply@yourdomain.com` |
| `SEED_DEV` | Seed dev accounts on startup | `true` |
| `SEED_TEMP_PASSWORD` | Temp password for seeded accounts | `TempPass123!` |

## 3. Docker Deployment (Recommended)

### One-Command Start

```bash
./start.sh              # Default start
./start.sh --dev        # Development mode (hot reload, dev OTP codes)
./start.sh --demo       # Demo/presentation mode (production build, port 4173)
./start.sh --production # Full reset (destroys DB), then fresh start
```

### Manual Docker

```bash
docker-compose up -d                    # Start all services
docker-compose -f docker-compose.dev.yml up -d   # Dev with hot reload
docker-compose logs -f auth-service     # View auth service logs
```

### Services Started by Docker

| Service | Container | Port |
|---------|-----------|------|
| MongoDB | `capstone-mongo` | 27017 |
| Auth Service | `capstone-auth-service` | 3001 |
| Business Service | `capstone-business-service` | 3002 |
| Admin Service | `capstone-admin-service` | 3003 |
| Audit Service | `capstone-audit-service` | 3004 |
| IPFS | `capstone-ipfs` | 5002 (API), 8080 (Gateway) |
| Web Frontend | `capstone-web` | 5173 (dev) / 4173 (demo) |

## 4. Local Development (No Docker)

### Backend

```bash
cd backend/services
npm run install:all
# Start each service:
cd auth-service && npm start    # Port 3001
cd business-service && npm start # Port 3002
cd admin-service && npm start    # Port 3003
cd audit-service && npm start    # Port 3004
```

### Web Frontend

```bash
cd web
npm install
npm run dev    # Port 5173
```

## 5. MongoDB Atlas (Production)

1. Create an Atlas cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Whitelist your IP or use `0.0.0.0/0` for containers
4. Set `MONGO_URI` in `.env` to the Atlas connection string (`mongodb+srv://...`)
5. Atlas enforces TLS by default — no additional config needed
6. Enable automated backups in Atlas (continuous backup with point-in-time recovery)

```bash
docker-compose -f docker-compose.atlas.yml up -d
```

## 6. Production Security Checklist

- [ ] All `.env` secrets are strong and unique
- [ ] `FIELD_ENCRYPTION_KEY` is a cryptographically random 64-char hex
- [ ] `NODE_ENV=production` is set
- [ ] CORS origin restricted to your domain (`CORS_ORIGIN=https://yourdomain.com`)
- [ ] MongoDB uses dedicated app user (not root)
- [ ] TLS enabled for all connections
- [ ] Email sender domain verified with provider
- [ ] Cloudflare Turnstile keys configured for CAPTCHA
- [ ] Automated backups enabled
- [ ] Monitoring and alerting configured

## 7. Stopping

```bash
./stop.sh                        # Stop all services
docker-compose down              # Stop and remove containers
docker-compose down -v           # Stop, remove containers AND volumes (destroys data)
```
