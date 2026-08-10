const axios = require("axios");

/**
 * Create an HTTP client configured for a specific microservice
 * @param {string} serviceName - Service name (auth, admin, business, audit)
 * @param {object} config - Additional axios configuration
 * @returns {AxiosInstance} Configured axios instance
 */
function createHttpClient(serviceName, config = {}) {
  const serviceUrls = {
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
    admin: process.env.ADMIN_SERVICE_URL || "http://localhost:3003",
    business: process.env.BUSINESS_SERVICE_URL || "http://localhost:3002",
    audit: process.env.AUDIT_SERVICE_URL || "http://localhost:3004",
  };

  const baseURL = serviceUrls[serviceName];
  if (!baseURL) {
    throw new Error(`Unknown service name: ${serviceName}`);
  }

  const client = axios.create({
    baseURL,
    timeout: 30000,
    ...config,
  });

  // Add API key for audit service calls
  if (serviceName === "audit" && process.env.AUDIT_SERVICE_API_KEY) {
    client.interceptors.request.use((config) => {
      config.headers["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;
      return config;
    });
  }

  return client;
}

// Pre-configured clients for common services
const auditClient = createHttpClient("audit");
const authClient = createHttpClient("auth");
const adminClient = createHttpClient("admin");
const businessClient = createHttpClient("business");

module.exports = {
  createHttpClient,
  auditClient,
  authClient,
  adminClient,
  businessClient,
};
