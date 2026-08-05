/**
 * Audit Logger Utility (Simplified for Admin Service)
 * Creates audit logs via centralized audit-service (blockchain anchoring removed)
 *
 * @deprecated Use logAuditEvent from auditClient.js instead.
 * createAuditLog hardcodes entityType as "AdminApproval" and entityId as userId,
 * which is incorrect for various entities like LGUs, announcements, permit forms, etc.
 * Migrate to logAuditEvent(eventType, userId, entityType, entityId, metadata).
 */

const { logAuditEvent } = require("./auditClient");

/**
 * Create audit log via centralized audit-service
 * Non-blocking - operation succeeds even if logging fails
 *
 * @deprecated Use logAuditEvent from auditClient.js instead.
 */
async function createAuditLog(
  userId,
  eventType,
  fieldChanged,
  oldValue,
  newValue,
  role,
  metadata = {},
  slotId = null,
) {
  console.warn(
    "[DEPRECATED] createAuditLog is deprecated. Use logAuditEvent from auditClient.js instead. " +
      "createAuditLog hardcodes entityType as 'AdminApproval' and entityId as userId.",
  );

  try {
    // Prepare metadata
    const fullMetadata = {
      ...metadata,
      ip: metadata.ip || "unknown",
      userAgent: metadata.userAgent || "unknown",
      fieldChanged,
      oldValue: oldValue || "",
      newValue: newValue || "",
      slotId,
    };

    await logAuditEvent(
      eventType,
      userId,
      "AdminApproval",
      userId,
      fullMetadata,
    );

    return { success: true };
  } catch (error) {
    console.error("[AuditLogger] Error creating audit log:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createAuditLog,
};
