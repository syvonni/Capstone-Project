# syntax=docker/dockerfile:1
FROM node:18-alpine

# Build from backend root so we can include shared/
WORKDIR /backend/services/admin-service

# Copy service-specific package files
COPY services/admin-service/package*.json ./

# Install service-specific dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy service code
COPY services/admin-service/ ./

# Copy shared directory to backend root
COPY shared/ /backend/shared/

# Create symlink for shared directory in service directory
RUN ln -s /backend/shared ./shared

# Create symlink for node_modules to enable shared/ to resolve axios
RUN ln -s /backend/services/admin-service/node_modules /backend/node_modules

# Expose port
EXPOSE 3003

# Start service
CMD ["npm", "start"]
