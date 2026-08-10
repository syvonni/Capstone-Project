const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const postRequirementController = require("../../controllers/admin/postRequirement.controller");

const router = express.Router();

// GET /api/business/admin/post-requirements - list with filters
router.get("/", requireJwt, (req, res) => postRequirementController.list(req, res));

// GET /api/business/admin/post-requirements/data-quality - get data quality issues for all post requirements
router.get(
  "/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getDataQuality(req, res),
);

// GET /api/business/admin/post-requirements/performance - get performance metrics
router.get(
  "/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getPerformance(req, res),
);

// GET /api/business/admin/post-requirements/audit - get all post requirement audit logs
router.get(
  "/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getAllAuditLogs(req, res),
);

// POST /api/business/admin/post-requirements - create
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => postRequirementController.create(req, res),
);

// GET /api/business/admin/post-requirements/:id - get single
router.get(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getById(req, res),
);

// GET /api/business/admin/post-requirements/:id/audit - get audit history for single post requirement
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getAuditHistory(req, res),
);

// PUT /api/business/admin/post-requirements/:id - update
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => postRequirementController.update(req, res),
);

// DELETE /api/business/admin/post-requirements/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => postRequirementController.disable(req, res),
);

// GET /api/business/admin/post-requirements/:id/data-quality - get data quality for single post requirement
router.get(
  "/:id/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getDataQualityById(req, res),
);

// GET /api/business/admin/post-requirements/:id/performance - get performance for single post requirement
router.get(
  "/:id/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => postRequirementController.getPerformanceById(req, res),
);

module.exports = router;
