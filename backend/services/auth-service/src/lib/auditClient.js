const axios = require("axios");

const AUDIT_SERVICE_URL =
  process.env.AUDIT_SERVICE_URL || "http://localhost:3004";

/**
 * Sends an audit event to the audit-service for centralized storage and blockchain anchoring.
 * Now uses HTTP ingestion endpoint instead of local database.
 * Fire-and-forget: failures are logged but never block the caller.
 */
async function logAuditEvent(
  eventType,
  userId,
  entityType,
  entityId,
  metadata = {},
) {
  try {
    // Prepare metadata with entity info
    const fullMetadata = {
      ...metadata,
      entityType,
      entityId,
    };

    // Send to audit-service ingestion endpoint
    const headers = { "Content-Type": "application/json" };
    if (process.env.AUDIT_SERVICE_API_KEY)
      headers["x-api-key"] = process.env.AUDIT_SERVICE_API_KEY;

    const response = await axios.post(
      `${AUDIT_SERVICE_URL}/api/audit/ingest`,
      {
        userId,
        eventType,
        entityType,
        entityId,
        fieldChanged: null,
        oldValue: "",
        newValue: "",
        role: metadata.role || "lgu_officer",
        metadata: fullMetadata,
      },
      { headers },
    );

    console.log("[AuditClient] Audit log sent to audit-service:", {
      auditLogId: response.data?.auditLogId,
      eventType,
    });

    return response.data;
  } catch (err) {
    console.error(
      "[AuditClient] Failed to send audit log to audit-service:",
      err.message,
    );
    return null;
  }
}

module.exports = { logAuditEvent };
