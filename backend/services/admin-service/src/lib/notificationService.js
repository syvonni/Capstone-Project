// Import models from service-local directory
const User = require("../models/User");
const Role = require("../models/Role");

function getUserModel() {
  return User;
}

function getRoleModel() {
  return Role;
}

const mailer = require("./mailer");
const internalNotificationService = require("../services/notificationService");
const {
  buildNotificationEmailBody,
} = require("../../../../shared/lib/emailTemplateBuilder");

/**
 * Get active admin user IDs (for in-app notifications)
 * @param {string|ObjectId} [excludeUserId] - Optional user ID to exclude (e.g. requesting admin)
 * @returns {Promise<string[]>} Array of admin user IDs
 */
async function getActiveAdminUserIds(excludeUserId = null) {
  const UserModel = getUserModel();
  const RoleModel = getRoleModel();
  const adminRole = await RoleModel.findOne({ slug: "admin" });
  if (!adminRole) return [];
  const admins = await UserModel.find({
    role: adminRole._id,
    isActive: true,
  }).lean();
  let ids = admins.map((a) => String(a._id));
  if (excludeUserId) {
    const exclude = String(excludeUserId);
    ids = ids.filter((id) => id !== exclude);
  }
  return ids;
}

/**
 * Create in-app notifications for all active admins (or all except excludeUserId)
 * Non-blocking; logs errors.
 * @param {string} type - Notification type
 * @param {string} title - Title
 * @param {string} message - Message
 * @param {string} [relatedEntityType] - Related entity type
 * @param {string} [relatedEntityId] - Related entity ID
 * @param {object} [metadata] - Metadata
 * @param {string|ObjectId} [excludeUserId] - Admin user ID to exclude from recipients
 */
async function createInAppNotificationsForAdmins(
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
  metadata = {},
  excludeUserId = null,
) {
  try {
    const adminIds = await getActiveAdminUserIds(excludeUserId);
    if (adminIds.length === 0) return;
    for (const adminId of adminIds) {
      try {
        await internalNotificationService.createNotification(
          adminId,
          type,
          title,
          message,
          relatedEntityType,
          relatedEntityId,
          metadata,
        );
      } catch (err) {
        console.error(
          `Failed to create in-app notification for admin ${adminId}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    console.error("Error creating in-app notifications for admins:", err);
  }
}

/**
 * Create a single in-app notification for a user (e.g. requesting admin when approval resolved)
 * @param {string|ObjectId} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Title
 * @param {string} message - Message
 * @param {string} [relatedEntityType] - Related entity type
 * @param {string} [relatedEntityId] - Related entity ID
 * @param {object} [metadata] - Metadata
 */
async function createInAppNotification(
  userId,
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
  metadata = {},
) {
  try {
    await internalNotificationService.createNotification(
      userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata,
    );
  } catch (err) {
    console.error("Failed to create in-app notification:", err.message);
  }
}

/**
 * Notification Service
 * Handles sending email notifications for critical changes and admin alerts
 */

/**
 * Send email change notification to both old and new email
 * @param {string|ObjectId} userId - User ID
 * @param {string} oldEmail - Old email address
 * @param {string} newEmail - New email address
 * @param {object} options - Additional options
 * @returns {Promise<{success: boolean, sentToOld?: boolean, sentToNew?: boolean, error?: string}>}
 */
async function sendEmailChangeNotification(
  userId,
  oldEmail,
  newEmail,
  options = {},
) {
  try {
    const UserModel = getUserModel();
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const { gracePeriodHours = 24, revertUrl } = options;

    // Send to old email
    let sentToOld = false;
    try {
      await mailer.sendEmailChangeNotification({
        to: oldEmail,
        oldEmail,
        newEmail,
        gracePeriodHours,
        revertUrl,
        type: "old_email",
      });
      sentToOld = true;
    } catch (error) {
      console.error(
        "Failed to send email change notification to old email:",
        error,
      );
    }

    // Send to new email
    let sentToNew = false;
    try {
      await mailer.sendEmailChangeNotification({
        to: newEmail,
        oldEmail,
        newEmail,
        gracePeriodHours,
        revertUrl,
        type: "new_email",
      });
      sentToNew = true;
    } catch (error) {
      console.error(
        "Failed to send email change notification to new email:",
        error,
      );
    }

    return {
      success: sentToOld || sentToNew, // Success if at least one email sent
      sentToOld,
      sentToNew,
    };
  } catch (error) {
    console.error("Error sending email change notification:", error);
    return {
      success: false,
      error: error.message || "Failed to send notification",
    };
  }
}

/**
 * Send password change notification
 * @param {string|ObjectId} userId - User ID
 * @param {object} options - Additional options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordChangeNotification(userId, options = {}) {
  try {
    const UserModel = getUserModel();
    const user = await UserModel.findById(userId).populate("role").lean();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    await mailer.sendPasswordChangeNotification({
      to: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      timestamp: new Date(),
      ...options,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending password change notification:", error);
    return {
      success: false,
      error: error.message || "Failed to send notification",
    };
  }
}

/**
 * Send admin alert email when staff attempts restricted field
 * @param {string|ObjectId} userId - User ID who attempted the change
 * @param {string} field - Field that was attempted
 * @param {any} attemptedValue - Value that was attempted
 * @param {string} roleSlug - Role of the user
 * @param {object} metadata - Additional metadata
 * @returns {Promise<{success: boolean, sentTo?: number, error?: string}>}
 */
async function sendAdminAlert(
  userId,
  field,
  attemptedValue,
  roleSlug,
  metadata = {},
) {
  try {
    const UserModel = getUserModel();
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get all admin users
    const RoleModel = getRoleModel();
    const adminRole = await RoleModel.findOne({ slug: "admin" });
    if (!adminRole) {
      return { success: false, error: "Admin role not found" };
    }

    const admins = await UserModel.find({
      role: adminRole._id,
      isActive: true,
    }).lean();
    if (admins.length === 0) {
      return { success: false, error: "No active admins found" };
    }

    // Send alert to all admins
    let sentCount = 0;
    const errors = [];

    for (const admin of admins) {
      try {
        await mailer.sendAdminAlertEmail({
          to: admin.email,
          adminName: `${admin.firstName} ${admin.lastName}`,
          userId: String(user._id),
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          field,
          attemptedValue:
            typeof attemptedValue === "string"
              ? attemptedValue
              : JSON.stringify(attemptedValue),
          roleSlug,
          timestamp: new Date(),
          ...metadata,
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send admin alert to ${admin.email}:`, error);
        errors.push(error.message);
      }
    }

    return {
      success: sentCount > 0,
      sentTo: sentCount,
      totalAdmins: admins.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error sending admin alert:", error);
    return {
      success: false,
      error: error.message || "Failed to send admin alert",
    };
  }
}

/**
 * Send approval notification to requesting admin
 * @param {string|ObjectId} adminId - Admin ID who requested the approval
 * @param {string} approvalId - Approval request ID
 * @param {string} status - Approval status ('approved' or 'rejected')
 * @param {object} options - Additional options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendApprovalNotification(
  adminId,
  approvalId,
  status,
  options = {},
) {
  try {
    const UserModel = getUserModel();
    const admin = await UserModel.findById(adminId).lean();
    if (!admin) {
      return { success: false, error: "Admin not found" };
    }

    const { requestType, comment, approverName } = options;

    await mailer.sendApprovalNotification({
      to: admin.email,
      adminName: `${admin.firstName} ${admin.lastName}`,
      approvalId,
      status,
      requestType,
      comment,
      approverName,
      timestamp: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending approval notification:", error);
    return {
      success: false,
      error: error.message || "Failed to send notification",
    };
  }
}

/** Rate limit for system alerts: min ms between same alert type */
const SYSTEM_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const lastSystemAlertByType = new Map();

/** Rate limit for tamper incidents: max 5 per hour in development */
const TAMPER_INCIDENT_RATE_LIMIT = 5;
const TAMPER_INCIDENT_WINDOW_MS = 60 * 60 * 1000;
const tamperIncidentTimestamps = [];

/**
 * Notify all admins of a system/error-tracking alert (email + in-app). Rate-limited per alert type.
 * @param {string} alertType - e.g. 'high_error_rate', 'high_critical_errors'
 * @param {object} details - Alert details
 * @returns {Promise<{notified: boolean}>}
 */
async function notifyAdminsOfSystemAlert(alertType, details = {}) {
  const now = Date.now();
  const last = lastSystemAlertByType.get(alertType) || 0;
  if (now - last < SYSTEM_ALERT_COOLDOWN_MS) {
    return { notified: false };
  }
  try {
    const UserModel = getUserModel();
    const RoleModel = getRoleModel();
    const adminRole = await RoleModel.findOne({ slug: "admin" });
    if (!adminRole) return { notified: false };
    const admins = await UserModel.find({
      role: adminRole._id,
      isActive: true,
    }).lean();
    if (admins.length === 0) return { notified: false };

    const brandName = "BizClear";
    const appUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      "http://localhost:5173";
    const subject = `System alert: ${alertType} - ${brandName}`;
    const detailsStr =
      typeof details === "object"
        ? JSON.stringify(details, null, 2)
        : String(details);
    const text = [
      `System alert (${alertType}):`,
      "",
      detailsStr,
      "",
      `Dashboard: ${appUrl}/admin`,
      "",
      brandName,
    ].join("\n");
    const html = buildNotificationEmailBody({
      greeting: "Hello",
      intro: `System alert: <strong>${alertType}</strong>. Details below.`,
      fields: {
        fields: [
          { label: "Alert Type", value: alertType },
          {
            label: "Details",
            value:
              detailsStr.slice(0, 200) + (detailsStr.length > 200 ? "..." : ""),
          },
        ],
      },
      appUrl,
    });

    for (const admin of admins) {
      try {
        await mailer.sendEmail({ to: admin.email, subject, text, html });
      } catch (err) {
        console.error(
          `Failed to send system alert to ${admin.email}:`,
          err.message,
        );
      }
    }

    await createInAppNotificationsForAdmins(
      "system_alert",
      `System alert: ${alertType}`,
      (detailsStr || alertType).slice(0, 200),
      "system",
      null,
      { alertType, ...details },
    );

    lastSystemAlertByType.set(alertType, now);
    return { notified: true };
  } catch (err) {
    console.error("Error notifying admins of system alert:", err);
    return { notified: false };
  }
}

/**
 * Notify all admins of a tamper incident (email + in-app).
 * Call only for important incidents: severity high, or (severity medium and verificationStatus tamper_detected).
 * @param {object} incident - TamperIncident document (with _id, severity, verificationStatus, message, detectedAt)
 * @returns {Promise<{notified: boolean, error?: string}>}
 */
async function notifyAdminsOfTamperIncident(incident) {
  // Emergency fix: Disable email notifications in development mode
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DISABLE_EMAIL_NOTIFICATIONS === "true"
  ) {
    console.log(
      "🚫 Email notifications disabled in development mode - skipping tamper incident email",
      {
        incidentId: String(incident._id),
        severity: incident.severity,
        verificationStatus: incident.verificationStatus,
      },
    );
    // Still create in-app notifications for visibility
    try {
      await createInAppNotificationsForAdmins(
        "tamper_incident",
        "Audit tamper incident (DEV MODE)",
        `Development mode: ${(incident.message || "Audit integrity issue detected").slice(0, 150)} (Email notifications disabled)`,
        "tamper_incident",
        String(incident._id),
        {
          severity: incident.severity,
          verificationStatus: incident.verificationStatus,
          developmentMode: true,
        },
      );
      return { notified: false, reason: "development_mode_email_disabled" };
    } catch (err) {
      console.error(
        "Failed to create in-app notification in development mode:",
        err.message,
      );
      return { notified: false, error: err.message };
    }
  }

  // Rate limiting: max 5 tamper incidents per hour in development
  if (process.env.NODE_ENV === "development") {
    const now = Date.now();
    const windowStart = now - TAMPER_INCIDENT_WINDOW_MS;

    // Clean old timestamps
    const recentTimestamps = tamperIncidentTimestamps.filter(
      (timestamp) => timestamp > windowStart,
    );
    tamperIncidentTimestamps.length = 0;
    tamperIncidentTimestamps.push(...recentTimestamps);

    // Check rate limit
    if (tamperIncidentTimestamps.length >= TAMPER_INCIDENT_RATE_LIMIT) {
      console.log("🚫 Tamper incident rate limit exceeded in development", {
        incidentId: String(incident._id),
        currentCount: tamperIncidentTimestamps.length,
        limit: TAMPER_INCIDENT_RATE_LIMIT,
        windowMs: TAMPER_INCIDENT_WINDOW_MS,
      });
      return { notified: false, reason: "rate_limit_exceeded" };
    }

    // Add current timestamp
    tamperIncidentTimestamps.push(now);
  }

  try {
    const UserModel = getUserModel();
    const RoleModel = getRoleModel();
    const adminRole = await RoleModel.findOne({ slug: "admin" });
    if (!adminRole) return { notified: false, error: "Admin role not found" };
    const admins = await UserModel.find({
      role: adminRole._id,
      isActive: true,
    }).lean();
    if (admins.length === 0)
      return { notified: false, error: "No active admins" };

    const incidentId = String(incident._id);
    const brandName = "BizClear";
    const appUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      "http://localhost:5173";
    const subject = `Audit tamper incident (${incident.severity}) - ${brandName}`;
    const text = [
      "An audit tamper or integrity issue was detected.",
      "",
      `Severity: ${incident.severity}`,
      `Status: ${incident.verificationStatus}`,
      `Message: ${incident.message || "N/A"}`,
      `Detected: ${incident.detectedAt ? new Date(incident.detectedAt).toLocaleString() : "N/A"}`,
      "",
      `View and triage: ${appUrl}/admin/security`,
      "",
      brandName,
    ].join("\n");
    const html = buildNotificationEmailBody({
      greeting: "Hello",
      intro: "An audit tamper or integrity issue was detected.",
      fields: {
        fields: [
          {
            label: "Severity",
            value: incident.severity,
            color: incident.severity === "high" ? "#FF4D4F" : undefined,
            fontSize: "14px",
            fontWeight: "700",
          },
          {
            label: "Status",
            value: incident.verificationStatus,
            fontSize: "14px",
          },
          {
            label: "Message",
            value:
              (incident.message || "N/A").slice(0, 200) +
              ((incident.message || "").length > 200 ? "..." : ""),
            fontSize: "14px",
          },
          {
            label: "Detected",
            value: incident.detectedAt
              ? new Date(incident.detectedAt).toLocaleString()
              : "N/A",
            fontSize: "14px",
          },
        ],
      },
      appUrl,
    });

    for (const admin of admins) {
      try {
        await mailer.sendEmail({
          to: admin.email,
          subject,
          text,
          html,
        });
      } catch (err) {
        console.error(
          `Failed to send tamper email to ${admin.email}:`,
          err.message,
        );
      }
    }

    await createInAppNotificationsForAdmins(
      "tamper_incident",
      "Audit tamper incident",
      (
        incident.message || "Audit integrity issue detected. Review and triage."
      ).slice(0, 200),
      "tamper_incident",
      incidentId,
      {
        severity: incident.severity,
        verificationStatus: incident.verificationStatus,
      },
    );

    return { notified: true };
  } catch (err) {
    console.error("Error notifying admins of tamper incident:", err);
    return { notified: false, error: err.message };
  }
}

module.exports = {
  getActiveAdminUserIds,
  createInAppNotificationsForAdmins,
  createInAppNotification,
  sendEmailChangeNotification,
  sendPasswordChangeNotification,
  sendAdminAlert,
  sendApprovalNotification,
  notifyAdminsOfSystemAlert,
  notifyAdminsOfTamperIncident,
};
