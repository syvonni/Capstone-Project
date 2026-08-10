const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const violationController = require("../../controllers/admin/violation.controller");

const router = express.Router();

// GET /api/business/admin/violations - list with filters
router.get("/", requireJwt, (req, res) => violationController.list(req, res));

// GET /api/business/admin/violations/data-quality - get data quality issues for all violations
router.get(
  "/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getDataQuality(req, res),
);

// GET /api/business/admin/violations/performance - get performance metrics
router.get(
  "/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getPerformance(req, res),
);

// GET /api/business/admin/violations/:id - get single violation
router.get(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getById(req, res),
);

// POST /api/business/admin/violations - create violation
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => violationController.create(req, res),
);

// PUT /api/business/admin/violations/:id - update violation
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => violationController.update(req, res),
);

// DELETE /api/business/admin/violations/:id - soft-disable violation
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => violationController.disable(req, res),
);

// GET /api/business/admin/violations/:id/inspection-items - get inspection items for violation
router.get(
  "/:id/inspection-items",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getInspectionItems(req, res),
);

// GET /api/business/admin/violations/:id/audit - proxy to audit service
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getAuditHistory(req, res),
);

// GET /api/business/admin/violations/:id/data-quality - get data quality for single violation
router.get(
  "/:id/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getDataQualityById(req, res),
);

// GET /api/business/admin/violations/:id/performance - get performance for single violation
router.get(
  "/:id/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => violationController.getPerformanceById(req, res),
);

module.exports = router;
