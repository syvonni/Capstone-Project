const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const paymentController = require("../../controllers/lgu-officer/payment.controller");

const router = express.Router();

/**
 * GET /api/lgu-officer/payments
 * List payments for reviewed applications/businesses.
 */
router.get(
  "/payments",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => paymentController.list(req, res)
);

/**
 * GET /api/lgu-officer/payments/:paymentId
 * Get payment details by paymentId.
 */
router.get(
  "/payments/:paymentId",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => paymentController.getById(req, res)
);

/**
 * POST /api/lgu-officer/payments/:paymentId/receipt
 * Generate receipt for a paid payment.
 */
router.post(
  "/payments/:paymentId/receipt",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => paymentController.getReceipt(req, res)
);

module.exports = router;
