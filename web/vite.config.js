/// <reference types="vitest/config" />
/* global process */
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Backend Port Configuration
 * 
 * This configuration supports TWO deployment modes:
 * 
 * 1. MICROSERVICES MODE (Docker Compose - default):
 *    - Auth Service: port 3001
 *    - Business Service: port 3002
 *    - Admin Service: port 3003
 *    - Audit Service: port 3004
 *    This is what start.ps1 uses when running with Docker
 * 
 * 2. UNIFIED BACKEND MODE (Local development):
 *    - All services on port 3000 (backend/src/index.js)
 *    - Use when running backend locally without Docker
 * 
 * Configuration:
 * - Set VITE_USE_MICROSERVICES=true to use microservices (ports 3001-3004)
 * - Set VITE_USE_MICROSERVICES=false or unset to use unified backend (port 3000)
 * - Or set VITE_BACKEND_PORT to override the unified backend port
 * 
 * Example .env.local:
 *   VITE_USE_MICROSERVICES=true    # Use Docker microservices
 *   # OR
 *   VITE_BACKEND_PORT=3000         # Use unified backend on port 3000
 */

// Load environment variables from .env files BEFORE reading them
// This fixes the Vite caching bug where process.env is read before .env files are loaded
const env = loadEnv(process.env.NODE_ENV || 'development', __dirname);

// Default to microservices mode (Docker Compose) since that's what start.ps1 uses
// Set VITE_USE_MICROSERVICES=false to use unified backend (port 3000)
const USE_MICROSERVICES = env.VITE_USE_MICROSERVICES !== 'false' &&
                          env.VITE_USE_MICROSERVICES !== '0';

// Storybook/Vitest browser project is opt-in to avoid Playwright download errors.
// Enable with VITEST_STORYBOOK=true when you have Playwright browsers installed.
const ENABLE_STORYBOOK_TESTS = env.VITEST_STORYBOOK === 'true';

// Microservices configuration (Docker Compose setup)
const MICROSERVICES = {
  auth: Number(env.VITE_AUTH_PORT) || 3001,
  business: Number(env.VITE_BUSINESS_PORT) || 3002,
  admin: Number(env.VITE_ADMIN_PORT) || 3003,
  audit: Number(env.VITE_AUDIT_PORT) || 3004,
};

// Unified backend configuration (local development)
const UNIFIED_BACKEND_PORT = Number(env.VITE_BACKEND_PORT) || 3000;
const UNIFIED_BACKEND_TARGET = `http://localhost:${UNIFIED_BACKEND_PORT}`;

if (USE_MICROSERVICES) {
  console.log(`[Vite Config] Using MICROSERVICES mode (Docker Compose)`);
  console.log(`[Vite Config] Auth: ${MICROSERVICES.auth}, Business: ${MICROSERVICES.business}, Admin: ${MICROSERVICES.admin}, Audit: ${MICROSERVICES.audit}`);
} else {
  console.log(`[Vite Config] Using UNIFIED BACKEND mode (Local)`);
  console.log(`[Vite Config] Backend target: ${UNIFIED_BACKEND_TARGET}`);
}

// SSE proxy config: no timeouts, buffering disabled — required for long-lived event streams
function createSSEProxyConfig(path, target) {
  return {
    target: target,
    changeOrigin: true,
    secure: false,
    selfHandleResponse: false,
    configure: (proxy, _options) => {
      console.log(`[Proxy SSE] ${path} -> ${target}`);
      proxy.on('proxyReq', (proxyReq, _req, _res) => {
        // Disable keep-alive compression so chunks flush immediately
        proxyReq.setHeader('Accept-Encoding', 'identity')
      })
      proxy.on('proxyRes', (proxyRes, _req, res) => {
        // Disable buffering on the proxy response side
        proxyRes.headers['x-accel-buffering'] = 'no'
        proxyRes.headers['cache-control'] = 'no-cache'
        if (res.setHeader) res.setHeader('X-Accel-Buffering', 'no')
      })
      proxy.on('error', (err, _req, res) => {
        console.error(`[Proxy SSE Error] ${path} to ${target}:`, err.message)
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' })
          res.end('Bad Gateway: Backend server not available')
        }
      })
    },
  }
}

// Helper function to create proxy config with error handling
function createProxyConfig(path, target, customConfig = {}) {
  return {
    target: target,
    changeOrigin: true,
    secure: false,
    ws: true,
    // Timeout to prevent indefinite hangs when backend is slow/unavailable
    timeout: 15000,        // 15s timeout for proxy to connect to backend
    proxyTimeout: 30000,   // 30s timeout for backend to respond
    ...customConfig,
    configure: (proxy, _options) => {
      console.log(`[Proxy] ${path} -> ${target}`);
      
      proxy.on('error', (err, req, res) => {
        console.error(`[Proxy Error] ${path} to ${target}:`, err.message);
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
          console.warn(`[Proxy] Connection failed to ${target}`);
          if (USE_MICROSERVICES) {
            console.warn(`[Proxy] Make sure Docker services are running: docker-compose up -d`);
          } else {
            console.warn(`[Proxy] Make sure backend is running on port ${UNIFIED_BACKEND_PORT}`);
            console.warn(`[Proxy] Or set VITE_USE_MICROSERVICES=true to use Docker microservices`);
          }
        }
        if (res && !res.headersSent) {
          res.writeHead(502, {
            'Content-Type': 'text/plain',
          });
          res.end('Bad Gateway: Backend server not available');
        }
      });
      
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        console.log(`[Proxy Request] ${req.method} ${req.url} -> ${target}${req.url}`);
      });
      
      proxy.on('proxyRes', (proxyRes, req, _res) => {
        console.log(`[Proxy Response] ${proxyRes.statusCode} ${req.url}`);
      });
      
      if (customConfig.configure) {
        customConfig.configure(proxy, _options);
      }
    },
  };
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const vitestProjects = [
  {
    plugins: [react()],
    test: {
      name: 'unit',
      environment: 'jsdom',
      setupFiles: ['src/test.setup.js'],
      globals: true,
      include: [
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'src/**/__tests__/**/*.{js,jsx,ts,tsx}'
      ],
      exclude: [
        'src/**/*.stories.@(js|jsx|ts|tsx)',
        'src/**/*.mdx'
      ],
      environmentOptions: {
        jsdom: {
          url: 'http://localhost:3000',
          pretendToBeVisual: false,
          resources: 'usable'
        }
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        reportsDirectory: './coverage',
        thresholds: {
          lines: 60,
          statements: 60,
          branches: 50,
          functions: 55
        }
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  }
];

if (ENABLE_STORYBOOK_TESTS) {
  vitestProjects.push({
    extends: true,
    plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(__dirname, '.storybook')
      })
    ],
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({}),
        instances: [{
          browser: 'chromium'
        }]
      },
      setupFiles: ['.storybook/vitest.setup.js']
    }
  });
}

// Read DEV_EMAIL_* from root .env so dev prefill buttons use the correct emails.
// Vite only exposes VITE_ vars, so we bridge them here as compile-time defines.
const rootEnvPath = path.resolve(__dirname, '..', '.env');
const devEmailDefines = {};
try {
  const rootEnv = fs.readFileSync(rootEnvPath, 'utf-8');
  for (const line of rootEnv.split('\n')) {
    const m = line.match(/^\s*(DEV_EMAIL_\w+)\s*=\s*(.+?)\s*$/);
    if (m) devEmailDefines[`import.meta.env.VITE_${m[1]}`] = JSON.stringify(m[2]);
  }
} catch { /* root .env missing — prefills use @example.com defaults */ }

// Security headers for SPA (CSP, X-Frame-Options) — dev and preview
// In dev, connect-src must allow backend origins (proxy or direct) and HMR websocket
const CSP_CONNECT_SRC = [
  "'self'",
  "https://challenges.cloudflare.com",
  "https://psgc.gitlab.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://127.0.0.1:3004",
  "https://192.168.18.12:3000",
  "https://192.168.18.12:3001",
  "https://192.168.18.12:3002",
  "https://192.168.18.12:3003",
  "https://192.168.18.12:3004",
  "ws://localhost:5173",
  "ws://127.0.0.1:5173",
  "wss://192.168.18.12:5173",
  "ws://localhost:5174",
  "ws://127.0.0.1:5174",
  "ws://localhost:3002",
  "ws://127.0.0.1:3002",
].join(' ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: http://localhost:8080 http://127.0.0.1:8080 http://*.ipfs.localhost:8080",
    `connect-src ${CSP_CONNECT_SRC}`,
    "frame-src 'self' blob: data: https://challenges.cloudflare.com http://challenges.cloudflare.com http://localhost:8080 http://127.0.0.1:8080 http://*.ipfs.localhost:8080 https://maps.google.com https://www.google.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Frame-Options': 'SAMEORIGIN',
};

export default defineConfig({
  plugins: [react()],
  define: devEmailDefines,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    projects: vitestProjects
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (required for mobile device access)
    port: 5173,
    hmr: true, // Hot Module Replacement (default: true) — ensures dev server pushes updates
    allowedHosts: [
      '.trycloudflare.com', // Allow Cloudflare tunnel URLs for HTTPS mobile access
      '.ngrok-free.dev', // Allow ngrok URLs
      'localhost',
      '127.0.0.1',
      '192.168.18.12',
    ],
    headers: SECURITY_HEADERS,
    proxy: USE_MICROSERVICES ? {
      // MICROSERVICES MODE: Route to specific service ports
      
      // Auth endpoints -> Auth Service (port 3001)
      '/api/auth': createProxyConfig('/api/auth', `http://localhost:${MICROSERVICES.auth}`),
      
      // Business endpoints -> Business Service (port 3002)
      '/api/business': createProxyConfig('/api/business', `http://localhost:${MICROSERVICES.business}`),
      '/api/public/business': createProxyConfig('/api/public/business', `http://localhost:${MICROSERVICES.business}`),
      '/api/help-requests': createProxyConfig('/api/help-requests', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-manager': createProxyConfig('/api/lgu-manager', `http://localhost:${MICROSERVICES.business}`),
      '/api/bookmarks': createProxyConfig('/api/bookmarks', `http://localhost:${MICROSERVICES.business}`),

      // Admin endpoints -> Admin Service (port 3003)
      '/api/admin': createProxyConfig('/api/admin', `http://localhost:${MICROSERVICES.admin}`),
      
      // Audit endpoints -> Audit Service (port 3004)
      '/api/audit': createProxyConfig('/api/audit', `http://localhost:${MICROSERVICES.audit}`),
      
      // Maintenance endpoints -> Admin Service (port 3003)
      '/api/maintenance': createProxyConfig('/api/maintenance', `http://localhost:${MICROSERVICES.admin}`),

      // LGU Officer inspection-assignment endpoints -> Business Service (port 3002)
      '/api/lgu-officer/inspectors': createProxyConfig('/api/lgu-officer/inspectors', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/businesses-for-inspection': createProxyConfig('/api/lgu-officer/businesses-for-inspection', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/inspections': createProxyConfig('/api/lgu-officer/inspections', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/payments': createProxyConfig('/api/lgu-officer/payments', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/owner-profile': createProxyConfig('/api/lgu-officer/owner-profile', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/businesses': createProxyConfig('/api/lgu-officer/businesses', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/permit-applications': createProxyConfig('/api/lgu-officer/permit-applications', `http://localhost:${MICROSERVICES.business}`),
      '/api/lgu-officer/walk-in-applications': createProxyConfig('/api/lgu-officer/walk-in-applications', `http://localhost:${MICROSERVICES.business}`),

      // LGU Officer endpoints -> Business Service (port 3002)
      '/api/lgu-officer': createProxyConfig('/api/lgu-officer', `http://localhost:${MICROSERVICES.business}`),
      
      // Public LGU endpoints -> Admin Service (port 3003)
      '/api/lgus': createProxyConfig('/api/lgus', `http://localhost:${MICROSERVICES.admin}`),
      
      // Public Form Definition endpoints -> Admin Service (port 3003)
      '/api/forms': createProxyConfig('/api/forms', `http://localhost:${MICROSERVICES.admin}`),
      
      // Public Permit Forms endpoints -> Admin Service (port 3003)
      '/api/public/permit-forms': createProxyConfig('/api/public/permit-forms', `http://localhost:${MICROSERVICES.admin}`),
      
      // Public CMS endpoints -> Admin Service (port 3003)
      '/api/cms': createProxyConfig('/api/cms', `http://localhost:${MICROSERVICES.admin}`),
      
      // Uploads -> Business Service (port 3002)
      '/uploads': createProxyConfig('/uploads', `http://localhost:${MICROSERVICES.business}`),
      
      // SSE stream (long-lived) -> Auth Service — no proxy timeout
      '/api/notifications/stream': createSSEProxyConfig('/api/notifications/stream', `http://localhost:${MICROSERVICES.auth}`),

      // Catch-all for other API routes -> Auth Service (port 3001)
      '/api': createProxyConfig('/api', `http://localhost:${MICROSERVICES.auth}`)
    } : {
      // UNIFIED BACKEND MODE: All routes to single backend (port 3000)
      
      // All API endpoints -> Unified Backend (port 3000)
      '/api/auth': createProxyConfig('/api/auth', UNIFIED_BACKEND_TARGET),
      '/api/business': createProxyConfig('/api/business', UNIFIED_BACKEND_TARGET),
      '/api/help-requests': createProxyConfig('/api/help-requests', UNIFIED_BACKEND_TARGET),
      '/api/admin': createProxyConfig('/api/admin', UNIFIED_BACKEND_TARGET),
      '/api/audit': createProxyConfig('/api/audit', UNIFIED_BACKEND_TARGET),
      '/api/maintenance': createProxyConfig('/api/maintenance', UNIFIED_BACKEND_TARGET),
      '/api/lgu-officer': createProxyConfig('/api/lgu-officer', UNIFIED_BACKEND_TARGET),
      '/api/lgu-manager': createProxyConfig('/api/lgu-manager', UNIFIED_BACKEND_TARGET),
      '/api/lgus': createProxyConfig('/api/lgus', UNIFIED_BACKEND_TARGET),
      '/api/forms': createProxyConfig('/api/forms', UNIFIED_BACKEND_TARGET),
      '/api/cms': createProxyConfig('/api/cms', UNIFIED_BACKEND_TARGET),
      '/uploads': createProxyConfig('/uploads', UNIFIED_BACKEND_TARGET),
      // SSE stream (long-lived) — no proxy timeout
      '/api/notifications/stream': createSSEProxyConfig('/api/notifications/stream', UNIFIED_BACKEND_TARGET),

      '/api': createProxyConfig('/api', UNIFIED_BACKEND_TARGET),
    }
  }
});
