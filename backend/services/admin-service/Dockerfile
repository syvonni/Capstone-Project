# syntax=docker/dockerfile:1
FROM node:18-alpine

# Build from backend root so we can include shared/
WORKDIR /backend/services/admin-service

# Copy package files
COPY services/admin-service/package*.json ./

# Install dependencies (cache mount speeds up rebuilds)
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy service code
COPY services/admin-service/ ./

# Copy shared constants (required by BusinessProfile, FormGroup, etc.)
COPY shared/ /backend/shared/

# Expose port
EXPOSE 3003

# Start service
CMD ["npm", "start"]
