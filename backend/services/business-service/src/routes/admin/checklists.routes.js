const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const checklistController = require("../../controllers/admin/checklist.controller");

const router = express.Router();

// GET /api/business/admin/checklists - list with filters
router.get("/", requireJwt, (req, res) => checklistController.list(req, res));

// GET /api/business/admin/checklists/data-quality - get data quality issues for all checklists
router.get(
  "/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => checklistController.getDataQuality(req, res),
);

// GET /api/business/admin/checklists/performance - get performance metrics
router.get(
  "/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => checklistController.getPerformance(req, res),
);

// GET /api/business/admin/checklists/:id - get single checklist
router.get(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => checklistController.getById(req, res),
);

// POST /api/business/admin/checklists - create checklist
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => checklistController.create(req, res),
);

// PUT /api/business/admin/checklists/:id - update checklist
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => checklistController.update(req, res),
);

// DELETE /api/business/admin/checklists/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => checklistController.disable(req, res),
);

// GET /api/business/admin/checklists/:id/audit - proxy to audit service
router.get("/:id/audit", requireJwt, (req, res) => checklistController.getAuditHistory(req, res));

// GET /api/business/admin/checklists/:id/data-quality - get data quality for single checklist
router.get(
  "/:id/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => checklistController.getDataQualityById(req, res),
);

// GET /api/business/admin/checklists/:id/performance - get performance for single checklist
router.get(
  "/:id/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => checklistController.getPerformanceById(req, res),
);

module.exports = router;
