const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const profileController = require("../../controllers/business/profile.controller");
const fileUploadService = require("../../services/business/fileUpload.service");
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

// POST /api/business/businesses - Add a new business
router.post(
  "/businesses",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.addBusiness(req, res),
);

// PUT /api/business/businesses/:businessId - Update a business
router.put(
  "/businesses/:businessId",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateBusiness(req, res),
);

// PATCH /api/business/businesses/:businessId - Update business status only
router.patch(
  "/businesses/:businessId",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateBusinessStatus(req, res),
);

// DELETE /api/business/businesses/:businessId - Delete a business
router.delete(
  "/businesses/:businessId",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.deleteBusiness(req, res),
);

// PUT /api/business/businesses/:businessId/payment-generation-status - Update payment generation status
router.put(
  "/businesses/:businessId/payment-generation-status",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updatePaymentGenerationStatus(req, res),
);

// GET /api/business/businesses/:businessId/payment-generation-status - Get payment generation status
router.get(
  "/businesses/:businessId/payment-generation-status",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.getPaymentGenerationStatus(req, res),
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

// GET /api/business/businesses/:businessId/status/transitions - Get valid status transitions
router.get(
  "/businesses/:businessId/status/transitions",
  requireJwt,
  requireRole(["business_owner", "lgu_officer"]),
  (req, res) => profileController.getValidTransitions(req, res),
);

// POST /api/business/businesses/:businessId/status/validate - Validate status transition
router.post(
  "/businesses/:businessId/status/validate",
  requireJwt,
  requireRole(["business_owner", "lgu_officer"]),
  (req, res) => profileController.validateStatusTransition(req, res),
);

// POST /api/business/businesses/:businessId/status/transition - Execute status transition
router.post(
  "/businesses/:businessId/status/transition",
  requireJwt,
  requireRole(["lgu_officer"]),
  (req, res) => profileController.executeStatusTransition(req, res),
);

// GET /api/business/status/matrix - Get status transition matrix (for reference)
router.get("/status/matrix", requireJwt, (req, res) => profileController.getStatusTransitionMatrix(req, res));

// POST /api/business/businesses/:businessId/primary - Set business as primary
router.post(
  "/businesses/:businessId/primary",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.setPrimaryBusiness(req, res),
);

// PUT /api/business/businesses/:businessId/risk-profile - Update risk profile
router.put(
  "/businesses/:businessId/risk-profile",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateBusinessRiskProfile(req, res),
);

// Business Registration Application Routes

// POST /api/business/business-registration/:businessId/requirements/confirm - Mark requirements viewed
router.post(
  "/business-registration/:businessId/requirements/confirm",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.confirmRequirementsChecklist(req, res),
);

// GET /api/business/business-registration/:businessId/requirements/pdf - Generate and download PDF checklist
router.get(
  "/business-registration/:businessId/requirements/pdf",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.generateRequirementsChecklistPDF(req, res),
);

// POST /api/business/business-registration/:businessId/documents/upload - Upload LGU documents
router.post(
  "/business-registration/:businessId/documents/upload",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateLGUDocuments(req, res),
);

// POST /api/business/business-registration/:businessId/documents/upload-file - Upload a single file to IPFS and return CID
router.post(
  "/business-registration/:businessId/documents/upload-file",
  requireJwt,
  requireRole(["business_owner"]),
  fileUploadService.getUploadMiddleware().single("file"),
  (req, res) => profileController.uploadBusinessDocumentFile(req, res),
);

// POST /api/business/business-registration/:businessId/bir - Save BIR registration info
router.post(
  "/business-registration/:businessId/bir",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateBIRRegistration(req, res),
);

// POST /api/business/business-registration/:businessId/agencies - Save other agency registrations
router.post(
  "/business-registration/:businessId/agencies",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.updateOtherAgencyRegistrations(req, res),
);

// POST /api/business/business-registration/:businessId/submit - Submit application to LGU
router.post(
  "/business-registration/:businessId/submit",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.submitBusinessApplication(req, res),
);

// GET /api/business/business-registration/:businessId/status - Get application status
router.get(
  "/business-registration/:businessId/status",
  requireJwt,
  requireRole(["business_owner"]),
  (req, res) => profileController.getApplicationStatus(req, res),
);

module.exports = router;
