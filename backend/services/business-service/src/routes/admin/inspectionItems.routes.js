const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const inspectionItemController = require("../../controllers/admin/inspectionItem.controller");

const router = express.Router();

// GET /api/business/admin/inspection-items - list with filters
router.get("/", requireJwt, (req, res) => inspectionItemController.list(req, res));

// GET /api/business/admin/inspection-items/data-quality - get data quality issues for all inspection items
router.get(
  "/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => inspectionItemController.getDataQuality(req, res),
);

// GET /api/business/admin/inspection-items/performance - get performance metrics
router.get(
  "/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => inspectionItemController.getPerformance(req, res),
);

// GET /api/business/admin/inspection-items/by-violation/:violationId - get by violation
router.get(
  "/by-violation/:violationId",
  requireJwt,
  (req, res) => inspectionItemController.getByViolationId(req, res),
);

// POST /api/business/admin/inspection-items - create
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => inspectionItemController.create(req, res),
);

// GET /api/business/admin/inspection-items/:id - get single
router.get(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => inspectionItemController.getById(req, res),
);

// GET /api/business/admin/inspection-items/:id/checklists - get checklists
router.get(
  "/:id/checklists",
  requireJwt,
  (req, res) => inspectionItemController.getChecklists(req, res),
);

// GET /api/business/admin/inspection-items/:id/audit - proxy to audit service
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => inspectionItemController.getAuditHistory(req, res),
);

// PUT /api/business/admin/inspection-items/:id - update
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => inspectionItemController.update(req, res),
);

// DELETE /api/business/admin/inspection-items/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => inspectionItemController.disable(req, res),
);

// GET /api/business/admin/inspection-items/:id/data-quality - get data quality for single inspection item
router.get(
  "/:id/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => inspectionItemController.getDataQualityById(req, res),
);

// GET /api/business/admin/inspection-items/:id/performance - get performance for single inspection item
router.get(
  "/:id/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => inspectionItemController.getPerformanceById(req, res),
);

module.exports = router;
