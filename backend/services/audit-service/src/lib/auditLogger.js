/**
 * Audit Logger Utility
 * Creates audit logs in MongoDB
 * 
 * PURPOSE: This utility provides structured logging for audit endpoints.
 * It ensures consistent log format across all audit operations, making debugging
 * and monitoring easier.
 * 
 * USAGE EXAMPLE:
 * logAuditRequest(req, { entityType: 'variable' })
 * logAuditResponse(res, { entityType: 'variable', endpoint: 'singular' })
 * logAuditError(err, { entityType: 'variable', endpoint: 'global' })
 */

const crypto = require("crypto");
const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

/**
 * Calculate audit hash for an audit log entry
 */
function calculateAuditHash(
  userId,
  eventType,
  fieldChanged,
  oldValue,
  newValue,
  role,
  metadata,
  timestamp,
) {
  const hashableData = {
    userId: String(userId),
    eventType,
    fieldChanged: fieldChanged || "",
    oldValue: oldValue || "",
    newValue: newValue || "",
    role,
    metadata: JSON.stringify(metadata || {}),
    timestamp,
  };
  const dataString = JSON.stringify(hashableData);
  return crypto.createHash("sha256").update(dataString).digest("hex");
}

/**
 * Create audit log in MongoDB
 * Non-blocking - operation succeeds even if audit log creation fails
 */
async function createAuditLog(
  userId,
  eventType,
  fieldChanged,
  oldValue,
  newValue,
  role,
  metadata = {},
) {
  try {
    // Prepare metadata
    const fullMetadata = {
      ...metadata,
      ip: metadata.ip || "unknown",
      userAgent: metadata.userAgent || "unknown",
    };

    // Use one timestamp for both hash and createdAt
    const timestamp = new Date();
    const timestampISO = timestamp.toISOString();
    const hash = calculateAuditHash(
      userId,
      eventType,
      fieldChanged,
      oldValue || "",
      newValue || "",
      role,
      fullMetadata,
      timestampISO,
    );

    // Create audit log with hash and createdAt set
    const auditLog = await AuditLog.create({
      userId,
      eventType,
      fieldChanged,
      oldValue: oldValue || "",
      newValue: newValue || "",
      role,
      metadata: fullMetadata,
      hash,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return auditLog;
  } catch (error) {
    // Don't throw - audit logging failure shouldn't break operations
    console.error("Error creating audit log:", error);
    return null;
  }
}

module.exports = {
  createAuditLog,
  calculateAuditHash,
  logAuditRequest,
  logAuditResponse,
  logAuditError,
};

/**
 * Logs an audit request with structured context
 * 
 * USAGE:
 * logAuditRequest(req, { entityType: 'variable' })
 * 
 * This logs the incoming request details including method, path, query parameters,
 * user ID, and user role. Additional context can be provided for debugging.
 * 
 * @param {object} req - Express request object
 * @param {object} context - Additional context to include in log
 */
function logAuditRequest(req, context = {}) {
  logger.info('Audit request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req._userId,
    userRole: req._userRole,
    ...context,
  });
}

/**
 * Logs an audit response with structured context
 * 
 * USAGE:
 * logAuditResponse(res, { entityType: 'variable', endpoint: 'singular' })
 * 
 * This logs the response details including status code. Additional context
 * can be provided for debugging and monitoring.
 * 
 * @param {object} res - Express response object
 * @param {object} context - Additional context to include in log
 */
function logAuditResponse(res, context = {}) {
  logger.info('Audit response', {
    statusCode: res.statusCode,
    ...context,
  });
}

/**
 * Logs an audit error with structured context
 * 
 * USAGE:
 * logAuditError(err, { entityType: 'variable', endpoint: 'global' })
 * 
 * This logs error details including error message and stack trace. Additional
 * context can be provided for debugging.
 * 
 * @param {Error} err - Error object
 * @param {object} context - Additional context to include in log
 */
function logAuditError(err, context = {}) {
  logger.error('Audit error', {
    error: err.message,
    stack: err.stack,
    ...context,
  });
}
