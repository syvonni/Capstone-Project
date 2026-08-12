const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const profileController = require("../../controllers/business-owner/profile.controller");
const fileUploadService = require("../../services/business-owner/fileUpload.service");
const router = express.Router();

// GET /api/business/profile - Get current user's business profile
router.get(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.getProfile(req, res),
);

// GET /api/business/businesses - Get all businesses for current user
router.get(
  "/businesses",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.getBusinesses(req, res),
);

// GET /api/business/businesses/primary - Get primary business
router.get(
  "/businesses/primary",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.getPrimaryBusiness(req, res),
);

// POST /api/business/profile/owner-id/upload - Upload owner ID image (front or back) during business registration
router.post(
  "/profile/owner-id/upload",
  requireJwt,
  requireRole(["business_owner"]),
  fileUploadService.getOwnerIdUploadMiddleware().single("file"),
  (req, res) => profileController.uploadOwnerId(req, res),
);

// POST /api/business/profile - Update business profile (Step 2-8)
router.post(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateStep(req, res),
);

// DELETE /api/business/profile - Delete entire business profile
router.delete(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.deleteProfile(req, res),
);

module.exports = router;
