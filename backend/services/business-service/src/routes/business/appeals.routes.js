const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const appealController = require("../../controllers/business/appeal.controller");
const router = express.Router();

// GET /api/business/appeals
router.get("/", requireJwt, (req, res) => appealController.list(req, res));

// GET /api/business/appeals/:id
router.get("/:id", requireJwt, (req, res) => appealController.getById(req, res));

// POST /api/business/appeals
router.post("/", requireJwt, (req, res) => appealController.create(req, res));

// PUT /api/business/appeals/:id — resolve (LGU Manager/Officer)
router.put("/:id", requireJwt, (req, res) => appealController.resolve(req, res));

// POST /api/business/appeals/:id/claim
router.post("/:id/claim", requireJwt, (req, res) => appealController.claim(req, res));

// PUT /api/business/appeals/:id/release
router.put("/:id/release", requireJwt, (req, res) => appealController.release(req, res));

// PUT /api/business/appeals/:id/transfer
router.put(
  "/:id/transfer",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  (req, res) => appealController.transfer(req, res),
);

/**
 * POST /api/business/appeals/:id/resend-email
 * Resend appeal email (with step-up authentication)
 */
router.post(
  "/:id/resend-email",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  requireAdminStepUp,
  (req, res) => appealController.resendEmail(req, res),
);

module.exports = router;
