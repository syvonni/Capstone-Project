/**
 * Audit Logger Utility for Auth Service
 * Creates audit logs via centralized audit-service (blockchain anchoring removed)
 */

const { auditClient } = require("../../../../shared/lib/httpClient");
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
 * Create audit log via Audit Service
 * Non-blocking - operation succeeds even if audit logging fails
 * Now uses centralized audit-service ingestion endpoint
 *
 * @deprecated Use logAuditEvent from auditClient instead
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
  // Log deprecation warning
  console.warn(
    "[DEPRECATION] createAuditLog is deprecated. Use logAuditEvent from auditClient instead.",
  );

  try {
    // Prepare metadata
    const fullMetadata = {
      ...metadata,
      ip: metadata.ip || "unknown",
      userAgent: metadata.userAgent || "unknown",
    };

    // Send to audit-service ingestion endpoint
    const response = await auditClient.post(
      "/api/audit/ingest",
      {
        userId,
        eventType,
        entityType: "User",
        entityId: userId,
        fieldChanged,
        oldValue: oldValue || "",
        newValue: newValue || "",
        role,
        metadata: fullMetadata,
      },
    );

    logger.info("Audit log sent to audit-service", {
      auditLogId: response.data?.auditLogId,
      eventType,
    });

    return response.data;
  } catch (error) {
    logger.error("Failed to send audit log to audit-service", {
      error: error.message,
    });
    return null;
  }
}

module.exports = {
  createAuditLog,
  calculateAuditHash,
};
