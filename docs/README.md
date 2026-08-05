# BizClear Documentation

> Organized documentation for the BizClear Business Permit Licensing Office (BPLO) Platform.

## Documentation Structure

| Document | Description |
|----------|-------------|
| [SECURITY.md](SECURITY.md) | Security controls, authentication, encryption, audit trail |
| [API.md](API.md) | API endpoints, schemas, authentication flows |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Local, Docker, Atlas, and production deployment |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions |
| [MAINTENANCE.md](MAINTENANCE.md) | Backup, updates, monitoring procedures |

## System Overview

BizClear is a full-stack BPLO platform comprising:

- **Web Frontend** — React + Vite (port 5173 dev / 4173 demo)
- **Mobile App** — Flutter (inspectors only)
- **Auth Service** — Express.js (port 3001) — authentication, MFA, sessions, profiles
- **Business Service** — Express.js (port 3002) — permits, applications, payments, appeals
- **Admin Service** — Express.js (port 3003) — staff management, forms, announcements
- **Audit Service** — Express.js (port 3004) — audit logging (MongoDB)
- **MongoDB** — Primary database with field-level AES-256-GCM encryption
- **IPFS** — Decentralized document storage

## Quick Start

```bash
./start.sh          # Start all services
./start.sh --dev    # Development mode (hot reload, dev codes)
./start.sh --demo   # Demo mode (production build on port 4173)
./stop.sh           # Stop all services
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup instructions.
