const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const variableFeeRuleController = require("../../controllers/admin/variableFeeRule.controller");

const router = express.Router();

// GET /api/business/admin/variable-fee-rules — list all variable fee rules
router.get("/", requireJwt, (req, res) => variableFeeRuleController.list(req, res));

// GET /api/business/admin/variable-fee-rules/:id/lobs — get LOBs that use this variable fee rule
router.get(
  "/:id/lobs",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableFeeRuleController.getLobs(req, res),
);

// GET /api/business/admin/variable-fee-rules/:id — get single variable fee rule
router.get("/:id", requireJwt, (req, res) => variableFeeRuleController.getById(req, res));

// GET /api/business/admin/variable-fee-rules/:id/audit — get audit history for a variable fee rule
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => variableFeeRuleController.getAuditHistory(req, res),
);

// POST /api/business/admin/variable-fee-rules — create variable fee rule
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => variableFeeRuleController.create(req, res),
);

// PUT /api/business/admin/variable-fee-rules/:id — update variable fee rule (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), (req, res) => variableFeeRuleController.update(req, res));

// DELETE /api/business/admin/variable-fee-rules/:id — soft-disable variable fee rule
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => variableFeeRuleController.disable(req, res),
);

module.exports = router;
