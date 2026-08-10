/**
 * Security Testing Utilities
 * Reusable helper functions for testing security features across all endpoints
 */

/**
 * Rate Limiting Tests
 */

/**
 * Test that rate limit is enforced after exceeding max requests
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} token - Authentication token
 * @param {Object} requestData - Request body/data
 * @param {number} maxRequests - Expected max requests before rate limit
 * @returns {Promise<Object>} Test results
 */
async function testRateLimitExceeded(
  app,
  endpoint,
  method,
  token,
  requestData = {},
  maxRequests = 100,
) {
  const request = require("supertest");
  let rateLimitReached = false;
  let successfulRequests = 0;
  let rateLimitResponse = null;

  for (let i = 0; i < maxRequests + 5; i++) {
    let response;
    switch (method.toUpperCase()) {
      case "GET":
        response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${token}`);
        break;
      case "POST":
        response = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send(requestData);
        break;
      case "PUT":
        response = await request(app)
          .put(endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send(requestData);
        break;
      case "DELETE":
        response = await request(app)
          .delete(endpoint)
          .set("Authorization", `Bearer ${token}`);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    if (response.status === 429) {
      rateLimitReached = true;
      rateLimitResponse = response;
      break;
    }
    successfulRequests++;
  }

  return {
    rateLimitReached,
    successfulRequests,
    rateLimitResponse,
    passed: rateLimitReached && successfulRequests <= maxRequests,
  };
}

/**
 * Test that rate limit resets after window expires
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {string} token - Authentication token
 * @param {Object} requestData - Request body/data
 * @param {number} windowMs - Rate limit window in milliseconds
 * @returns {Promise<Object>} Test results
 */
async function testRateLimitReset(
  app,
  endpoint,
  method,
  token,
  requestData = {},
) {
  const request = require("supertest");

  // First, exhaust the rate limit
  await testRateLimitExceeded(app, endpoint, method, token, requestData, 100);

  // Wait for window to expire (in real tests, you'd mock time)
  // For now, just verify the logic exists
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Try one more request
  let response;
  switch (method.toUpperCase()) {
    case "GET":
      response = await request(app)
        .get(endpoint)
        .set("Authorization", `Bearer ${token}`);
      break;
    case "POST":
      response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(requestData);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    resetSuccessful: response.status !== 429,
    response,
  };
}

/**
 * Authorization Tests
 */

/**
 * Test that unauthenticated requests are rejected
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {Object} requestData - Request body/data
 * @returns {Promise<Object>} Test results
 */
async function testUnauthorizedAccess(app, endpoint, method, requestData = {}) {
  const request = require("supertest");

  let response;
  switch (method.toUpperCase()) {
    case "GET":
      response = await request(app).get(endpoint);
      break;
    case "POST":
      response = await request(app).post(endpoint).send(requestData);
      break;
    case "PUT":
      response = await request(app).put(endpoint).send(requestData);
      break;
    case "DELETE":
      response = await request(app).delete(endpoint);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    unauthorized: response.status === 401,
    response,
    passed: response.status === 401,
  };
}

/**
 * Test that requests without proper role are rejected
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {string} token - Authentication token with insufficient role
 * @param {Object} requestData - Request body/data
 * @returns {Promise<Object>} Test results
 */
async function testForbiddenAccess(
  app,
  endpoint,
  method,
  token,
  requestData = {},
) {
  const request = require("supertest");

  let response;
  switch (method.toUpperCase()) {
    case "GET":
      response = await request(app)
        .get(endpoint)
        .set("Authorization", `Bearer ${token}`);
      break;
    case "POST":
      response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(requestData);
      break;
    case "PUT":
      response = await request(app)
        .put(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(requestData);
      break;
    case "DELETE":
      response = await request(app)
        .delete(endpoint)
        .set("Authorization", `Bearer ${token}`);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    forbidden: response.status === 403,
    response,
    passed: response.status === 403,
  };
}

/**
 * Test role-based access control
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {Object} tokens - Object with tokens for different roles
 * @param {Object} requestData - Request body/data
 * @returns {Promise<Object>} Test results by role
 */
async function testRoleBasedAccess(
  app,
  endpoint,
  method,
  tokens,
  requestData = {},
) {
  const results = {};

  for (const [role, token] of Object.entries(tokens)) {
    let response;
    switch (method.toUpperCase()) {
      case "GET":
        response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${token}`);
        break;
      case "POST":
        response = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send(requestData);
        break;
      case "PUT":
        response = await request(app)
          .put(endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send(requestData);
        break;
      case "DELETE":
        response = await request(app)
          .delete(endpoint)
          .set("Authorization", `Bearer ${token}`);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    results[role] = {
      status: response.status,
      success: response.status >= 200 && response.status < 300,
    };
  }

  return results;
}

/**
 * Field Allowlisting Tests
 */

/**
 * Test that protected fields cannot be updated
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {string} token - Authentication token
 * @param {string} protectedField - Name of protected field to test
 * @returns {Promise<Object>} Test results
 */
async function testProtectedFieldUpdate(
  app,
  endpoint,
  method,
  token,
  protectedField,
) {
  const request = require("supertest");
  const maliciousData = {
    [protectedField]: "malicious_value",
  };

  let response;
  switch (method.toUpperCase()) {
    case "PUT":
      response = await request(app)
        .put(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(maliciousData);
      break;
    case "POST":
      response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(maliciousData);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    fieldRejected: response.status === 400 || response.status === 403,
    response,
    passed: response.status === 400 || response.status === 403,
  };
}

/**
 * Test mass assignment attempt with multiple protected fields
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {string} token - Authentication token
 * @param {Object} maliciousData - Data with protected fields
 * @returns {Promise<Object>} Test results
 */
async function testMassAssignmentAttempt(
  app,
  endpoint,
  method,
  token,
  maliciousData,
) {
  const request = require("supertest");

  let response;
  switch (method.toUpperCase()) {
    case "PUT":
      response = await request(app)
        .put(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(maliciousData);
      break;
    case "POST":
      response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(maliciousData);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    massAssignmentBlocked: response.status === 400 || response.status === 403,
    response,
    passed: response.status === 400 || response.status === 403,
  };
}

/**
 * Step-up Token Tests
 */

/**
 * Test that step-up token is required for sensitive operations
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {string} token - Regular authentication token
 * @param {Object} requestData - Request body/data
 * @returns {Promise<Object>} Test results
 */
async function testStepUpTokenRequired(
  app,
  endpoint,
  method,
  token,
  requestData = {},
) {
  const request = require("supertest");

  let response;
  switch (method.toUpperCase()) {
    case "POST":
      response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(requestData);
      break;
    case "PUT":
      response = await request(app)
        .put(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .send(requestData);
      break;
    case "DELETE":
      response = await request(app)
        .delete(endpoint)
        .set("Authorization", `Bearer ${token}`);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    stepUpRequired: response.status === 403,
    response,
    passed: response.status === 403,
  };
}

/**
 * Test that invalid step-up tokens are rejected
 * @param {Object} app - Express app instance
 * @param {string} endpoint - API endpoint to test
 * @param {string} method - HTTP method
 * @param {string} token - Regular authentication token
 * @param {string} invalidStepUpToken - Invalid step-up token
 * @param {Object} requestData - Request body/data
 * @returns {Promise<Object>} Test results
 */
async function testInvalidStepUpToken(
  app,
  endpoint,
  method,
  token,
  invalidStepUpToken,
  requestData = {},
) {
  const request = require("supertest");

  let response;
  switch (method.toUpperCase()) {
    case "POST":
      response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Step-Up-Token", invalidStepUpToken)
        .send(requestData);
      break;
    case "PUT":
      response = await request(app)
        .put(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Step-Up-Token", invalidStepUpToken)
        .send(requestData);
      break;
    case "DELETE":
      response = await request(app)
        .delete(endpoint)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Step-Up-Token", invalidStepUpToken);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  return {
    invalidTokenRejected: response.status === 403,
    response,
    passed: response.status === 403,
  };
}

/**
 * Test Data Generators
 */

/**
 * Generate malicious variable data with protected fields
 * @returns {Object} Malicious data object
 */
function generateMaliciousVariableData() {
  return {
    _id: "507f1f77bcf86cd799439011",
    customId: "HACKED_VAR",
    createdAt: new Date("2000-01-01"),
    createdBy: "507f1f77bcf86cd799439011",
    updatedAt: new Date("2000-01-01"),
    version: -1,
    feeId: "507f1f77bcf86cd799439011",
    variableFeeRuleId: "507f1f77bcf86cd799439011",
    checklistId: "507f1f77bcf86cd799439011",
    isActive: false,
    // Include some valid fields too
    name: "Malicious Variable",
    question: "What is the value?",
  };
}

/**
 * Generate requests for rate limit testing
 * @param {number} count - Number of requests to generate
 * @returns {Array} Array of request data objects
 */
function generateRateLimitRequests(count) {
  return Array.from({ length: count }, (_, i) => ({
    requestId: i,
    timestamp: Date.now(),
  }));
}

/**
 * Generate invalid step-up tokens
 * @returns {Array} Array of invalid tokens
 */
function generateInvalidStepUpTokens() {
  return [
    "invalid_token",
    "expired_token",
    "malformed_token",
    "",
    null,
    "Bearer invalid",
  ];
}

module.exports = {
  // Rate limiting tests
  testRateLimitExceeded,
  testRateLimitReset,
  // Authorization tests
  testUnauthorizedAccess,
  testForbiddenAccess,
  testRoleBasedAccess,
  // Field allowlisting tests
  testProtectedFieldUpdate,
  testMassAssignmentAttempt,
  // Step-up token tests
  testStepUpTokenRequired,
  testInvalidStepUpToken,
  // Test data generators
  generateMaliciousVariableData,
  generateRateLimitRequests,
  generateInvalidStepUpTokens,
};
