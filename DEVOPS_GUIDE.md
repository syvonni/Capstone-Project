# DevOps Guide

This guide provides comprehensive instructions for DevOps practices in the Capstone project, specifically for developing and deploying features like the variables feature.

## Table of Contents

- [Overview](#overview)
- [CI/CD Pipeline](#cicd-pipeline)
- [Containerization](#containerization)
- [Infrastructure as Code](#infrastructure-as-code)
- [Configuration Management](#configuration-management)
- [Deployment Strategies](#deployment-strategies)
- [Environment Management](#environment-management)
- [Database Migrations](#database-migrations)
- [Secrets Management](#secrets-management)
- [DevOps for Variables Feature](#devops-for-variables-feature)
- [Best Practices](#best-practices)

---

## Overview

DevOps combines development (Dev) and operations (Ops) to shorten the development lifecycle and provide continuous delivery with high software quality.

**Key DevOps Practices:**
- **CI/CD**: Continuous Integration and Continuous Deployment
- **IaC**: Infrastructure as Code
- **Containerization**: Docker, Kubernetes
- **Automation**: Automate everything possible
- **Monitoring**: Observe system health
- **Collaboration**: Break down silos between teams

---

## CI/CD Pipeline

### GitHub Actions for Backend

```yaml
# .github/workflows/backend-tests.yml
name: Backend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run tests
        working-directory: ./backend
        run: npm test
      
      - name: Run coverage
        working-directory: ./backend
        run: npm run test:coverage
```

### GitHub Actions for Frontend

```yaml
# .github/workflows/web-tests.yml
name: Web Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./web
        run: npm ci
      
      - name: Run unit tests
        working-directory: ./web
        run: npm run test:unit
      
      - name: Run E2E tests
        working-directory: ./web
        run: npm run test:e2e
```

### Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
          docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate
```

---

## Containerization

### Dockerfile for Backend

```dockerfile
# backend/services/business-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "src/index.js"]
```

### Dockerfile for Frontend

```dockerfile
# web/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  auth-service:
    build: ./backend/services/auth-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGO_URI=mongodb://mongodb:27017/capstone
    depends_on:
      - mongodb
  
  business-service:
    build: ./backend/services/business-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - MONGO_URI=mongodb://mongodb:27017/capstone
    depends_on:
      - mongodb
  
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
  
  web:
    build: ./web
    ports:
      - "5173:5173"
    volumes:
      - ./web:/app
      - /app/node_modules

volumes:
  mongodb-data:
```

---

## Infrastructure as Code

### Terraform for AWS

```hcl
# infrastructure/main.tf
provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  
  tags = {
    Name = "capstone-app-server"
  }
}

resource "aws_db_instance" "mongodb" {
  engine         = "mongo"
  instance_class = "db.t3.micro"
  allocated_storage = 20
  
  tags = {
    Name = "capstone-mongodb"
  }
}
```

---

## Configuration Management

### Environment Variables

```bash
# .env.development
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/capstone
JWT_SECRET=dev-secret
AUDIT_SERVICE_URL=http://localhost:3004

# .env.production
NODE_ENV=production
MONGO_URI=mongodb://production-mongodb:27017/capstone
JWT_SECRET=${PROD_JWT_SECRET}
AUDIT_SERVICE_URL=http://audit-service:3004
```

### Configuration Schema

```javascript
// backend/services/business-service/src/config/index.js
const config = {
  development: {
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/capstone',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    port: process.env.PORT || 3002,
  },
  production: {
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    port: process.env.PORT || 3002,
  },
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

---

## Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy to green environment
docker-compose -f docker-compose.green.yml up -d

# Test green environment
npm run test:e2e -- --env=green

# Switch traffic to green
docker-compose -f docker-compose.blue.yml down
docker-compose -f docker-compose.green.yml up -d

# Rollback if needed
docker-compose -f docker-compose.green.yml down
docker-compose -f docker-compose.blue.yml up -d
```

### Rolling Update

```bash
# Update one instance at a time
docker-compose up -d --no-deps --scale business-service=2
docker-compose up -d --no-deps business-service
docker-compose up -d --no-deps --scale business-service=1
```

---

## Environment Management

### Environments

**Development**
- Local development
- Hot reloading
- Debug mode enabled
- Mock services

**Staging**
- Production-like environment
- Real data (sanitized)
- Full monitoring
- Integration testing

**Production**
- Production configuration
- Real data
- Full monitoring
- No debug mode

### Environment Promotion

```bash
# Promote from dev to staging
git checkout staging
git merge develop
git push origin staging

# Promote from staging to production
git checkout production
git merge staging
git push origin production
```

---

## Database Migrations

### Migration Script

```javascript
// backend/services/business-service/migrations/001_add_variables.js
const mongoose = require('mongoose');
const Variable = require('../src/models/Variable');

module.exports = {
  async up() {
    await Variable.createIndexes([
      { customId: 1 },
      { calculationMethod: 1 },
      { isActive: 1 }
    ]);
  },
  
  async down() {
    await Variable.collection.dropIndexes();
  }
};
```

### Migration Runner

```javascript
// backend/services/business-service/scripts/migrate.js
const mongoose = require('mongoose');
const migration = require('../migrations/001_add_variables');

async function runMigrations() {
  await mongoose.connect(process.env.MONGO_URI);
  
  try {
    await migration.up();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    await migration.down();
  }
  
  await mongoose.disconnect();
}

runMigrations();
```

---

## Secrets Management

### Using Environment Variables

```bash
# Never commit secrets to git
echo "JWT_SECRET=your-secret" >> .env
echo ".env" >> .gitignore
```

### Using AWS Secrets Manager

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

// Usage
const secrets = await getSecret('capstone/production');
const jwtSecret = secrets.JWT_SECRET;
```

---

## DevOps for Variables Feature

### Feature Branch Workflow

```bash
# Create feature branch
git checkout -b feature/variables

# Make changes
git add .
git commit -m "Add variables feature"

# Push and create PR
git push origin feature/variables
```

### CI/CD for Variables Feature

```yaml
# .github/workflows/variables-feature.yml
name: Variables Feature

on:
  pull_request:
    paths:
      - 'backend/services/business-service/src/routes/adminVariables.js'
      - 'backend/services/business-service/src/models/Variable.js'
      - 'web/src/features/admin/pages/variables/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run backend tests
        working-directory: ./backend
        run: npm test -- __tests__/features/variables/
      
      - name: Run frontend tests
        working-directory: ./web
        run: npm test -- src/features/admin/pages/variables/__tests__/
      
      - name: Run security tests
        working-directory: ./backend
        run: npm test -- __tests__/security/variables.security.test.js
```

### Database Migration for Variables

```javascript
// backend/services/business-service/migrations/002_variables_indexes.js
module.exports = {
  async up() {
    await Variable.createIndexes([
      { name: 1, isActive: 1 },
      { calculationMethod: 1, isActive: 1 }
    ]);
  },
  
  async down() {
    await Variable.collection.dropIndexes();
  }
};
```

### Deployment Checklist for Variables Feature

- [ ] All tests pass
- [ ] Security tests pass
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Post-deployment monitoring

---

## Best Practices

### General DevOps Best Practices

1. **Automate Everything**: Automate builds, tests, deployments
2. **Version Control Everything**: Code, configuration, infrastructure
3. **Use Feature Branches**: Isolate feature development
4. **Test Early and Often**: Shift testing left
5. **Monitor Everything**: Monitor applications and infrastructure
6. **Document Everything**: Document processes and decisions
7. **Use Immutable Infrastructure**: Replace instead of modify
8. **Practice Least Privilege**: Minimal access required
9. **Plan for Rollback**: Always have a rollback plan
10. **Learn from Failures**: Post-mortems and improvements

### CI/CD Best Practices

1. **Fast Feedback**: Keep pipelines fast
2. **Parallel Execution**: Run tests in parallel
3. **Cache Dependencies**: Cache npm packages
4. **Artifact Management**: Store build artifacts
5. **Environment Parity**: Match production environment
6. **Security Scanning**: Scan for vulnerabilities
7. **Deployment Automation**: Automate deployments
8. **Rollback Automation**: Automate rollbacks
9. **Notification**: Notify on failures
10. **Metrics**: Track pipeline performance

### Docker Best Practices

1. **Use Official Images**: Use trusted base images
2. **Minimize Layers**: Combine RUN commands
3. **Multi-stage Builds**: Separate build and runtime
4. **Don't Run as Root**: Use non-root user
5. **Scan Images**: Scan for vulnerabilities
6. **Use .dockerignore**: Exclude unnecessary files
7. **Tag Properly**: Use semantic versioning
8. **Resource Limits**: Set memory/CPU limits
9. **Health Checks**: Implement health checks
10. **Log to stdout**: Use standard output

### Environment Management Best Practices

1. **Separate Environments**: Dev, staging, production
2. **Environment Parity**: Match production in staging
3. **Configuration Management**: Use config files
4. **Secrets Management**: Never commit secrets
5. **Data Sanitization**: Sanitize data in lower environments
6. **Environment Promotion**: Promote through environments
7. **Rollback Plan**: Have rollback procedures
8. **Monitoring**: Monitor all environments
9. **Documentation**: Document environment differences
10. **Access Control**: Restrict environment access

---

## Quick Reference

### DevOps Commands

```bash
# Build and run locally
docker-compose -f docker-compose.dev.yml up -d

# Run tests
cd backend && npm test
cd web && npm test

# Run migrations
cd backend/services/business-service
node scripts/migrate.js

# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f business-service

# Rollback deployment
docker-compose down
docker-compose -f docker-compose.previous.yml up -d
```

### DevOps Checklist

- [ ] CI/CD pipeline configured
- [ ] Docker images built
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Secrets managed securely
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Team trained on processes
