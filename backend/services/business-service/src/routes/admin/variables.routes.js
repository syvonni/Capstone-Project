const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const variableController = require("../../controllers/admin/variable.controller");

const router = express.Router();

// GET /api/business/admin/variables - list with filters
router.get("/", requireJwt, (req, res) => variableController.list(req, res));

// GET /api/business/admin/variables/data-quality - get data quality issues for all variables
router.get(
  "/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getDataQuality(req, res),
);

// GET /api/business/admin/variables/performance - get performance metrics
router.get(
  "/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getPerformance(req, res),
);

// GET /api/business/admin/variables/:id - get single
router.get(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getById(req, res),
);

// GET /api/business/admin/variables/by-fee/:feeId - get variables by fee ID
router.get(
  "/by-fee/:feeId",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getByFeeId(req, res),
);

// GET /api/business/admin/variables/by-variable-fee-rule/:variableFeeRuleId - get variables by variable fee rule ID
router.get(
  "/by-variable-fee-rule/:variableFeeRuleId",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getByVariableFeeRuleId(req, res),
);

// POST /api/business/admin/variables - create
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => variableController.create(req, res),
);

// PUT /api/business/admin/variables/:id - update definition fields only
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => variableController.update(req, res),
);

// DELETE /api/business/admin/variables/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => variableController.disable(req, res),
);

// GET /api/business/admin/variables/:id/audit - proxy to audit service
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getAuditHistory(req, res),
);

// GET /api/business/admin/variables/:id/data-quality - get data quality for single variable
router.get(
  "/:id/data-quality",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getDataQualityById(req, res),
);

// GET /api/business/admin/variables/:id/performance - get performance for single variable
router.get(
  "/:id/performance",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableController.getPerformanceById(req, res),
);

module.exports = router;
