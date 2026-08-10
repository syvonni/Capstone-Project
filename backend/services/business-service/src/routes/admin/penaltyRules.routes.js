const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const penaltyRuleController = require("../../controllers/admin/penaltyRule.controller");

const router = express.Router();

// GET /api/business/admin/penalty-rules — list all penalty rules
router.get("/", requireJwt, (req, res) => penaltyRuleController.list(req, res));

// GET /api/business/admin/penalty-rules/:id — get single penalty rule
router.get("/:id", requireJwt, (req, res) => penaltyRuleController.getById(req, res));

// GET /api/business/admin/penalty-rules/:id/audit — get audit history
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => penaltyRuleController.getAuditHistory(req, res),
);

// POST /api/business/admin/penalty-rules — create penalty rule
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => penaltyRuleController.create(req, res),
);

// PUT /api/business/admin/penalty-rules/:id — update penalty rule
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => penaltyRuleController.update(req, res),
);

// DELETE /api/business/admin/penalty-rules/:id — soft-disable penalty rule
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => penaltyRuleController.disable(req, res),
);

module.exports = router;
