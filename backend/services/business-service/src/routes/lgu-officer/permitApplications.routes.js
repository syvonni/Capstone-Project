const express = require("express");
const router = express.Router();
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const permitApplicationController = require("../../controllers/lgu-officer/permitApplication.controller");

/**
 * GET /api/lgu-officer/permit-applications
 * Get permit applications with filters
 */
router.get(
  "/permit-applications",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.list(req, res)
);

/**
 * GET /api/lgu-officer/permit-applications/:id
 * Get single application by ID
 */
router.get(
  "/permit-applications/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.getById(req, res)
);

/**
 * POST /api/lgu-officer/permit-applications/:id/start-review
 * Claim an application for review
 */
router.post(
  "/permit-applications/:id/start-review",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.startReview(req, res)
);

/**
 * POST /api/lgu-officer/permit-applications/:id/review
 * Review and approve/reject an application
 */
router.post(
  "/permit-applications/:id/review",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  (req, res) => permitApplicationController.review(req, res)
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/claim
 * Claim a permit application for review
 */
router.put(
  "/permit-applications/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.claim(req, res)
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/release
 * Release a permit application back to the pool
 */
router.put(
  "/permit-applications/:id/release",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.release(req, res)
);

/**
 * POST /api/lgu-officer/permit-applications/:id/reset-status
 * Reset application status
 */
router.post(
  "/permit-applications/:id/reset-status",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  (req, res) => permitApplicationController.resetStatus(req, res)
);

/**
 * PATCH /api/lgu-officer/permit-applications/:id/field-decisions
 * Update field-level review decisions
 */
router.patch(
  "/permit-applications/:id/field-decisions",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.updateFieldDecisions(req, res)
);

/**
 * POST /api/lgu-officer/permit-applications/:id/pending-action
 * Create a pending action with undo window
 */
router.post(
  "/permit-applications/:id/pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.createPendingAction(req, res)
);

/**
 * DELETE /api/lgu-officer/permit-applications/:id/pending-action
 * Cancel a pending action (undo)
 */
router.delete(
  "/permit-applications/:id/pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.cancelPendingAction(req, res)
);

/**
 * GET /api/lgu-officer/permit-applications/:id/pending-action
 * Get pending action
 */
router.get(
  "/permit-applications/:id/pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.getPendingAction(req, res)
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/execute-pending-action
 * Execute a pending action
 */
router.put(
  "/permit-applications/:id/execute-pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.executePendingAction(req, res)
);

/**
 * PATCH /api/lgu-officer/permit-applications/:id/form-data
 * Update form data
 */
router.patch(
  "/permit-applications/:id/form-data",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.updateFormData(req, res)
);

/**
 * POST /api/lgu-officer/permit-applications/:id/resend-email
 * Resend application email
 */
router.post(
  "/permit-applications/:id/resend-email",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  (req, res) => permitApplicationController.resendEmail(req, res)
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/reset-email-status
 * Reset email send status
 */
router.put(
  "/permit-applications/:id/reset-email-status",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  (req, res) => permitApplicationController.resetEmailStatus(req, res)
);

/**
 * DELETE /api/lgu-officer/permit-applications/:id
 * Delete an application (for officer drafts)
 */
router.delete(
  "/permit-applications/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  (req, res) => permitApplicationController.delete(req, res)
);

/**
 * GET /api/lgu-officer/permit-applications/data-quality
 * Get data quality report for all applications
 */
router.get(
  "/permit-applications/data-quality",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.getDataQuality(req, res)
);

/**
 * GET /api/lgu-officer/permit-applications/:id/data-quality
 * Get data quality for single application
 */
router.get(
  "/permit-applications/:id/data-quality",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.getDataQualityById(req, res)
);

/**
 * GET /api/lgu-officer/permit-applications/performance
 * Get performance metrics for applications
 */
router.get(
  "/permit-applications/performance",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.getPerformance(req, res)
);

/**
 * GET /api/lgu-officer/permit-applications/:id/performance
 * Get performance metrics for single application
 */
router.get(
  "/permit-applications/:id/performance",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => permitApplicationController.getPerformanceById(req, res)
);

module.exports = router;
