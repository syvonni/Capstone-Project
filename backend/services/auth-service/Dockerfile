# syntax=docker/dockerfile:1
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Build from backend root so we can include shared/
WORKDIR /backend/services/auth-service

# Copy package files
COPY services/auth-service/package*.json ./

# Clear npm cache and install dependencies without cache
RUN npm cache clean --force && \
    npm install --no-cache --production=false

# Copy service code
COPY services/auth-service/ ./

# Copy shared directory (required by models for encryptionPlugin, etc.)
COPY shared/ /backend/shared/

# Verify critical dependencies are installed
RUN node -e "console.log('Verifying dependencies...'); try { require('speakeasy'); console.log('✅ speakeasy installed'); } catch(e) { console.error('❌ speakeasy missing:', e.message); process.exit(1); }"

# Expose port
EXPOSE 3001

# Start service
CMD ["npm", "start"]
