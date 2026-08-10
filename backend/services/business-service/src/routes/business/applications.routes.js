const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const applicationController = require("../../controllers/business/application.controller");
const router = express.Router();

/**
 * POST /api/business/applications
 * Submit a new application
 */
router.post(
  "/applications",
  requireJwt,
  requireRole(["business_owner", "lgu_officer", "staff"]),
  (req, res) => applicationController.create(req, res),
);

/**
 * GET /api/business/applications
 * List applications with optional filters
 */
router.get(
  "/applications",
  requireJwt,
  requireRole(["business_owner", "lgu_officer", "staff"]),
  (req, res) => applicationController.list(req, res),
);

/**
 * GET /api/business/applications/:id
 * Get application details
 */
router.get(
  "/applications/:id",
  requireJwt,
  requireRole(["business_owner", "lgu_officer", "staff"]),
  (req, res) => applicationController.getById(req, res),
);

/**
 * PUT /api/business/applications/:id
 * Update application
 */
router.put(
  "/applications/:id",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => applicationController.update(req, res),
);

/**
 * POST /api/business/applications/:id/claim
 * Claim an application for review
 */
router.post(
  "/applications/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => applicationController.claim(req, res),
);

/**
 * PUT /api/business/applications/:id/approve
 * Approve an application
 */
router.put(
  "/applications/:id/approve",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => applicationController.approve(req, res),
);

/**
 * PUT /api/business/applications/:id/reject
 * Reject an application
 */
router.put(
  "/applications/:id/reject",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => applicationController.reject(req, res),
);

/**
 * PUT /api/business/applications/:id/return
 * Return application for revision
 */
router.put(
  "/applications/:id/return",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => applicationController.returnForRevision(req, res),
);

/**
 * POST /api/business/applications/:id/resend-email
 * Resend application email (with step-up authentication)
 */
router.post(
  "/applications/:id/resend-email",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  requireAdminStepUp,
  (req, res) => applicationController.resendEmail(req, res),
);

/**
 * DELETE /api/business/applications/:id
 * Delete application
 */
router.delete(
  "/applications/:id",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => applicationController.delete(req, res),
);

/**
 * POST /api/business/debug/clear-applications
 * Debug endpoint to clear all applications for current user and reset welcome state
 */
router.post(
  "/debug/clear-applications",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => applicationController.clearAllApplications(req, res),
);

module.exports = router;
