const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const { requireJwt, requireRole } = require("../../middleware/auth");
const { ok: respondOk, error: respondError } = require("../../middleware/respond");
const businessProfileService = require("../../services/businessProfileService");
const statusTransitionService = require("../../services/statusTransitionService");
const pdfService = require("../../lib/pdfService");
const logger = require("../../lib/logger");
const { scanFile } = require("../../../../../shared/fileScan");
const BusinessProfile = require("../../models/BusinessProfile");

// Socket service for realtime updates (lazy-loaded to avoid startup issues)
let socketService = null;
function getSocketService() {
  if (!socketService) {
    try {
      socketService = require("../../../../../shared/lib/socketService");
    } catch (err) {
      logger.warn("Socket service not available:", err.message);
    }
  }
  return socketService;
}

const businessUploadsRoot = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "uploads",
  "business-registration",
);
const renewalUploadsRoot = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "uploads",
  "business-renewal",
);
const ensureDir = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
};

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { businessId } = req.params;
    const businessDir = path.join(businessUploadsRoot, businessId || "unknown");
    ensureDir(businessDir);
    cb(null, businessDir);
  },
  filename: (req, file, cb) => {
    const fieldName = (req.body?.fieldName || "file")
      .toString()
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const safeOriginal = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const stamp = Date.now();
    cb(null, `${fieldName}_${stamp}_${safeOriginal}`);
  },
});

const renewalUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { businessId, renewalId } = req.params;
    const renewalDir = path.join(
      renewalUploadsRoot,
      businessId || "unknown",
      renewalId || "unknown",
    );
    ensureDir(renewalDir);
    cb(null, renewalDir);
  },
  filename: (req, file, cb) => {
    const fieldName = (req.body?.fieldName || "file")
      .toString()
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const safeOriginal = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const stamp = Date.now();
    cb(null, `${fieldName}_${stamp}_${safeOriginal}`);
  },
});

const ALLOWED_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(
      new Error(
        "File type not allowed. Accepted: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX",
      ),
      false,
    );
  }
  cb(null, true);
}

const upload = multer({
  storage: uploadStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});
const renewalUpload = multer({
  storage: renewalUploadStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Owner ID upload (for business registration identity step - no businessId yet)
const ownerIdUploadRoot = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "uploads",
  "owner-ids",
);
const ownerIdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req._userId || "unknown";
    const userDir = path.join(ownerIdUploadRoot, String(userId));
    ensureDir(userDir);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const side =
      (req.body?.side || "front").toString().replace(/[^a-zA-Z0-9_-]/g, "") ||
      "front";
    const stamp = Date.now();
    cb(null, `${side}_${stamp}.jpg`);
  },
});
const ownerIdUpload = multer({
  storage: ownerIdStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/business/profile - Get current user's business profile
router.get(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const profile = await businessProfileService.getProfile(req._userId);
      respondOk(res, 200, profile);
    } catch (err) {
      console.error("GET /api/business/profile error:", err);
      return respondError(
        res,
        500,
        "fetch_error",
        "Failed to fetch business profile",
      );
    }
  },
);

// POST /api/business/profile/owner-id/upload - Upload owner ID image (front or back) during business registration
router.post(
  "/profile/owner-id/upload",
  requireJwt,
  requireRole(["business_owner"]),
  ownerIdUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return respondError(res, 400, "file_required", "No file uploaded");
      }
      const scanResult = await scanFile(req.file.path);
      if (!scanResult.clean) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (_) {}
        return respondError(
          res,
          400,
          "file_rejected",
          "File could not be accepted. Please try a different file.",
        );
      }
      const userId = req._userId;
      const side =
        (req.body?.side || "front").toString().replace(/[^a-zA-Z0-9_-]/g, "") ||
        "front";

      let ipfsService = null;
      try {
        ipfsService = require("../../lib/ipfsService");
        if (!ipfsService.isAvailable()) {
          await ipfsService.initialize();
        }
      } catch (err) {
        logger.warn("IPFS service not available for owner ID upload", {
          error: err.message,
        });
      }

      if (ipfsService && ipfsService.isAvailable()) {
        try {
          const fileBuffer = await fs.promises.readFile(req.file.path);
          const fileName = `id_${side}_${userId}_${Date.now()}.jpg`;
          const { cid, size } = await ipfsService.uploadFile(
            fileBuffer,
            fileName,
          );
          await ipfsService.pinFile(cid).catch((err) => {
            logger.warn("Failed to pin owner ID to IPFS", {
              cid,
              error: err.message,
            });
          });
          const url = ipfsService.getGatewayUrl(cid);
          try {
            await fs.promises.unlink(req.file.path);
          } catch (_) {}
          logger.info("Owner ID uploaded to IPFS", { cid, side, userId });
          return respondOk(res, 200, { url, ipfsCid: cid, size });
        } catch (ipfsErr) {
          logger.error("IPFS upload failed for owner ID", {
            error: ipfsErr.message,
          });
        }
      }

      // Fallback: local storage
      const url = `/uploads/owner-ids/${userId}/${path.basename(req.file.path)}`;
      logger.info("Owner ID saved to local storage", { url, side, userId });
      return respondOk(res, 200, { url, ipfsCid: null, fallback: true });
    } catch (err) {
      console.error("POST /api/business/profile/owner-id/upload error:", err);
      return respondError(
        res,
        500,
        "upload_error",
        err.message || "Failed to upload ID",
      );
    }
  },
);

// POST /api/business/profile - Update business profile (Step 2-8)
router.post(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { step, data } = req.body;

      if (!step || !data)
        return respondError(
          res,
          400,
          "missing_data",
          "Step and data are required",
        );

      // Extract metadata for audit logging
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const metadata = { ip, userAgent };

      const profile = await businessProfileService.updateStep(
        userId,
        parseInt(step),
        data,
        metadata,
      );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error("POST /api/business/profile error:", err);
      return respondError(
        res,
        500,
        "update_error",
        err.message || "Failed to update business profile",
      );
    }
  },
);

// GET /api/business/businesses - DISABLED: Now uses /api/lgu-officer/businesses (Business collection)
// Old route depended on businesses[] array which no longer exists in BusinessProfile
// router.get(
//   "/businesses",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// GET /api/business/businesses/:businessId - DISABLED: Now uses /api/lgu-officer/businesses/:id (Business collection)
// router.get(
//   "/businesses/:businessId",
//   requireJwt,
//   requireRole(["business_owner", "lgu_officer"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// PUT /api/business/businesses/:businessId/payment-generation-status - DISABLED: Old route depended on businesses[] array
// router.put(
//   "/businesses/:businessId/payment-generation-status",
//   requireJwt,
//   requireRole(["business_owner", "lgu_officer"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// GET /api/business/businesses/:businessId/payment-generation-status - DISABLED: Old route depended on businesses[] array
// router.get(
//   "/businesses/:businessId/payment-generation-status",
//   requireJwt,
//   requireRole(["business_owner", "lgu_officer"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// GET /api/business/businesses/primary - DISABLED: Old route depended on businesses[] array
// router.get(
//   "/businesses/primary",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// POST /api/business/businesses - DISABLED: Old route depended on businesses[] array
// router.post(
//   "/businesses",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// PUT /api/business/businesses/:businessId - DISABLED: Old route depended on businesses[] array
// router.put(
//   "/businesses/:businessId",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// PATCH /api/business/businesses/:businessId - DISABLED: Old route depended on businesses[] array (active/inactive/closed) only
// router.patch(
//   "/businesses/:businessId",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// DELETE /api/business/businesses/:businessId - DISABLED: Old route depended on businesses[] array
// router.delete(
//   "/businesses/:businessId",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// POST /api/business/businesses/:businessId/primary - Set primary business - DISABLED
// router.post(
//   "/businesses/:businessId/primary",
//   requireJwt,
//   requireRole(["business_owner"]),
//   async (req, res) => {
//     // ... old implementation removed
//   },
// );

// DELETE /api/business/profile - Delete entire business profile
router.delete(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;

      const result = await businessProfileService.deleteProfile(userId);
      respondOk(res, 200, result);
    } catch (err) {
      console.error("DELETE /api/business/profile error:", err);
      return respondError(
        res,
        400,
        "delete_error",
        err.message || "Failed to delete profile",
      );
    }
  },
);

// GET /api/business/businesses/:businessId/status/transitions - Get valid status transitions
router.get(
  "/businesses/:businessId/status/transitions",
  requireJwt,
  requireRole(["business_owner", "lgu_officer"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;

      const transitions = await statusTransitionService.getValidTransitions(
        userId,
        businessId,
      );
      respondOk(res, 200, transitions);
    } catch (err) {
      console.error(
        "GET /api/business/businesses/:businessId/status/transitions error:",
        err,
      );
      return respondError(
        res,
        400,
        "fetch_error",
        err.message || "Failed to get valid transitions",
      );
    }
  },
);

// POST /api/business/businesses/:businessId/status/validate - Validate status transition
router.post(
  "/businesses/:businessId/status/validate",
  requireJwt,
  requireRole(["business_owner", "lgu_officer"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const { newStatus, reason } = req.body;

      if (!newStatus) {
        return respondError(
          res,
          400,
          "validation_error",
          "New status is required",
        );
      }

      const validation = await statusTransitionService.validateStatusTransition(
        userId,
        businessId,
        newStatus,
        reason,
        userId,
      );

      respondOk(res, 200, validation);
    } catch (err) {
      console.error(
        "POST /api/business/businesses/:businessId/status/validate error:",
        err,
      );
      return respondError(
        res,
        400,
        "validation_error",
        err.message || "Status transition validation failed",
      );
    }
  },
);

// POST /api/business/businesses/:businessId/status/transition - Execute status transition
router.post(
  "/businesses/:businessId/status/transition",
  requireJwt,
  requireRole(["lgu_officer"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const { newStatus, reason, reviewedBy, reviewComments, rejectionReason } =
        req.body;

      if (!newStatus) {
        return respondError(
          res,
          400,
          "transition_error",
          "New status is required",
        );
      }

      const result = await statusTransitionService.executeStatusTransition(
        userId,
        businessId,
        newStatus,
        {
          reason,
          actorId: userId,
          reviewedBy,
          reviewComments,
          rejectionReason,
        },
      );

      respondOk(res, 200, result);
    } catch (err) {
      console.error(
        "POST /api/business/businesses/:businessId/status/transition error:",
        err,
      );

      // Handle specific validation errors
      if (err.name === "InvalidStatusTransitionError") {
        return respondError(
          res,
          400,
          "invalid_transition",
          err.message,
          err.details,
        );
      }

      return respondError(
        res,
        400,
        "transition_error",
        err.message || "Status transition failed",
      );
    }
  },
);

// GET /api/business/status/matrix - Get status transition matrix (for reference)
router.get("/status/matrix", requireJwt, async (req, res) => {
  try {
    const matrix = statusTransitionService.getStatusTransitionMatrix();
    respondOk(res, 200, matrix);
  } catch (err) {
    console.error("GET /api/business/status/matrix error:", err);
    return respondError(
      res,
      500,
      "fetch_error",
      "Failed to get status transition matrix",
    );
  }
});

// POST /api/business/businesses/:businessId/primary - Set business as primary
router.post(
  "/businesses/:businessId/primary",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;

      const profile = await businessProfileService.setPrimaryBusiness(
        userId,
        businessId,
      );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error(
        "POST /api/business/businesses/:businessId/primary error:",
        err,
      );
      return respondError(
        res,
        400,
        "set_primary_error",
        err.message || "Failed to set primary business",
      );
    }
  },
);

// PUT /api/business/businesses/:businessId/risk-profile - Update risk profile
router.put(
  "/businesses/:businessId/risk-profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const riskProfileData = req.body;

      const profile = await businessProfileService.updateBusinessRiskProfile(
        userId,
        businessId,
        riskProfileData,
      );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error(
        "PUT /api/business/businesses/:businessId/risk-profile error:",
        err,
      );
      return respondError(
        res,
        400,
        "update_error",
        err.message || "Failed to update risk profile",
      );
    }
  },
);

// Business Registration Application Routes

// POST /api/business/business-registration/:businessId/requirements/confirm - Mark requirements viewed
router.post(
  "/business-registration/:businessId/requirements/confirm",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;

      // For "new" business registrations, we don't need to confirm against an existing business
      // Just return success - the confirmation will be saved when the business is created in Step 2
      if (!businessId || businessId === "new") {
        return respondOk(res, 200, {
          confirmed: true,
          message:
            "Requirements checklist confirmed. Please proceed to Step 2 to fill out the application form.",
          businessId: "new",
        });
      }

      const profile = await businessProfileService.confirmRequirementsChecklist(
        userId,
        businessId,
      );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error(
        "POST /api/business/business-registration/:businessId/requirements/confirm error:",
        err,
      );
      return respondError(
        res,
        400,
        "confirm_error",
        err.message || "Failed to confirm requirements",
      );
    }
  },
);

// GET /api/business/business-registration/:businessId/requirements/pdf - Generate and download PDF checklist
router.get(
  "/business-registration/:businessId/requirements/pdf",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;

      // For "new" business registrations, we allow PDF download without an existing business
      // The requirements checklist is static and doesn't require a business to exist
      const isNewBusiness = !businessId || businessId === "new";

      // If business exists, mark PDF as downloaded (non-blocking)
      if (!isNewBusiness) {
        try {
          const business = await businessProfileService.getBusiness(
            userId,
            businessId,
          );
          if (business) {
            try {
              await businessProfileService.markRequirementsPdfDownloaded(
                userId,
                businessId,
              );
            } catch (markError) {
              console.error("Failed to mark PDF as downloaded:", markError);
              // Don't fail the request if this fails
            }
          }
        } catch (businessError) {
          console.error("Failed to verify business:", businessError);
          // Continue anyway - PDF download doesn't require business to exist
        }
      }

      // Generate PDF
      try {
        const pdfBuffer = await pdfService.generateRequirementsChecklistPDF();

        if (!pdfBuffer || pdfBuffer.length === 0) {
          console.error("PDF buffer is empty");
          return respondError(
            res,
            500,
            "pdf_generation_failed",
            "Generated PDF is empty",
          );
        }

        // Set headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Business_Registration_Requirements_Checklist_${Date.now()}.pdf"`,
        );
        res.setHeader("Content-Length", pdfBuffer.length);

        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
        // Check if it's a missing module error
        if (
          pdfError.message &&
          pdfError.message.includes("Cannot find module")
        ) {
          return respondError(
            res,
            500,
            "pdf_module_missing",
            "PDF generation module not installed. Please install pdfkit: npm install pdfkit",
          );
        }
        throw pdfError;
      }
    } catch (err) {
      console.error(
        "GET /api/business/business-registration/:businessId/requirements/pdf error:",
        err,
      );
      return respondError(
        res,
        500,
        "pdf_error",
        err.message || "Failed to generate PDF",
      );
    }
  },
);

// POST /api/business/business-registration/:businessId/documents/upload - Upload LGU documents
router.post(
  "/business-registration/:businessId/documents/upload",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const documents = req.body; // Expect document URLs in request body

      // For "new" business registrations, documents cannot be saved yet as the business doesn't exist
      // Return error with helpful message - user must complete Step 2 (Application Form) first
      if (!businessId || businessId === "new") {
        return respondError(
          res,
          400,
          "business_required",
          "Please complete Step 2 (Application Form) to create the business before uploading documents.",
        );
      }

      const profile = await businessProfileService.updateLGUDocuments(
        userId,
        businessId,
        documents,
      );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error(
        "POST /api/business/business-registration/:businessId/documents/upload error:",
        err,
      );
      return respondError(
        res,
        400,
        "upload_error",
        err.message || "Failed to upload documents",
      );
    }
  },
);

// POST /api/business/business-registration/:businessId/documents/upload-file - Upload a single file to IPFS and return CID
router.post(
  "/business-registration/:businessId/documents/upload-file",
  requireJwt,
  requireRole(["business_owner"]),
  upload.single("file"),
  async (req, res) => {
    try {
      const { businessId } = req.params;
      if (!businessId || businessId === "new") {
        return respondError(
          res,
          400,
          "business_required",
          "Please complete Step 2 (Application Form) to create the business before uploading documents.",
        );
      }
      if (!req.file) {
        return respondError(res, 400, "file_required", "No file uploaded");
      }

      // Upload to IPFS (lazy load to avoid module errors)
      let ipfsService = null;
      try {
        ipfsService = require("../../lib/ipfsService");
        // Initialize if not already initialized
        if (!ipfsService.isAvailable()) {
          await ipfsService.initialize();
        }
      } catch (err) {
        logger.warn("IPFS service not available, using local storage", {
          error: err.message,
        });
        ipfsService = null;
      }

      if (!ipfsService || !ipfsService.isAvailable()) {
        // Fallback to local storage if IPFS is not available
        const filename = path.basename(req.file.path);
        const url = `/uploads/business-registration/${businessId}/${filename}`;
        return respondOk(res, 200, { url, ipfsCid: null, fallback: true });
      }

      try {
        // Read file buffer
        const fileBuffer = await fs.promises.readFile(req.file.path);
        const fileName = req.file.originalname || path.basename(req.file.path);

        // Upload to IPFS
        const { cid, size } = await ipfsService.uploadFile(
          fileBuffer,
          fileName,
        );

        // Pin file to ensure persistence
        await ipfsService.pinFile(cid).catch((err) => {
          logger.warn("Failed to pin file to IPFS", {
            cid,
            error: err.message,
          });
        });

        // Get gateway URL
        const gatewayUrl = ipfsService.getGatewayUrl(cid);

        // Delete local file after IPFS upload (optional - can keep for backup)
        try {
          await fs.promises.unlink(req.file.path);
        } catch (unlinkErr) {
          logger.warn("Failed to delete local file after IPFS upload", {
            path: req.file.path,
          });
        }

        // Store CID in DocumentStorage contract (non-blocking)
        try {
          const axios = require("axios");
          const auditServiceUrl =
            process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
          const auditHeaders = { "Content-Type": "application/json" };
          if (process.env.AUDIT_SERVICE_API_KEY)
            auditHeaders["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;
          await axios
            .post(
              `${auditServiceUrl}/api/audit/store-document`,
              {
                userId: req._userId,
                docType: "LGU_DOCUMENT",
                ipfsCid: cid,
              },
              { headers: auditHeaders },
            )
            .catch((err) => {
              logger.warn("Failed to store document CID in blockchain", {
                cid,
                error: err.message,
              });
            });
        } catch (blockchainError) {
          // Non-blocking - continue even if blockchain storage fails
          logger.warn("Blockchain storage failed for document", {
            error: blockchainError.message,
          });
        }

        // Return IPFS CID and gateway URL
        respondOk(res, 200, {
          cid,
          gatewayUrl,
          size,
          url: gatewayUrl, // For backward compatibility
          ipfsCid: cid,
        });
      } catch (ipfsError) {
        // If IPFS upload fails, fallback to local storage
        logger.error("IPFS upload failed, using local storage fallback", {
          error: ipfsError.message,
        });
        const filename = path.basename(req.file.path);
        const url = `/uploads/business-registration/${businessId}/${filename}`;
        respondOk(res, 200, { url, ipfsCid: null, fallback: true });
      }
    } catch (err) {
      console.error(
        "POST /api/business/business-registration/:businessId/documents/upload-file error:",
        err,
      );
      return respondError(
        res,
        400,
        "upload_error",
        err.message || "Failed to upload file",
      );
    }
  },
);

// POST /api/business/business-registration/:businessId/bir - Save BIR registration info
router.post(
  "/business-registration/:businessId/bir",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const birData = req.body;

      const profile = await businessProfileService.updateBIRRegistration(
        userId,
        businessId,
        birData,
      );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error(
        "POST /api/business/business-registration/:businessId/bir error:",
        err,
      );
      return respondError(
        res,
        400,
        "bir_error",
        err.message || "Failed to save BIR registration",
      );
    }
  },
);

// POST /api/business/business-registration/:businessId/agencies - Save other agency registrations
router.post(
  "/business-registration/:businessId/agencies",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const agencyData = req.body;

      // If businessId is 'new', prevent saving until the business is created in Step 2
      if (businessId === "new") {
        return respondError(
          res,
          400,
          "business_not_created",
          "Please complete Step 2 (Application Form) to create the business before saving agency registration details.",
        );
      }

      const profile =
        await businessProfileService.updateOtherAgencyRegistrations(
          userId,
          businessId,
          agencyData,
        );
      respondOk(res, 200, profile);
    } catch (err) {
      console.error(
        "POST /api/business/business-registration/:businessId/agencies error:",
        err,
      );
      return respondError(
        res,
        400,
        "agency_error",
        err.message || "Failed to save agency registrations",
      );
    }
  },
);

// POST /api/business/business-registration/:businessId/submit - Submit application to LGU
router.post(
  "/business-registration/:businessId/submit",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;

      const profile = await businessProfileService.submitBusinessApplication(
        userId,
        businessId,
      );
      const business = profile.businesses?.find(
        (b) => b.businessId === businessId || String(b._id) === businessId,
      );

      // Emit realtime event for new application submission
      const socket = getSocketService();
      if (socket && business) {
        socket.emitApplicationCreated(business, userId);
      }

      respondOk(res, 200, {
        profile,
        referenceNumber: business?.applicationReferenceNumber,
        status: business?.applicationStatus,
        submittedAt: business?.submittedAt,
      });
    } catch (err) {
      console.error(
        "POST /api/business/business-registration/:businessId/submit error:",
        err,
      );
      return respondError(
        res,
        400,
        "submit_error",
        err.message || "Failed to submit application",
      );
    }
  },
);

// GET /api/business/business-registration/:businessId/status - Get application status
router.get(
  "/business-registration/:businessId/status",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;

      const status = await businessProfileService.getBusinessApplicationStatus(
        userId,
        businessId,
      );
      respondOk(res, 200, status);
    } catch (err) {
      console.error(
        "GET /api/business/business-registration/:businessId/status error:",
        err,
      );
      return respondError(
        res,
        400,
        "status_error",
        err.message || "Failed to get application status",
      );
    }
  },
);

// ========== BUSINESS RENEWAL ROUTES ==========

// GET /api/business/business-renewal/:businessId/period - Get renewal period
router.get(
  "/business-renewal/:businessId/period",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const period = await businessProfileService.getRenewalPeriod();
      respondOk(res, 200, period);
    } catch (err) {
      console.error(
        "GET /api/business/business-renewal/:businessId/period error:",
        err,
      );
      return respondError(
        res,
        500,
        "period_error",
        err.message || "Failed to get renewal period",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/start - Start renewal
router.post(
  "/business-renewal/:businessId/start",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId } = req.params;
      const { renewalYear } = req.body;

      if (!renewalYear) {
        return respondError(
          res,
          400,
          "renewal_year_required",
          "Renewal year is required",
        );
      }

      const result = await businessProfileService.startRenewal(
        userId,
        businessId,
        renewalYear,
      );
      respondOk(res, 200, {
        renewal: result.renewal,
        businessId,
        renewalId: result.renewal.renewalId,
      });
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/start error:",
        err,
      );
      return respondError(
        res,
        400,
        "start_error",
        err.message || "Failed to start renewal",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/:renewalId/acknowledge-period - Step 2
router.post(
  "/business-renewal/:businessId/:renewalId/acknowledge-period",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;

      const profile = await businessProfileService.acknowledgeRenewalPeriod(
        userId,
        businessId,
        renewalId,
      );
      respondOk(res, 200, { success: true, profile });
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/:renewalId/acknowledge-period error:",
        err,
      );
      return respondError(
        res,
        400,
        "acknowledge_error",
        err.message || "Failed to acknowledge renewal period",
      );
    }
  },
);

// GET /api/business/business-renewal/:businessId/:renewalId/requirements/pdf - Step 4 PDF
router.get(
  "/business-renewal/:businessId/:renewalId/requirements/pdf",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const { businessId, renewalId } = req.params;

      // Generate PDF for renewal requirements checklist
      const pdfBuffer =
        await pdfService.generateRenewalRequirementsChecklistPDF();

      if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error("PDF buffer is empty");
        return respondError(
          res,
          500,
          "pdf_generation_failed",
          "Generated PDF is empty",
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Business_Renewal_Requirements_Checklist_${Date.now()}.pdf"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (err) {
      console.error(
        "GET /api/business/business-renewal/:businessId/:renewalId/requirements/pdf error:",
        err,
      );
      return respondError(
        res,
        500,
        "pdf_error",
        err.message || "Failed to generate PDF",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/:renewalId/gross-receipts - Step 5
router.post(
  "/business-renewal/:businessId/:renewalId/gross-receipts",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;
      const grossReceiptsData = req.body;

      const profile = await businessProfileService.updateGrossReceipts(
        userId,
        businessId,
        renewalId,
        grossReceiptsData,
      );
      respondOk(res, 200, { success: true, profile });
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/:renewalId/gross-receipts error:",
        err,
      );
      return respondError(
        res,
        400,
        "gross_receipts_error",
        err.message || "Failed to update gross receipts",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/:renewalId/documents/upload - Step 6
router.post(
  "/business-renewal/:businessId/:renewalId/documents/upload",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;
      const documents = req.body;

      const profile = await businessProfileService.uploadRenewalDocuments(
        userId,
        businessId,
        renewalId,
        documents,
      );
      respondOk(res, 200, { success: true, profile });
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/:renewalId/documents/upload error:",
        err,
      );
      return respondError(
        res,
        400,
        "upload_error",
        err.message || "Failed to upload documents",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/:renewalId/documents/upload-file - Step 6 file upload
router.post(
  "/business-renewal/:businessId/:renewalId/documents/upload-file",
  requireJwt,
  requireRole(["business_owner"]),
  renewalUpload.single("file"),
  async (req, res) => {
    try {
      const { businessId, renewalId } = req.params;
      if (!businessId || businessId === "new") {
        return respondError(
          res,
          400,
          "business_required",
          "Business must be created before uploading documents.",
        );
      }
      if (!req.file) {
        return respondError(res, 400, "file_required", "No file uploaded");
      }

      // Upload to IPFS (lazy load to avoid module errors)
      let ipfsService = null;
      try {
        ipfsService = require("../../lib/ipfsService");
        if (!ipfsService.isAvailable()) {
          await ipfsService.initialize();
        }
      } catch (err) {
        logger.warn("IPFS service not available, using local storage", {
          error: err.message,
        });
        ipfsService = null;
      }

      if (!ipfsService || !ipfsService.isAvailable()) {
        // Fallback to local storage
        const filename = path.basename(req.file.path);
        const url = `/uploads/business-renewal/${businessId}/${renewalId}/${filename}`;
        return respondOk(res, 200, { url, ipfsCid: null, fallback: true });
      }

      try {
        // Read file buffer
        const fileBuffer = await fs.promises.readFile(req.file.path);
        const fileName = req.file.originalname || path.basename(req.file.path);

        // Upload to IPFS
        const { cid, size } = await ipfsService.uploadFile(
          fileBuffer,
          fileName,
        );

        // Pin file
        await ipfsService.pinFile(cid).catch((err) => {
          logger.warn("Failed to pin file to IPFS", {
            cid,
            error: err.message,
          });
        });

        // Get gateway URL
        const gatewayUrl = ipfsService.getGatewayUrl(cid);

        // Delete local file after IPFS upload
        try {
          await fs.promises.unlink(req.file.path);
        } catch (unlinkErr) {
          logger.warn("Failed to delete local file after IPFS upload", {
            path: req.file.path,
          });
        }

        // Store CID in DocumentStorage contract (non-blocking)
        try {
          const axios = require("axios");
          const auditServiceUrl =
            process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
          const auditHeaders = { "Content-Type": "application/json" };
          if (process.env.AUDIT_SERVICE_API_KEY)
            auditHeaders["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;
          await axios
            .post(
              `${auditServiceUrl}/api/audit/store-document`,
              {
                userId: req._userId,
                docType: "RENEWAL_DOCUMENT",
                ipfsCid: cid,
              },
              { headers: auditHeaders },
            )
            .catch((err) => {
              logger.warn("Failed to store document CID in blockchain", {
                cid,
                error: err.message,
              });
            });
        } catch (blockchainError) {
          logger.warn("Blockchain storage failed for document", {
            error: blockchainError.message,
          });
        }

        respondOk(res, 200, {
          cid,
          gatewayUrl,
          size,
          url: gatewayUrl,
          ipfsCid: cid,
        });
      } catch (ipfsError) {
        // If IPFS upload fails, fallback to local storage
        logger.error("IPFS upload failed, using local storage fallback", {
          error: ipfsError.message,
        });
        const filename = path.basename(req.file.path);
        const url = `/uploads/business-renewal/${businessId}/${renewalId}/${filename}`;
        respondOk(res, 200, { url, ipfsCid: null, fallback: true });
      }
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/:renewalId/documents/upload-file error:",
        err,
      );
      return respondError(
        res,
        400,
        "upload_error",
        err.message || "Failed to upload file",
      );
    }
  },
);

// GET /api/business/business-renewal/:businessId/:renewalId/assessment - Step 7 calculate
router.get(
  "/business-renewal/:businessId/:renewalId/assessment",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;

      const result = await businessProfileService.calculateRenewalAssessment(
        userId,
        businessId,
        renewalId,
      );
      respondOk(res, 200, result.assessment);
    } catch (err) {
      console.error(
        "GET /api/business/business-renewal/:businessId/:renewalId/assessment error:",
        err,
      );
      return respondError(
        res,
        400,
        "assessment_error",
        err.message || "Failed to calculate assessment",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/:renewalId/payment - Step 8
router.post(
  "/business-renewal/:businessId/:renewalId/payment",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;
      const paymentData = req.body;

      const profile = await businessProfileService.processRenewalPayment(
        userId,
        businessId,
        renewalId,
        paymentData,
      );
      respondOk(res, 200, { success: true, profile });
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/:renewalId/payment error:",
        err,
      );
      return respondError(
        res,
        400,
        "payment_error",
        err.message || "Failed to process payment",
      );
    }
  },
);

// POST /api/business/business-renewal/:businessId/:renewalId/submit - Final step
router.post(
  "/business-renewal/:businessId/:renewalId/submit",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;

      const result = await businessProfileService.submitRenewal(
        userId,
        businessId,
        renewalId,
      );
      respondOk(res, 200, {
        success: true,
        profile: result.profile,
        referenceNumber: result.referenceNumber,
        status: "submitted",
      });
    } catch (err) {
      console.error(
        "POST /api/business/business-renewal/:businessId/:renewalId/submit error:",
        err,
      );
      return respondError(
        res,
        400,
        "submit_error",
        err.message || "Failed to submit renewal",
      );
    }
  },
);

// GET /api/business/business-renewal/:businessId/:renewalId/status - Get status
router.get(
  "/business-renewal/:businessId/:renewalId/status",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { businessId, renewalId } = req.params;

      const status = await businessProfileService.getRenewalStatus(
        userId,
        businessId,
        renewalId,
      );
      respondOk(res, 200, status);
    } catch (err) {
      console.error(
        "GET /api/business/business-renewal/:businessId/:renewalId/status error:",
        err,
      );
      return respondError(
        res,
        400,
        "status_error",
        err.message || "Failed to get renewal status",
      );
    }
  },
);

router.post(
  "/staff/walk-in",
  requireJwt,
  requireRole(["staff", "lgu_officer"]),
  async (req, res) => {
    try {
      const { ownerId, businessData } = req.body;
      if (!ownerId)
        return respondError(res, 400, "missing_owner", "ownerId is required");

      const result = await businessProfileService.addBusiness(
        ownerId,
        businessData,
      );
      const profileObj =
        result.profile && typeof result.profile.toObject === "function"
          ? result.profile.toObject()
          : result.profile;
      respondOk(res, 200, { ...profileObj, businessId: result.businessId, walkIn: true });
    } catch (err) {
      console.error("POST /api/business/staff/walk-in error:", err);
      return respondError(
        res,
        400,
        "walk_in_error",
        err.message || "Failed to create walk-in application",
      );
    }
  },
);

// ─── OFFICER: Get Audit History for Application ─────────────────────────────────
// GET /api/applications/:applicationId/audit
router.get(
  "/applications/:applicationId/audit",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Find business profile containing the application (by businessId OR subdoc _id)
      const mongoose = require("mongoose");
      let profile = await BusinessProfile.findOne({
        "businesses.businessId": applicationId,
      }).lean();

      if (!profile && mongoose.Types.ObjectId.isValid(applicationId)) {
        profile = await BusinessProfile.findOne({
          "businesses._id": new mongoose.Types.ObjectId(applicationId),
        }).lean();
      }

      if (!profile) {
        return respondError(res, 404, "not_found", "Application not found");
      }

      // Query audit-service for application audit logs
      const axios = require("axios");
      const auditServiceUrl =
        process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
      const headers = { "Content-Type": "application/json" };
      if (process.env.AUDIT_SERVICE_API_KEY)
        headers["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;

      const response = await axios.get(
        `${auditServiceUrl}/api/audit/application/${applicationId}`,
        {
          headers,
          params: {
            page: parseInt(page),
            limit: parseInt(limit),
          },
        },
      );

      const logs = response.data.logs || [];
      const total = response.data.total || 0;
      const totalPages = Math.ceil(total / parseInt(limit));

      return respondOk(res, 200, {
        success: true,
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (err) {
      console.error("GET /api/applications/:applicationId/audit error:", err);
      return respondError(
        res,
        500,
        "fetch_failed",
        "Failed to fetch audit history",
      );
    }
  },
);

module.exports = router;
