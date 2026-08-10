const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const lobController = require("../../controllers/admin/lob.controller");

const router = express.Router();

// GET /api/business/admin/lobs — list all LOBs
router.get("/", requireJwt, (req, res) => lobController.list(req, res));

// GET /api/business/admin/lobs/data-quality — get data quality issues for all LOBs
router.get(
  "/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => lobController.getDataQuality(req, res),
);

// GET /api/business/admin/lobs/performance — get performance metrics
router.get(
  "/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => lobController.getPerformance(req, res),
);

// GET /api/business/admin/lobs/audit — get all LOB audit logs
router.get(
  "/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => lobController.getAllAuditLogs(req, res),
);

// GET /api/business/admin/lobs/post-requirements — get available post requirements
router.get(
  "/post-requirements",
  requireJwt,
  (req, res) => lobController.getPostRequirements(req, res),
);

// GET /api/business/admin/lobs/:id — single LOB
router.get(
  "/:id",
  requireJwt,
  (req, res) => lobController.getById(req, res),
);

// GET /api/business/admin/lobs/:id/audit — proxy to audit service
router.get(
  "/:id/audit",
  requireJwt,
  (req, res) => lobController.getAuditHistory(req, res),
);

// POST /api/business/admin/lobs — create LOB
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => lobController.create(req, res),
);

// PUT /api/business/admin/lobs/:id — update LOB
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => lobController.update(req, res),
);

// GET /api/business/admin/lobs/:id/data-quality — get data quality for single LOB
router.get(
  "/:id/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => lobController.getDataQualityById(req, res),
);

// GET /api/business/admin/lobs/:id/performance — get performance for single LOB
router.get(
  "/:id/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => lobController.getPerformanceById(req, res),
);

module.exports = router;
