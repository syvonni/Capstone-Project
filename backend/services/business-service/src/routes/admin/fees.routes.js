const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
  requireInternalAuth,
} = require("../../middleware/auth");
const feeController = require("../../controllers/admin/fee.controller");

const router = express.Router();

// POST /api/business/admin/fees/internal - Internal endpoint for service-to-service fee creation
// This bypasses user auth and step-up requirements, using a shared secret instead
router.post(
  "/internal",
  requireInternalAuth,
  (req, res) => feeController.createInternal(req, res),
);

// GET /api/business/admin/fees — list all fees (excluding drafts)
router.get("/", requireJwt, (req, res) => feeController.list(req, res));

// GET /api/business/admin/fees/:id — get single fee (or draft)
router.get("/:id", requireJwt, (req, res) => feeController.getById(req, res));

// GET /api/business/admin/fees/:id/audit — get audit history for a fee
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => feeController.getAuditHistory(req, res),
);

// POST /api/business/admin/fees — create fee
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => feeController.create(req, res),
);

// PUT /api/business/admin/fees/:id — update fee (creates new version)
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => feeController.update(req, res),
);

// DELETE /api/business/admin/fees/:id — soft-disable fee
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => feeController.disable(req, res),
);

// PUT /api/business/admin/fees/variables/:id - update variable calculation fields only
router.put(
  "/variables/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => feeController.updateVariableCalculation(req, res),
);

// GET /api/business/admin/fees/by-category/:category - Get fees by category
router.get(
  "/by-category/:category",
  requireJwt,
  (req, res) => feeController.getByCategory(req, res),
);

module.exports = router;
