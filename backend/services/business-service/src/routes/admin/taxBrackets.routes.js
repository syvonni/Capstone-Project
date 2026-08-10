const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const taxBracketController = require("../../controllers/admin/taxBracket.controller");

const router = express.Router();

// GET /api/business/admin/tax-brackets — list all tax brackets
router.get("/", requireJwt, (req, res) => taxBracketController.list(req, res));

// GET /api/business/admin/tax-brackets/:id — get single tax bracket
router.get(
  "/:id",
  requireJwt,
  (req, res) => taxBracketController.getById(req, res),
);

// GET /api/business/admin/tax-brackets/:id/audit — get audit history for a tax bracket
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => taxBracketController.getAuditHistory(req, res),
);

// POST /api/business/admin/tax-brackets — create tax bracket
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => taxBracketController.create(req, res),
);

// PUT /api/business/admin/tax-brackets/:id — update tax bracket
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => taxBracketController.update(req, res),
);

// DELETE /api/business/admin/tax-brackets/:id — soft-disable tax bracket
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => taxBracketController.disable(req, res),
);

module.exports = router;
