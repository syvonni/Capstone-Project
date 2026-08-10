const express = require("express");
const router = express.Router();
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const walkInApplicationController = require("../../controllers/lgu-officer/walkInApplication.controller");

/**
 * POST /api/lgu-officer/walk-in-applications
 * Create a walk-in application for a business owner (officer draft)
 */
router.post(
  "/walk-in-applications",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => walkInApplicationController.create(req, res)
);

/**
 * POST /api/lgu-officer/permit-applications/:id/finish
 * Finish an officer draft application (transition to approved)
 */
router.post(
  "/permit-applications/:id/finish",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  (req, res) => walkInApplicationController.finish(req, res)
);

module.exports = router;
