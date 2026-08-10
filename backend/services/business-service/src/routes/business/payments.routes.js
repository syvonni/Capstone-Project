const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const paymentController = require("../../controllers/business/payment.controller");

const router = express.Router();

/**
 * GET /api/business/payments
 * List all payments for the authenticated user
 */
router.get("/", requireJwt, (req, res) => paymentController.list(req, res));

/**
 * GET /api/business/payments/pending
 * List pending payments for the authenticated user
 */
router.get("/pending", requireJwt, (req, res) => paymentController.getPending(req, res));

/**
 * GET /api/business/payments/history
 * Payment history with filters
 */
router.get("/history", requireJwt, (req, res) => paymentController.getHistory(req, res));

/**
 * GET /api/business/payments/:paymentId
 * Get payment details
 */
router.get("/:paymentId", requireJwt, (req, res) => paymentController.getById(req, res));

/**
 * POST /api/business/payments
 * Create a payment record (for fees, penalties, etc.)
 */
router.post("/", requireJwt, (req, res) => paymentController.create(req, res));

/**
 * POST /api/business/payments/:paymentId/pay
 * Process payment
 */
router.post("/:paymentId/pay", requireJwt, (req, res) => paymentController.pay(req, res));

/**
 * PUT /api/business/payments/:paymentId/cancel
 * Cancel a pending payment
 */
router.put("/:paymentId/cancel", requireJwt, (req, res) => paymentController.cancel(req, res));

/**
 * POST /api/business/payments/:paymentId/receipt
 * Generate receipt for a paid payment (business owner)
 */
router.post("/:paymentId/receipt", requireJwt, (req, res) => paymentController.getReceipt(req, res));

/**
 * POST /api/business/payments/mock
 * Create a mock payment record for testing (frontend simulation)
 */
router.post("/mock", requireJwt, (req, res) => paymentController.createMock(req, res));

module.exports = router;
