const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const RecoveryRequest = require("../models/RecoveryRequest");
const TemporaryCredential = require("../models/TemporaryCredential");
const { generateToken } = require("../lib/codes");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const { requireJwt, requireRole } = require("../middleware/auth");
const { perEmailRateLimit } = require("../middleware/rateLimit");
const { isWithinOfficeHours } = require("../lib/officeHoursValidator");
const { trackIP, isUnusualIP } = require("../lib/ipTracker");
const { logAuditEvent } = require("../lib/auditClient");
const { sendStaffCredentialsEmail } = require("../lib/mailer");
const {
  sendAdminAlert,
  createInAppNotificationsForAdmins,
} = require("../lib/notificationService");
const { isStaffRole } = require("../lib/roleHelpers");
const { signAccessToken } = require("../middleware/auth");

const router = express.Router();

// Generate temporary password
function generateTempPassword() {
  const crypto = require("crypto");
  return crypto.randomBytes(12).toString("base64url");
}

// Generate temporary username
function generateTempUsername(length = 12) {
  const crypto = require("crypto");
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(
    Math.max(3, Math.min(40, Number(length) || 12)),
  );
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

const recoveryRequestSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
});

const issueCredentialsSchema = Joi.object({
  recoveryRequestId: Joi.string().required(),
  expiresInHours: Joi.number().integer().min(1).max(72).default(24),
  expiresAfterFirstLogin: Joi.boolean().default(true),
});

const loginTemporarySchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

// POST /api/auth/staff/recovery-request
// Staff requests password recovery from Admin
router.post(
  "/staff/recovery-request",
  requireJwt,
  validateBody(recoveryRequestSchema),
  async (req, res) => {
    try {
      const userId = req._userId;
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const { reason } = req.body || {};

      const user = await User.findById(userId).populate("role");
      if (!user)
        return respond.error(res, 404, "user_not_found", "User not found");

      // Verify user is staff
      const roleSlug = user.role?.slug || "";
      if (!isStaffRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Only staff users can request recovery",
        );
      }

      // Check if there's already a pending request
      const existingRequest = await RecoveryRequest.findOne({
        userId: user._id,
        status: "pending",
      }).lean();

      if (existingRequest) {
        return respond.error(
          res,
          409,
          "request_exists",
          "You already have a pending recovery request",
        );
      }

      // Check office hours (flag if outside)
      const officeHoursCheck = await isWithinOfficeHours(user.office || "");
      const requestedOutsideOfficeHours = !officeHoursCheck.isWithinHours;

      // Check for unusual IP
      const ipCheck = await isUnusualIP(user._id, ipAddress);
      const suspiciousActivity = ipCheck.isUnusual;

      // Track IP
      await trackIP(user._id, ipAddress);

      // Create recovery request
      const recoveryRequest = await RecoveryRequest.create({
        userId: user._id,
        requestedBy: user._id,
        status: "pending",
        office: user.office || "",
        role: roleSlug,
        metadata: {
          ipAddress,
          userAgent,
          requestedOutsideOfficeHours,
          suspiciousActivityDetected: suspiciousActivity,
        },
        reviewNotes: reason || "",
      });

      // Log to audit trail
      await logAuditEvent(
        user._id,
        "account_recovery_initiated",
        "User",
        user._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "",
          newValue: "staff_recovery_requested",
          ip: ipAddress,
          userAgent,
          recoveryRequestId: String(recoveryRequest._id),
          requestedOutsideOfficeHours,
          suspiciousActivityDetected: suspiciousActivity,
        },
      );

      // In-app notification for all admins
      const staffName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
      createInAppNotificationsForAdmins(
        "recovery_request_pending",
        "Recovery request pending",
        `Staff ${staffName} requested password recovery. Review the request.`,
        "system",
        String(recoveryRequest._id),
        { userId: String(user._id), office: user.office || "", role: roleSlug },
      ).catch((err) =>
        console.error(
          "Failed to create recovery-request in-app notifications:",
          err,
        ),
      );

      // Security: alert admins when request is from unusual IP (important only)
      if (suspiciousActivity) {
        sendAdminAlert("recovery_from_unusual_ip", {
          recoveryRequestId: String(recoveryRequest._id),
          userId: String(user._id),
          userEmail: user.email,
          ipAddress,
          userAgent,
          message:
            "Staff recovery request from unusual IP; verify identity before approving.",
        }).catch((err) =>
          console.error("Failed to send admin security alert:", err),
        );
        createInAppNotificationsForAdmins(
          "security_alert",
          "Security: recovery from unusual IP",
          `Recovery request from ${user.email} from an unusual IP. Verify identity before approving.`,
          "system",
          String(recoveryRequest._id),
          { userId: String(user._id), ipAddress },
        ).catch((err) =>
          console.error("Failed to create security in-app notifications:", err),
        );
      }

      return res.json({
        success: true,
        recoveryRequestId: String(recoveryRequest._id),
        message:
          "Recovery request submitted. An admin will review your request.",
        warning: suspiciousActivity
          ? "Unusual activity detected. Admin will verify your identity."
          : undefined,
      });
    } catch (err) {
      console.error("POST /api/auth/staff/recovery-request error:", err);
      return respond.error(
        res,
        500,
        "recovery_request_failed",
        "Failed to submit recovery request",
      );
    }
  },
);

// GET /api/auth/admin/recovery-requests
// Admin views pending recovery requests
router.get(
  "/admin/recovery-requests",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { status = "pending", office, role } = req.query || {};

      const query = { status };
      if (office) query.office = office;
      if (role) query.role = role;

      const requests = await RecoveryRequest.find(query)
        .populate("userId", "email firstName lastName office")
        .populate("requestedBy", "email firstName lastName")
        .populate("reviewedBy", "email firstName lastName")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.json({
        requests: requests.map((req) => ({
          id: String(req._id),
          userId: String(req.userId._id),
          userEmail: req.userId.email,
          userName: `${req.userId.firstName} ${req.userId.lastName}`,
          office: req.office,
          role: req.role,
          status: req.status,
          requestedAt: req.createdAt,
          reviewedAt: req.reviewedAt,
          reviewNotes: req.reviewNotes,
          denialReason: req.denialReason,
          metadata: req.metadata,
        })),
      });
    } catch (err) {
      console.error("GET /api/auth/admin/recovery-requests error:", err);
      return respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch recovery requests",
      );
    }
  },
);

// POST /api/auth/admin/issue-temporary-credentials
// Admin issues temporary credentials for staff recovery
router.post(
  "/admin/issue-temporary-credentials",
  requireJwt,
  requireRole(["admin"]),
  validateBody(issueCredentialsSchema),
  async (req, res) => {
    try {
      const adminId = req._userId;
      const { recoveryRequestId, expiresInHours, expiresAfterFirstLogin } =
        req.body || {};
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Find recovery request
      const recoveryRequest = await RecoveryRequest.findById(recoveryRequestId)
        .populate("userId")
        .populate("requestedBy");
      if (!recoveryRequest) {
        return respond.error(
          res,
          404,
          "request_not_found",
          "Recovery request not found",
        );
      }

      if (recoveryRequest.status !== "pending") {
        return respond.error(
          res,
          400,
          "invalid_status",
          "Recovery request is not pending",
        );
      }

      const staffUser = recoveryRequest.userId;
      if (!staffUser) {
        return respond.error(
          res,
          404,
          "user_not_found",
          "Staff user not found",
        );
      }

      // Generate temporary credentials
      let username = "";
      for (let i = 0; i < 20; i++) {
        const candidate = generateTempUsername(12);
        const taken = await User.findOne({ username: candidate }).lean();
        if (!taken) {
          username = candidate;
          break;
        }
      }
      if (!username) {
        return respond.error(
          res,
          500,
          "username_generation_failed",
          "Failed to generate unique username",
        );
      }

      const tempPassword = generateTempPassword();
      const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

      // Calculate expiration
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      // Create temporary credential
      const tempCredential = await TemporaryCredential.create({
        userId: staffUser._id,
        username,
        tempPasswordHash,
        issuedBy: adminId,
        expiresAt,
        expiresAfterFirstLogin,
        recoveryRequestId: recoveryRequest._id,
        metadata: {
          ipAddress,
          userAgent,
          office: staffUser.office || "",
          role: staffUser.role?.slug || "",
        },
      });

      // Update recovery request
      recoveryRequest.status = "approved";
      recoveryRequest.reviewedBy = adminId;
      recoveryRequest.reviewedAt = new Date();
      recoveryRequest.temporaryCredentialId = tempCredential._id;
      await recoveryRequest.save();

      // Update staff user: require password change and MFA re-enrollment
      staffUser.mustChangeCredentials = true;
      staffUser.mustSetupMfa = true;
      staffUser.tokenVersion = (staffUser.tokenVersion || 0) + 1; // Invalidate all sessions
      await staffUser.save();

      // Send email with temporary credentials
      const roleLabel = staffUser.role?.name || staffUser.role?.slug || "Staff";
      await sendStaffCredentialsEmail({
        to: staffUser.email,
        username,
        tempPassword,
        office: staffUser.office || "",
        roleLabel,
        subject: "Temporary Credentials for Account Recovery",
      });

      // Log to audit trail
      const roleSlug = staffUser.role?.slug || "staff";
      await logAuditEvent(
        staffUser._id,
        "temporary_credentials_issued",
        "User",
        staffUser._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "",
          newValue: "credentials_issued",
          ip: ipAddress,
          userAgent,
          issuedBy: String(adminId),
          recoveryRequestId: String(recoveryRequest._id),
          expiresAt: expiresAt.toISOString(),
          expiresAfterFirstLogin,
        },
      );

      const safe = {
        success: true,
        recoveryRequestId: String(recoveryRequest._id),
        temporaryCredentialId: String(tempCredential._id),
        username,
        expiresAt: expiresAt.toISOString(),
        expiresAfterFirstLogin,
      };

      // Include temp password in dev mode only
      if (process.env.NODE_ENV !== "production") {
        safe.devTempPassword = tempPassword;
      }

      return res.json(safe);
    } catch (err) {
      console.error(
        "POST /api/auth/admin/issue-temporary-credentials error:",
        err,
      );
      return respond.error(
        res,
        500,
        "issue_failed",
        "Failed to issue temporary credentials",
      );
    }
  },
);

// POST /api/auth/admin/deny-recovery-request
// Admin denies a staff recovery request
const denyRecoverySchema = Joi.object({
  recoveryRequestId: Joi.string().required(),
  reason: Joi.string().max(500).required(),
});
router.post(
  "/admin/deny-recovery-request",
  requireJwt,
  requireRole(["admin"]),
  validateBody(denyRecoverySchema),
  async (req, res) => {
    try {
      const adminId = req._userId;
      const { recoveryRequestId, reason } = req.body || {};
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Find recovery request
      const recoveryRequest =
        await RecoveryRequest.findById(recoveryRequestId).populate("userId");

      if (!recoveryRequest) {
        return respond.error(
          res,
          404,
          "request_not_found",
          "Recovery request not found",
        );
      }

      if (recoveryRequest.status !== "pending") {
        return respond.error(
          res,
          400,
          "invalid_status",
          "Recovery request is not pending",
        );
      }

      const staffUser = recoveryRequest.userId;
      if (!staffUser) {
        return respond.error(
          res,
          404,
          "user_not_found",
          "Staff user not found",
        );
      }

      // Deny recovery request
      recoveryRequest.status = "denied";
      recoveryRequest.reviewedBy = adminId;
      recoveryRequest.reviewedAt = new Date();
      recoveryRequest.denialReason = reason;
      await recoveryRequest.save();

      // Log to audit trail
      const roleSlug = staffUser.role?.slug || "staff";
      await logAuditEvent(
        staffUser._id,
        "account_recovery_initiated",
        "User",
        staffUser._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "recovery_requested",
          newValue: "recovery_request_denied",
          ip: ipAddress,
          userAgent,
          reviewedBy: String(adminId),
          recoveryRequestId: String(recoveryRequest._id),
          denialReason: reason,
        },
      );

      return res.json({
        success: true,
        message: "Recovery request denied.",
      });
    } catch (err) {
      console.error("POST /api/auth/admin/deny-recovery-request error:", err);
      return respond.error(
        res,
        500,
        "denial_failed",
        "Failed to deny recovery request",
      );
    }
  },
);

// POST /api/auth/staff/login-temporary
// Staff login with temporary credentials (forces password change and MFA setup)
router.post(
  "/staff/login-temporary",
  validateBody(loginTemporarySchema),
  async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Find temporary credential
      const tempCredential = await TemporaryCredential.findOne({
        username: username.toLowerCase().trim(),
        isExpired: false,
      })
        .populate("userId")
        .populate("issuedBy");

      if (!tempCredential) {
        return respond.error(
          res,
          401,
          "invalid_credentials",
          "Invalid temporary credentials",
        );
      }

      // Check if credentials are valid
      if (!tempCredential.isValid()) {
        tempCredential.isExpired = true;
        await tempCredential.save();
        return respond.error(
          res,
          401,
          "credentials_expired",
          "Temporary credentials have expired",
        );
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(
        password,
        tempCredential.tempPasswordHash,
      );
      if (!passwordMatch) {
        return respond.error(
          res,
          401,
          "invalid_credentials",
          "Invalid temporary credentials",
        );
      }

      const user = tempCredential.userId;
      if (!user) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      // Mark credentials as used
      await tempCredential.markAsUsed();

      // Load user with role
      const userDoc = await User.findById(user._id).populate("role");
      if (!userDoc) {
        return respond.error(res, 404, "user_not_found", "User not found");
      }

      // Ensure user is staff
      const roleSlug = userDoc.role?.slug || "";
      if (!isStaffRole(roleSlug)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Temporary credentials are only for staff users",
        );
      }

      // Track IP
      await trackIP(userDoc._id, ipAddress);

      // Update user: force password change and MFA setup
      userDoc.mustChangeCredentials = true;
      userDoc.mustSetupMfa = true;
      userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1; // Invalidate all sessions
      userDoc.lastLoginAt = new Date();
      await userDoc.save();

      // Generate JWT token
      const tokenData = signAccessToken({
        _id: userDoc._id,
        id: String(userDoc._id),
        email: userDoc.email,
        role: userDoc.role,
        tokenVersion: userDoc.tokenVersion,
      });
      const token = tokenData.token;

      // Create session for temporary credentials login
      try {
        const Session = require("../models/Session");
        const timeout = 60 * 60 * 1000; // 1 hour for staff
        const expiresAt = new Date(Date.now() + timeout);

        await Session.create({
          userId: userDoc._id,
          tokenVersion: userDoc.tokenVersion,
          ipAddress,
          userAgent,
          lastActivityAt: new Date(),
          expiresAt,
          isActive: true,
        });
      } catch (sessionError) {
        console.warn("Failed to create session on temp login:", sessionError);
      }

      // Log to audit trail
      await logAuditEvent(
        userDoc._id,
        "temporary_credentials_used",
        "User",
        userDoc._id,
        {
          role: roleSlug,
          fieldChanged: "password",
          oldValue: "",
          newValue: "temp_login_successful",
          ip: ipAddress,
          userAgent,
          temporaryCredentialId: String(tempCredential._id),
          issuedBy: String(tempCredential.issuedBy?._id || ""),
        },
      );

      const userSafe = {
        id: String(userDoc._id),
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        role: userDoc.role?.slug || roleSlug,
        office: userDoc.office || "",
        mustChangeCredentials: true,
        mustSetupMfa: true,
        token,
      };

      return res.json({
        success: true,
        user: userSafe,
        message:
          "Login successful. You must change your password and set up MFA.",
        requiresPasswordChange: true,
        requiresMfaSetup: true,
      });
    } catch (err) {
      console.error("POST /api/auth/staff/login-temporary error:", err);
      return respond.error(
        res,
        500,
        "login_failed",
        "Failed to login with temporary credentials",
      );
    }
  },
);

module.exports = router;
