/**
 * Inter-Service Communication Client
 * Handles HTTP calls between microservices
 */

const { createHttpClient } = require("../../../../shared/lib/httpClient");
const logger = require("./logger");

// Create service clients
const authClient = createHttpClient("auth");
const auditClient = createHttpClient("audit");
const businessClient = createHttpClient("business");

/**
 * Call Auth Service
 */
async function callAuthService(
  endpoint,
  method = "GET",
  data = null,
  token = null,
) {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }

    let response;
    switch (method) {
      case "GET":
        response = await authClient.get(endpoint, config);
        break;
      case "POST":
        response = await authClient.post(endpoint, data, config);
        break;
      case "PUT":
        response = await authClient.put(endpoint, data, config);
        break;
      case "PATCH":
        response = await authClient.patch(endpoint, data, config);
        break;
      case "DELETE":
        response = await authClient.delete(endpoint, config);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    return { success: true, data: response };
  } catch (error) {
    logger.error("Auth Service call failed", {
      endpoint,
      method,
      error: error.message,
      status: error.response?.status,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Call Audit Service
 */
async function callAuditService(
  endpoint,
  method = "POST",
  data = null,
  token = null,
) {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }

    let response;
    switch (method) {
      case "GET":
        response = await auditClient.get(endpoint, config);
        break;
      case "POST":
        response = await auditClient.post(endpoint, data, config);
        break;
      case "PUT":
        response = await auditClient.put(endpoint, data, config);
        break;
      case "PATCH":
        response = await auditClient.patch(endpoint, data, config);
        break;
      case "DELETE":
        response = await auditClient.delete(endpoint, config);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    return { success: true, data: response };
  } catch (error) {
    logger.error("Audit Service call failed", {
      endpoint,
      method,
      error: error.message,
      status: error.response?.status,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Call Business Service
 */
async function callBusinessService(
  endpoint,
  method = "GET",
  data = null,
  token = null,
) {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }

    let response;
    switch (method) {
      case "GET":
        response = await businessClient.get(endpoint, config);
        break;
      case "POST":
        response = await businessClient.post(endpoint, data, config);
        break;
      case "PUT":
        response = await businessClient.put(endpoint, data, config);
        break;
      case "PATCH":
        response = await businessClient.patch(endpoint, data, config);
        break;
      case "DELETE":
        response = await businessClient.delete(endpoint, config);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    return { success: true, data: response };
  } catch (error) {
    logger.error("Business Service call failed", {
      endpoint,
      method,
      error: error.message,
      status: error.response?.status,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Apply approved change
 * Uses auth service's implementation when in test (shared DB) for correct User model;
 * otherwise uses local admin implementation
 */
async function applyApprovedChange(approval, token = null) {
  if (process.env.NODE_ENV === "test") {
    try {
      const authApply = require("../../../auth-service/src/lib/applyApprovedChange");
      return await authApply(approval);
    } catch (err) {
      // Fallback to local if auth path not available
    }
  }
  const applyApprovedChangeImpl = require("./applyApprovedChange");
  return await applyApprovedChangeImpl(approval);
}

/**
 * Log to blockchain via Audit Service
 */
async function logToBlockchain(operation, params, auditLogId = null) {
  return await callAuditService("/api/audit/log", "POST", {
    operation,
    params,
    auditLogId,
  });
}

module.exports = {
  callAuthService,
  callAuditService,
  callBusinessService,
  applyApprovedChange,
  logToBlockchain,
};
