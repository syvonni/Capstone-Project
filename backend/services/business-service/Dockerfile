FROM node:18-alpine

# Build from backend root so we can include shared/
WORKDIR /backend/services/business-service

# Copy service-specific package files
COPY services/business-service/package*.json ./

# Install service-specific dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy service code
COPY services/business-service/ ./

# Copy scripts
COPY services/business-service/scripts/ ./scripts/

# Copy shared directory to backend root
COPY shared/ /backend/shared/

# Create symlink for node_modules to enable shared/ to resolve axios
RUN ln -s /backend/services/business-service/node_modules /backend/node_modules

# Copy auth-service mailer (required for email sending)
COPY services/auth-service/src/lib/mailer.js /backend/services/auth-service/src/lib/mailer.js
COPY services/auth-service/src/lib/logger.js /backend/services/auth-service/src/lib/logger.js
COPY services/auth-service/src/lib/passwordHistory.js /backend/services/auth-service/src/lib/passwordHistory.js
COPY services/auth-service/src/lib/secretCipher.js /backend/services/auth-service/src/lib/secretCipher.js

# Verify critical dependencies are installed
RUN node -e "console.log('Verifying dependencies...'); \
    try { require('qrcode'); console.log('✅ qrcode installed'); } catch(e) { console.error('❌ qrcode missing:', e.message); process.exit(1); } \
    try { require('express-session'); console.log('✅ express-session installed'); } catch(e) { console.error('❌ express-session missing:', e.message); process.exit(1); }"

# Expose port
EXPOSE 3002

# Start service
CMD ["npm", "start"]
