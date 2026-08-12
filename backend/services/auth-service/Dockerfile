# syntax=docker/dockerfile:1
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Build from backend root so we can include shared/
WORKDIR /backend/services/auth-service

# Copy service-specific package files
COPY services/auth-service/package*.json ./

# Install service-specific dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy service code
COPY services/auth-service/ ./

# Copy shared directory to backend root
COPY shared/ /backend/shared/

# Create symlink for node_modules to enable shared/ to resolve axios
RUN ln -s /backend/services/auth-service/node_modules /backend/node_modules

# Verify critical dependencies are installed
RUN node -e "console.log('Verifying dependencies...'); try { require('speakeasy'); console.log('✅ speakeasy installed'); } catch(e) { console.error('❌ speakeasy missing:', e.message); process.exit(1); }"

# Expose port
EXPOSE 3001

# Start service
CMD ["npm", "start"]
