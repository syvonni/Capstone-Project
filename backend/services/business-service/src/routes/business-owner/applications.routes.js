const express = require("express");
const {
  requireJwt,
  requireRole,
} = require("../../middleware/auth");
const { autosaveRateLimit } = require("../../middleware/rateLimit");
const applicationController = require("../../controllers/business-owner/application.controller");
const fileUploadService = require("../../services/business-owner/fileUpload.service");
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
 * POST /api/business/applications/:id/submit - Submit application (draft → submitted)
 */
router.post(
  "/applications/:id/submit",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => applicationController.submit(req, res),
);

/**
 * POST /api/business/applications/:id/documents/upload-file - Upload a single file to IPFS and return CID
 */
router.post(
  "/applications/:id/documents/upload-file",
  requireJwt,
  requireRole(["business_owner"]),
  fileUploadService.getUploadMiddleware().single("file"),
  (req, res) => applicationController.uploadDocumentFile(req, res),
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
 * PATCH /api/business/applications/:id/form-data
 * Partial form data update for autosave
 */
router.patch(
  "/applications/:id/form-data",
  requireJwt,
  requireRole(["business_owner"]),
  autosaveRateLimit(),
  (req, res) => applicationController.patchFormData(req, res),
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
