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
const feesRouter = require("./fees");
const applicationsRouter = require("./applications");
const requirementsRouter = require("./requirements");
const taxBracketsRouter = require("./taxBrackets");
const lobsRouter = require("./lobs");
const violationsRouter = require("./violations");
const inspectionItemsRouter = require("./inspectionItems");
const checklistsRouter = require("./checklists");
const postRequirementsRouter = require("./postRequirements");
const permitFormsRouter = require("./permitForms");
const variablesRouter = require("./variables");
const businessOwnerRouter = require("./businessOwner");
const helpRequestRouter = require("./helpRequest");
const router = express.Router();

// Ingest endpoint for service-to-service audit event submission
// Uses API key authentication instead of JWT
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
      metadata = {},
    } = req.body;

    // Validate required fields
    if (!userId || !eventType || !entityType || !entityId) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Missing required fields: userId, eventType, entityType, entityId",
        },
      });
    }

    // Calculate hash for integrity verification
    const hashData = JSON.stringify({
      userId,
      eventType,
      entityType,
      entityId,
      fieldChanged,
      oldValue,
      newValue,
      role,
      metadata,
      timestamp: new Date().toISOString(),
    });
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');

    // Create audit log
    const auditLog = new AuditLog({
      userId,
      eventType,
      entityType,
      entityId,
      fieldChanged,
      oldValue,
      newValue,
      role,
      metadata,
      hash,
      createdAt: new Date(),
    });

    await auditLog.save();

    logger.info("Audit log ingested successfully", {
      auditLogId: auditLog._id,
      eventType,
      entityType,
      entityId,
    });

    res.status(201).json({
      ok: true,
      auditLogId: auditLog._id,
      message: "Audit log ingested successfully",
    });
  } catch (err) {
    logger.error("Failed to ingest audit log", { error: err.message });
    res.status(500).json({
      error: {
        code: "internal_error",
        message: "Failed to ingest audit log",
      },
    });
  }
});

// Mount entity-specific audit routes
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
router.use(businessOwnerRouter);
router.use(helpRequestRouter);

module.exports = router;
