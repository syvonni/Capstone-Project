FROM node:18-alpine

# Build from backend root so we can include shared/
WORKDIR /backend/services/business-service

# Copy package files
COPY services/business-service/package*.json ./

# Clear npm cache and install dependencies without cache
RUN npm cache clean --force && \
    npm install --no-cache --production=false

# Copy service code
COPY services/business-service/ ./

# Copy scripts
COPY services/business-service/scripts/ ./scripts/

# Copy shared constants (required by BusinessProfile.js: ../../../../shared/constants)
COPY shared/ /backend/shared/

# Copy auth-service mailer (required for email sending)
COPY services/auth-service/src/lib/mailer.js /backend/services/auth-service/src/lib/mailer.js
COPY services/auth-service/src/lib/logger.js /backend/services/auth-service/src/lib/logger.js

# Install axios in auth-service path for mailer
RUN cd /backend/services/auth-service && npm install axios

# Verify critical dependencies are installed
RUN node -e "console.log('Verifying dependencies...'); \
    try { require('qrcode'); console.log('✅ qrcode installed'); } catch(e) { console.error('❌ qrcode missing:', e.message); process.exit(1); } \
    try { require('express-session'); console.log('✅ express-session installed'); } catch(e) { console.error('❌ express-session missing:', e.message); process.exit(1); } \
    try { require('pdfkit'); console.log('✅ pdfkit installed'); } catch(e) { console.error('❌ pdfkit missing:', e.message); process.exit(1); } \
    try { require('axios'); console.log('✅ axios installed'); } catch(e) { console.error('❌ axios missing:', e.message); process.exit(1); }"

# Expose port
EXPOSE 3002

# Start service
CMD ["npm", "start"]
