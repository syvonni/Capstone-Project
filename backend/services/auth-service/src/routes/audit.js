const express = require("express");
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const User = require("../models/User");
const auditVerifier = require("../lib/auditVerifier");
const { isBusinessOwnerRole, isAdminRole } = require("../lib/roleHelpers");
const { maskSensitiveData } = require("../lib/dataMasker");
const { validateBody, Joi } = require("../middleware/validation");
const { containsSqlInjection } = require("../lib/sanitizer");
const axios = require("axios");

const router = express.Router();
const AUDIT_SERVICE_URL =
  process.env.AUDIT_SERVICE_URL || "http://localhost:3004";

/**
 * Mask sensitive data in audit log
 */
function maskAuditLogData(log) {
  const masked = { ...log };

  // Mask password fields
  if (masked.fieldChanged === "password") {
    masked.oldValue = "[REDACTED]";
    masked.newValue = "[REDACTED]";
  }

  // Mask sensitive fields in metadata
  if (masked.metadata) {
    const safeMetadata = { ...masked.metadata };
    if (safeMetadata.newPasswordHash) {
      safeMetadata.newPasswordHash = "[REDACTED]";
    }
    masked.metadata = safeMetadata;
  }

  return masked;
}

// GET /api/auth/audit/my-actions
// GET /api/auth/audit/my-actions - Get current user's action history - proxy to audit-service
router.get("/my-actions", requireJwt, async (req, res) => {
  try {
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${AUDIT_SERVICE_URL}/api/audit/my-actions?${new URLSearchParams(req.query)}`,
      { headers },
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Proxy to audit-service failed:", err.message);
    return respond.error(
      res,
      500,
      "audit_proxy_failed",
      "Failed to fetch action history from audit-service",
    );
  }
});

// GET /api/auth/audit/history
// Get user's audit history - proxy to audit-service
router.get("/history", requireJwt, async (req, res) => {
  try {
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${AUDIT_SERVICE_URL}/api/audit/history?${new URLSearchParams(req.query)}`,
      { headers },
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Proxy to audit-service failed:", err.message);
    return respond.error(
      res,
      500,
      "audit_proxy_failed",
      "Failed to fetch audit history from audit-service",
    );
  }
});

// GET /api/auth/audit/history/:auditLogId
// Get specific audit log - proxy to audit-service
router.get("/history/:auditLogId", requireJwt, async (req, res) => {
  try {
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${AUDIT_SERVICE_URL}/api/audit/history/${req.params.auditLogId}`,
      { headers },
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Proxy to audit-service failed:", err.message);
    return respond.error(
      res,
      500,
      "audit_proxy_failed",
      "Failed to fetch audit log from audit-service",
    );
  }
});

// GET /api/auth/audit/verify/:auditLogId
// Verify audit log integrity against blockchain - proxy to audit-service
router.get("/verify/:auditLogId", requireJwt, async (req, res) => {
  try {
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${AUDIT_SERVICE_URL}/api/audit/verify/${req.params.auditLogId}`,
      { headers },
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Proxy to audit-service failed:", err.message);
    return respond.error(
      res,
      500,
      "audit_proxy_failed",
      "Failed to verify audit log from audit-service",
    );
  }
});

// GET /api/auth/audit/export
// Export audit history (CSV/JSON) - GDPR compliance - proxy to audit-service
router.get("/export", requireJwt, async (req, res) => {
  try {
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${AUDIT_SERVICE_URL}/api/audit/export?${new URLSearchParams(req.query)}`,
      { headers },
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Proxy to audit-service failed:", err.message);
    return respond.error(
      res,
      500,
      "audit_proxy_failed",
      "Failed to export audit logs from audit-service",
    );
  }
});

// GET /api/auth/audit/admin/all — register before /admin/recent so static path matches first
// Get all audit logs across all users (admin only) with pagination, filters, search - proxy to audit-service
router.get(
  "/admin/all",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const headers = {
        Authorization: req.headers.authorization,
        "Content-Type": "application/json",
      };

      const response = await axios.get(
        `${AUDIT_SERVICE_URL}/api/audit/admin/all?${new URLSearchParams(req.query)}`,
        { headers },
      );

      return res.json(response.data);
    } catch (err) {
      console.error("Proxy to audit-service failed:", err.message);
      return respond.error(
        res,
        500,
        "audit_proxy_failed",
        "Failed to fetch admin audit logs from audit-service",
      );
    }
  },
);

// GET /api/auth/admin/audit/recent
// Get recent audit activity across all staff (admin only) - proxy to audit-service
router.get(
  "/admin/recent",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const headers = {
        Authorization: req.headers.authorization,
        "Content-Type": "application/json",
      };

      const response = await axios.get(
        `${AUDIT_SERVICE_URL}/api/audit/admin/recent?${new URLSearchParams(req.query)}`,
        { headers },
      );

      return res.json(response.data);
    } catch (err) {
      console.error("Proxy to audit-service failed:", err.message);
      return respond.error(
        res,
        500,
        "audit_proxy_failed",
        "Failed to fetch recent audit logs from audit-service",
      );
    }
  },
);

// GET /api/auth/audit/staff/all
// Get all audit logs for staff users (lgu_officer, inspector, cso, etc.)
// Shows system-wide logs relevant to staff operations - proxy to audit-service
router.get("/staff/all", requireJwt, async (req, res) => {
  try {
    const headers = {
      Authorization: req.headers.authorization,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${AUDIT_SERVICE_URL}/api/audit/staff/all?${new URLSearchParams(req.query)}`,
      { headers },
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Proxy to audit-service failed:", err.message);
    return respond.error(
      res,
      500,
      "audit_proxy_failed",
      "Failed to fetch staff audit logs from audit-service",
    );
  }
});

// GET /api/auth/audit/stats
// Get audit statistics (admin only)
router.get("/stats", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const stats = await auditVerifier.getVerificationStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (err) {
    console.error("GET /api/auth/audit/stats error:", err);
    return respond.error(
      res,
      500,
      "stats_failed",
      "Failed to retrieve audit statistics",
    );
  }
});

// Proxy route: GET /api/auth/audit/application/:applicationId - Proxy to audit-service
router.get(
  "/application/:applicationId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      console.log(
        `[audit-proxy] Fetching audit logs for application ${applicationId}`,
      );

      const headers = {
        Authorization: req.headers.authorization,
        "Content-Type": "application/json",
      };

      const response = await axios.get(
        `${AUDIT_SERVICE_URL}/api/audit/application/${applicationId}?page=${page}&limit=${limit}`,
        { headers },
      );

      console.log(
        `[audit-proxy] Successfully fetched ${response.data.logs?.length || 0} logs`,
      );
      return res.json(response.data);
    } catch (err) {
      console.error(
        "[audit-proxy] Proxy to audit-service failed:",
        err.message,
      );
      return respond.error(
        res,
        500,
        "audit_proxy_failed",
        "Failed to fetch audit logs from audit-service",
      );
    }
  },
);

// Proxy route: GET /api/auth/audit/help-request/:requestId - Proxy to audit-service
router.get(
  "/help-request/:requestId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const headers = {
        Authorization: req.headers.authorization,
        "Content-Type": "application/json",
      };

      const response = await axios.get(
        `${AUDIT_SERVICE_URL}/api/audit/help-request/${requestId}?page=${page}&limit=${limit}`,
        { headers },
      );

      return res.json(response.data);
    } catch (err) {
      console.error("Proxy to audit-service failed:", err.message);
      return respond.error(
        res,
        500,
        "audit_proxy_failed",
        "Failed to fetch audit logs from audit-service",
      );
    }
  },
);

// Proxy route: GET /api/auth/audit/business-owner/:ownerId - Proxy to audit-service
router.get(
  "/business-owner/:ownerId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const headers = {
        Authorization: req.headers.authorization,
        "Content-Type": "application/json",
      };

      const response = await axios.get(
        `${AUDIT_SERVICE_URL}/api/audit/business-owner/${ownerId}?page=${page}&limit=${limit}`,
        { headers },
      );

      return res.json(response.data);
    } catch (err) {
      console.error(
        "[audit-proxy] Proxy to audit-service failed:",
        err.message,
      );
      return respond.error(
        res,
        500,
        "audit_proxy_failed",
        "Failed to fetch audit logs from audit-service",
      );
    }
  },
);

module.exports = router;
