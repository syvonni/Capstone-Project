const express = require("express");
const crypto = require("crypto");
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const {
  auditLogRateLimit,
} = require("../middleware/rateLimit");
const { requireServiceAuth } = require("../middleware/requireServiceAuth");
const logger = require("../lib/logger");
const AuditLog = require("../models/AuditLog");
const feesRouter = require("./audit/fees");
const applicationsRouter = require("./audit/applications");
const requirementsRouter = require("./audit/requirements");
const taxBracketsRouter = require("./audit/taxBrackets");
const lobsRouter = require("./audit/lobs");
const violationsRouter = require("./audit/violations");
const inspectionItemsRouter = require("./audit/inspectionItems");
const checklistsRouter = require("./audit/checklists");
const postRequirementsRouter = require("./audit/postRequirements");
const permitFormsRouter = require("./audit/permitForms");
const variablesRouter = require("./audit/variables");
const router = express.Router();

// GET /api/audit/my-actions - Get current user's FULL action history (work events + personal security events)
// Uses raw MongoDB collection to bypass Mongoose enum restrictions, since officer work events
// (application_claimed, permit_review, etc.) are written by admin-service and the auth-service
// AuditLog model's enum doesn't include them. Also decrypts metadata in application code.
router.get("/my-actions", requireJwt, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const viewerId = req._userId;
    const viewerIdStr = String(viewerId);
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const skip = Number(req.query.skip) || 0;
    const eventType = req.query.eventType;

    // Import decryption utility (safe wrapper that never throws)
    let _decrypt;
    try {
      _decrypt = require("../../../../shared/lib/fieldCipher").decrypt;
    } catch (e) {
      _decrypt = null;
    }
    const decrypt = (v) => {
      if (!_decrypt) return v;
      try {
        return _decrypt(v);
      } catch {
        return v;
      }
    };

    // Query raw collection directly to bypass Mongoose enum validation
    const collection = mongoose.connection.db.collection("auditlogs");

    // Step 1: Get ALL logs where officer is the direct userId (includes security + work events)
    const directQuery = {
      userId: new mongoose.Types.ObjectId(viewerIdStr),
    };
    if (eventType) directQuery.eventType = eventType;

    const directLogs = await collection
      .find(directQuery)
      .sort({ createdAt: -1 })
      .limit(limit * 3) // fetch extra since we'll merge with work logs
      .toArray();

    // Step 2: Get work-event logs where officer is identified via metadata.officerId
    // (these logs have userId = business owner, not the officer)
    const workEventTypes = [
      "permit_review",
      "permit_review_started",
      "application_claimed",
      "application_released",
      "application_transferred",
      "decision_revoked",
      "walkin_application_created",
    ];
    const workQuery = {
      eventType: { $in: workEventTypes },
    };
    if (eventType) workQuery.eventType = eventType;

    const workLogs = await collection
      .find(workQuery)
      .sort({ createdAt: -1 })
      .limit(500) // reasonable window
      .toArray();

    // Decrypt metadata and filter by officerId
    const officerWorkLogs = workLogs.filter((log) => {
      // Skip if we already have this log from directQuery (userId matches officer)
      if (String(log.userId) === viewerIdStr) return false;

      let meta = log.metadata;
      if (typeof meta === "string") {
        try {
          meta = JSON.parse(decrypt(meta) || meta);
        } catch {
          return false;
        }
      }
      if (!meta || typeof meta !== "object") return false;
      const officerId = meta.officerId;
      return officerId && String(officerId) === viewerIdStr;
    });

    // Merge and deduplicate by _id
    const seen = new Set();
    const merged = [];
    for (const log of [...directLogs, ...officerWorkLogs]) {
      const id = String(log._id);
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(log);
    }

    // Sort by createdAt desc, apply pagination
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paginated = merged.slice(skip, skip + limit);

    // Decrypt fields and format response
    const safeLogs = paginated.map((log) => {
      let meta = log.metadata;
      if (typeof meta === "string") {
        try {
          meta = JSON.parse(decrypt(meta) || meta);
        } catch {
          meta = {};
        }
      }
      return {
        _id: String(log._id),
        eventType: log.eventType,
        fieldChanged: log.fieldChanged || null,
        oldValue: decrypt(log.oldValue) || log.oldValue || "",
        newValue: decrypt(log.newValue) || log.newValue || "",
        role: decrypt(log.role) || log.role || "",
        createdAt: log.createdAt,
        verified: log.verified || false,
        txHash: log.txHash || "",
        blockNumber: log.blockNumber || null,
        metadata: meta,
      };
    });

    return res.json({
      success: true,
      logs: safeLogs,
      total: merged.length,
      limit,
      skip,
      hasMore: skip + limit < merged.length,
    });
  } catch (err) {
    console.error("GET /api/audit/my-actions error:", err);
    return respond.error(
      res,
      500,
      "my_actions_failed",
      "Failed to retrieve action history",
    );
  }
});

// GET /api/audit/history - Get audit history (least privilege: non-admin sees only own logs)
router.get("/history", requireJwt, async (req, res) => {
  try {
    const {
      userId,
      eventType,
      startDate,
      endDate,
      limit = 50,
      skip = 0,
    } = req.query;
    const isAdmin =
      req._userRole === "admin" || req._userRole === "super_admin";

    const query = {};
    if (userId) {
      if (!isAdmin && userId !== req._userId) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Cannot view other users' audit history",
        );
      }
      query.userId = userId;
    } else if (!isAdmin) {
      query.userId = req._userId;
    }
    if (eventType) query.eventType = eventType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const total = await AuditLog.countDocuments(query);

    return res.json({
      success: true,
      logs: auditLogs,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err) {
    console.error("GET /api/audit/history error:", err);
    return respond.error(
      res,
      500,
      "fetch_audit_history_failed",
      "Failed to fetch audit history",
    );
  }
});

// GET /api/audit/history/:auditLogId - Get specific audit log
router.get("/history/:auditLogId", requireJwt, async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const auditLog = await AuditLog.findById(auditLogId).lean();

    if (!auditLog) {
      return respond.error(
        res,
        404,
        "audit_log_not_found",
        "Audit log not found",
      );
    }

    // Check permissions
    const isOwner = String(auditLog.userId) === String(req._userId);
    const isAdmin =
      req._userRole === "admin" || req._userRole === "super_admin";

    if (!isOwner && !isAdmin) {
      return respond.error(
        res,
        403,
        "forbidden",
        "You do not have permission to view this audit log",
      );
    }

    return res.json({
      success: true,
      log: auditLog,
    });
  } catch (err) {
    console.error("GET /api/audit/history/:auditLogId error:", err);
    return respond.error(
      res,
      500,
      "audit_log_fetch_failed",
      "Failed to retrieve audit log",
    );
  }
});

// GET /api/audit/export - Export audit logs
router.get("/export", requireJwt, async (req, res) => {
  try {
    const {
      format = "json",
      eventType,
      startDate,
      endDate,
      userId,
    } = req.query;
    const isAdmin =
      req._userRole === "admin" || req._userRole === "super_admin";

    // Determine target user
    let targetUserId = req._userId;
    if (userId && isAdmin) {
      targetUserId = userId;
    } else if (userId && userId !== req._userId) {
      return respond.error(
        res,
        403,
        "forbidden",
        "You can only export your own audit history",
      );
    }

    const query = { userId: targetUserId };
    if (eventType) query.eventType = eventType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query).sort({ createdAt: -1 }).lean();

    if (format === "csv") {
      const csvHeaders = [
        "ID",
        "Event Type",
        "Field Changed",
        "Old Value",
        "New Value",
        "Role",
        "Created At",
        "Verified",
        "TX Hash",
      ];
      const csvRows = auditLogs.map((log) => [
        String(log._id),
        log.eventType || "",
        log.fieldChanged || "",
        log.oldValue || "",
        log.newValue || "",
        log.role || "",
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
        log.verified ? "Yes" : "No",
        log.txHash || "",
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-history-${Date.now()}.csv"`,
      );
      return res.send(csvContent);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-history-${Date.now()}.json"`,
      );
      return res.json({
        exportedAt: new Date().toISOString(),
        userId: String(targetUserId),
        totalRecords: auditLogs.length,
        logs: auditLogs,
      });
    }
  } catch (err) {
    console.error("GET /api/audit/export error:", err);
    return respond.error(
      res,
      500,
      "export_failed",
      "Failed to export audit history",
    );
  }
});

// GET /api/audit/admin/all - Get all audit logs (admin only)
router.get(
  "/admin/all",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const skip = Number(req.query.skip) || 0;
      const eventType = req.query.eventType;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

      const query = {};
      if (eventType) query.eventType = eventType;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const [auditLogs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return res.json({
        success: true,
        logs: auditLogs,
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      });
    } catch (err) {
      console.error("GET /api/audit/admin/all error:", err);
      return respond.error(
        res,
        500,
        "admin_audit_failed",
        "Failed to retrieve admin audit logs",
      );
    }
  },
);

// GET /api/audit/admin/recent - Get recent audit logs (admin only)
router.get(
  "/admin/recent",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const auditLogs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        logs: auditLogs,
      });
    } catch (err) {
      console.error("GET /api/audit/admin/recent error:", err);
      return respond.error(
        res,
        500,
        "recent_audit_failed",
        "Failed to retrieve recent audit logs",
      );
    }
  },
);

// GET /api/audit/staff/all - Get staff audit logs
router.get("/staff/all", requireJwt, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const skip = Number(req.query.skip) || 0;
    const eventType = req.query.eventType;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const query = {};
    if (eventType) query.eventType = eventType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      logs: auditLogs,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
    });
  } catch (err) {
    console.error("GET /api/audit/staff/all error:", err);
    return respond.error(
      res,
      500,
      "staff_audit_failed",
      "Failed to retrieve staff audit logs",
    );
  }
});

// GET /api/audit/stats - Get verification statistics
router.get("/stats", requireServiceAuth, async (req, res) => {
  try {
    const [total, verified, notLogged] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ verified: true }),
      AuditLog.countDocuments({ txHash: "" }),
    ]);

    const unverified = total - verified - notLogged;

    return res.json({
      success: true,
      stats: {
        total,
        verified,
        unverified,
        notLogged,
      },
    });
  } catch (err) {
    console.error("GET /api/audit/stats error:", err);
    return respond.error(
      res,
      500,
      "stats_failed",
      "Failed to retrieve audit statistics",
    );
  }
});

// Blockchain verify endpoints removed - blockchain feature deleted
// Previously: GET /api/audit/verify/:auditLogId and POST /api/audit/verify-data
// These endpoints returned hardcoded responses after blockchain was removed

// POST /api/audit/ingest - Ingest audit event from other services (centralized audit log creation)
router.post("/ingest", requireServiceAuth, async (req, res) => {
  try {
    const {
      userId,
      eventType,
      entityType,
      entityId,
      fieldChanged,
      oldValue,
      newValue,
      role,
      metadata,
    } = req.body;

    logger.info("POST /api/audit/ingest received", {
      userId,
      eventType,
      entityType,
      entityId,
      fieldChanged,
      oldValue,
      newValue,
      role,
      metadataKeys: metadata ? Object.keys(metadata) : [],
    });

    // Validate required fields
    if (!userId || !eventType || !entityType || !entityId) {
      return respond.error(
        res,
        400,
        "missing_params",
        "userId, eventType, entityType, and entityId are required",
      );
    }

    // Calculate hash - use one timestamp for both hash and createdAt so verification passes
    const timestamp = new Date();
    const timestampISO = timestamp.toISOString();
    const hashableData = {
      userId: String(userId),
      eventType,
      fieldChanged: fieldChanged || "",
      oldValue: oldValue || "",
      newValue: newValue || "",
      role: role || "system",
      metadata: JSON.stringify(metadata || {}),
      timestamp: timestampISO,
    };
    const dataString = JSON.stringify(hashableData);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");

    // Create audit log in audit-service database with explicit createdAt to match hash timestamp
    const auditLog = await AuditLog.create({
      userId,
      eventType,
      fieldChanged: fieldChanged || null,
      oldValue: oldValue || "",
      newValue: newValue || "",
      role: role || "system",
      metadata: metadata || {},
      entityType,
      entityId,
      hash,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    logger.info("Audit log ingested", {
      auditLogId: String(auditLog._id),
      eventType,
      entityType,
      entityId,
    });

    // Blockchain queue removed - blockchain feature deleted

    return respond.success(res, 201, {
      auditLogId: String(auditLog._id),
      hash,
      queued: false,
    });
  } catch (err) {
    logger.error("POST /api/audit/ingest error", { error: err.message });
    return respond.error(
      res,
      500,
      "audit_ingest_failed",
      "Failed to ingest audit log",
    );
  }
},
);

// POST /api/audit/store-document - Store document CID in DocumentStorage contract (called by other services)
router.post("/store-document", requireServiceAuth, async (req, res) => {
  try {
    const { userId, docType, ipfsCid } = req.body;

    if (!userId || !docType || !ipfsCid) {
      return respond.error(
        res,
        400,
        "missing_params",
        "userId, docType, and ipfsCid are required",
      );
    }

    const documentStorageService = require("../lib/documentStorageService");

    if (!documentStorageService) {
      return res.json({
        success: false,
        error: "DocumentStorage service not available",
      });
    }

    // Store document CID in blockchain (non-blocking, queue if needed)
    try {
      const result = await documentStorageService.storeDocument(
        userId,
        docType,
        ipfsCid,
      );

      if (result.success) {
        return res.json({ success: true, txHash: result.txHash });
      } else {
        // Don't fail the request if blockchain storage fails
        return res.json({ success: false, error: result.error, queued: false });
      }
    } catch (error) {
      // Non-blocking - return success even if blockchain storage fails
      return res.json({ success: false, error: error.message, queued: false });
    }
  } catch (err) {
    console.error("POST /api/audit/store-document error:", err);
    // Non-blocking endpoint - return success even on error
    return res.json({ success: false, error: err.message });
  }
});

// POST /api/audit/register-user - Register user in UserRegistry contract (called by other services)
router.post("/register-user", requireServiceAuth, async (req, res) => {
  try {
    const { userId, userAddress, profileHash } = req.body;

    if (!userId || !userAddress || !profileHash) {
      return respond.error(
        res,
        400,
        "missing_params",
        "userId, userAddress, and profileHash are required",
      );
    }

    const userRegistryService = require("../lib/userRegistryService");

    if (!userRegistryService) {
      return res.json({
        success: false,
        error: "UserRegistry service not available",
      });
    }

    // Register user in blockchain (non-blocking)
    try {
      const result = await userRegistryService.registerUser(
        userId,
        userAddress,
        profileHash,
      );

      if (result.success) {
        return res.json({ success: true, txHash: result.txHash });
      } else {
        return res.json({ success: false, error: result.error });
      }
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  } catch (err) {
    console.error("POST /api/audit/register-user error:", err);
    return res.json({ success: false, error: err.message });
  }
});

// queue-status endpoint removed - blockchain queue deleted
// Previously: GET /api/audit/queue-status — blockchain queue health (service-to-service)

// GET /api/audit/logs - Generic admin query endpoint for audit logs (service-to-service)
router.get("/logs", requireServiceAuth, async (req, res) => {
  try {
    const {
      eventType,
      userId,
      fieldChanged,
      startDate,
      endDate,
      entityType,
      entityId,
      limit = 50,
      skip = 0,
      sort = "createdAt:-1",
    } = req.query;

    // Import decryption utility (safe wrapper that never throws)
    let _decrypt;
    try {
      _decrypt = require("../../../../shared/lib/fieldCipher").decrypt;
    } catch (e) {
      _decrypt = null;
    }
    const decrypt = (v) => {
      if (!_decrypt) return v;
      try {
        return _decrypt(v);
      } catch {
        return v;
      }
    };

    const query = {};
    if (eventType) {
      // Support regex patterns like { $regex: "^permit_forms_" }
      if (typeof eventType === "string" && eventType.startsWith("{")) {
        try {
          query.eventType = JSON.parse(eventType);
        } catch (e) {
          query.eventType = eventType;
        }
      } else {
        query.eventType = eventType;
      }
    }
    if (userId) query.userId = userId;
    if (fieldChanged) query.fieldChanged = fieldChanged;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Parse sort parameter
    let sortObj = { createdAt: -1 };
    if (sort && typeof sort === "string") {
      const [field, order] = sort.split(":");
      if (field) {
        sortObj = {};
        sortObj[field] = order === "1" || order === "asc" ? 1 : -1;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sortObj)
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Decrypt encrypted fields before returning
    const decryptedLogs = logs.map((log) => ({
      ...log,
      oldValue: decrypt(log.oldValue) || log.oldValue || "",
      newValue: decrypt(log.newValue) || log.newValue || "",
      role: decrypt(log.role) || log.role || "",
      // blockchainError decryption removed - blockchain feature deleted
    }));

    return res.json({
      success: true,
      logs: decryptedLogs,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err) {
    console.error("GET /api/audit/logs error:", err);
    return respond.error(
      res,
      500,
      "fetch_logs_failed",
      "Failed to fetch audit logs",
    );
  }
});

// Mount fee-specific and application-specific audit routes
router.use(feesRouter);
router.use(requirementsRouter);
router.use(applicationsRouter);
router.use(taxBracketsRouter);
router.use(lobsRouter);
router.use(violationsRouter);
router.use(inspectionItemsRouter);
router.use(checklistsRouter);
router.use(postRequirementsRouter);
router.use(permitFormsRouter);
router.use(variablesRouter);

// GET /api/audit/business-owner/:ownerId - Get audit logs for a specific business owner
router.get(
  "/business-owner/:ownerId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {
        $or: [
          { "metadata.ownerId": ownerId },
          { "metadata.entityId": ownerId },
          { userId: ownerId },
        ],
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return respond.success(res, 200, {
        logs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } catch (err) {
      logger.error("GET /api/audit/business-owner/:ownerId error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "audit_fetch_error",
        "Failed to fetch audit logs",
      );
    }
  },
);

// GET /api/audit/help-request/:requestId - Get audit logs for a specific help request
router.get(
  "/help-request/:requestId",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {
        $or: [
          { "metadata.requestId": requestId },
          { "metadata.entityId": requestId },
        ],
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate("userId", "firstName lastName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return respond.success(res, 200, {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (err) {
      logger.error("GET /api/audit/help-request/:requestId error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "audit_fetch_error",
        "Failed to fetch audit logs",
      );
    }
  },
);

// GET /api/audit/gas-budget — gas budget status for treasury/IT dashboard
router.get("/gas-budget", requireServiceAuth, async (req, res) => {
  try {
    const gasBudgetTracker = require("../lib/gasBudgetTracker");
    return res.json(gasBudgetTracker.getStatus());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/audit/forensic/:auditLogId — forensic analysis of a single audit record
router.get("/forensic/:auditLogId", requireServiceAuth, async (req, res) => {
  try {
    const auditLog = await AuditLog.findById(req.params.auditLogId).lean();
    if (!auditLog)
      return res.status(404).json({ error: "Audit log not found" });

    const hashableData = {
      userId: String(auditLog.userId),
      eventType: auditLog.eventType,
      fieldChanged: auditLog.fieldChanged || "",
      oldValue: auditLog.oldValue || "",
      newValue: auditLog.newValue || "",
      role: auditLog.role,
      metadata: JSON.stringify(auditLog.metadata || {}),
      timestamp: auditLog.createdAt ? auditLog.createdAt.toISOString() : "",
    };
    const currentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(hashableData))
      .digest("hex");
    const storedHash = auditLog.hash;
    const tampered = currentHash !== storedHash;

    // Blockchain verification removed - feature deleted

    return res.json({
      auditLog,
      forensic: {
        currentHash,
        storedHash,
        hashMatch: !tampered,
        tampered,
        blockchainRecord: null,
        blockchainAnchored: false,
        blockchainVerified: false,
        diagnosis: tampered
          ? "The MongoDB record has been modified after it was hashed."
          : "Record integrity verified (MongoDB-only).",
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
