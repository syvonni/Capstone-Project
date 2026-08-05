const {
  sendAdminAlert,
  createInAppNotificationsForAdmins,
} = require("./notificationService");
const { logAuditEvent } = require("./auditClient");

/**
 * Admin Alert Service
 * Alerts admins when staff users attempt to modify restricted fields
 */

/**
 * Alert admins about restricted field attempt
 * @param {string|ObjectId} userId - User ID who attempted the change
 * @param {string} field - Field that was attempted
 * @param {any} attemptedValue - Value that was attempted
 * @param {string} roleSlug - Role of the user
 * @param {object} metadata - Additional metadata (IP, userAgent, etc.)
 * @returns {Promise<{success: boolean, auditLogId?: string, error?: string}>}
 */
async function alertRestrictedFieldAttempt(
  userId,
  field,
  attemptedValue,
  roleSlug,
  metadata = {},
) {
  try {
    // Calculate hash for audit log (required field)
    const crypto = require("crypto");
    const timestamp = new Date();
    const hashableData = {
      userId: String(userId),
      eventType: "restricted_field_attempt",
      fieldChanged: field || "",
      oldValue: "",
      newValue:
        typeof attemptedValue === "string"
          ? attemptedValue
          : JSON.stringify(attemptedValue),
      role: roleSlug,
      metadata: JSON.stringify({
        ...metadata,
        priority: "high",
        alertSent: false,
      }),
      timestamp: timestamp.toISOString(),
    };
    const dataString = JSON.stringify(hashableData);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");

    // Note: 'restricted_field_attempt' might not be in the enum, use a valid eventType
    // For now, use 'profile_update' as the base event type
    const eventType = "profile_update"; // Use valid enum value

    // Create audit log via centralized audit-service
    await logAuditEvent(eventType, userId, "AdminAlert", userId, {
      field,
      oldValue: "",
      newValue:
        typeof attemptedValue === "string"
          ? attemptedValue
          : JSON.stringify(attemptedValue),
      role: roleSlug,
      ...metadata,
      priority: "high",
      alertSent: false,
      restrictedFieldAttempt: true,
    });

    // Send email notification to admins (non-blocking)
    sendAdminAlert(userId, field, attemptedValue, roleSlug, metadata).catch(
      (err) => {
        console.error("Failed to send admin alert emails:", err);
      },
    );

    // In-app notification for all admins
    createInAppNotificationsForAdmins(
      "restricted_field_attempt",
      "Restricted field attempt",
      `Staff (${roleSlug}) attempted to change restricted field "${field}". Review audit log.`,
      "system",
      null,
      { userId: String(userId), field, roleSlug },
    ).catch((err) =>
      console.error(
        "Failed to create restricted-field in-app notifications:",
        err,
      ),
    );

    return {
      success: true,
      auditLogId: String(auditLog._id),
    };
  } catch (error) {
    console.error("Error creating admin alert:", error);
    return {
      success: false,
      error: error.message || "Failed to create admin alert",
    };
  }
}

/**
 * Get recent restricted field attempts (for admin dashboard)
 * @param {object} options - Query options
 * @param {number} options.limit - Maximum number of records
 * @param {number} options.skip - Number of records to skip
 * @returns {Promise<{success: boolean, attempts?: Array, total?: number, error?: string}>}
 */
async function getRecentRestrictedAttempts(options = {}) {
  try {
    const { limit = 50, skip = 0 } = options;

    const attempts = await AuditLog.find({
      eventType: "restricted_field_attempt",
    })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await AuditLog.countDocuments({
      eventType: "restricted_field_attempt",
    });

    return {
      success: true,
      attempts,
      total,
    };
  } catch (error) {
    console.error("Error getting restricted attempts:", error);
    return {
      success: false,
      error: error.message || "Failed to get restricted attempts",
    };
  }
}

module.exports = {
  alertRestrictedFieldAttempt,
  getRecentRestrictedAttempts,
};
