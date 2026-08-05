const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const { requireJwt, requireRole } = require("../middleware/auth");
const Business = require("../models/Business");
const BusinessProfile = require("../models/BusinessProfile");
const Application = require("../models/Application");
const User = require("../models/User");
const businessProfileService = require("../services/businessProfileService");
const respond = require("../middleware/respond");
const { scanFile } = require("../../../../shared/fileScan");
const logger = require("../lib/logger");
const { logAuditEvent } = require("../lib/auditClient");

// Helper to send application email (fire and forget, doesn't block status change)
async function sendApplicationEmail(application, emailType, metadata = {}) {
  try {
    const user = await User.findById(application.userId).select(
      "firstName lastName email",
    );
    if (!user || !user.email) {
      console.warn(
        `User or email not found for application ${application.applicationId}`,
      );
      return;
    }

    const emailData = {
      to: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: application.businessName || "Unnamed Business",
      applicationId: application.applicationId,
      applicationReferenceNumber: application.applicationReferenceNumber,
      ...metadata,
    };

    // Import mailer functions dynamically to avoid circular dependency
    const mailer = require("../../../auth-service/src/lib/mailer");

    switch (emailType) {
      case "submitted":
        await mailer.sendApplicationSubmittedEmail(emailData);
        break;
      case "approved":
        await mailer.sendApplicationApprovedEmail(emailData);
        break;
      case "rejected":
        await mailer.sendApplicationRejectedEmail({
          ...emailData,
          rejectionReason: metadata.rejectionReason,
        });
        break;
      case "returned":
        await mailer.sendApplicationReturnedEmail({
          ...emailData,
          reviewComments: metadata.reviewComments,
        });
        break;
      default:
        console.warn(`Unknown email type: ${emailType}`);
        return;
    }

    // Update emailSendStatus to sent
    application.emailSendStatus = application.emailSendStatus || {};
    application.emailSendStatus[emailType] = {
      status: "sent",
      retryCount: 0,
      lastAttempt: new Date(),
      lockUntil: null,
    };
    await application.save();
  } catch (err) {
    console.error(
      `Failed to send ${emailType} email for application ${application.applicationId}:`,
      err.message,
    );
    // Update emailSendStatus to failed
    application.emailSendStatus = application.emailSendStatus || {};
    const currentRetry =
      (application.emailSendStatus[emailType]?.retryCount || 0) + 1;
    application.emailSendStatus[emailType] = {
      status: "failed",
      retryCount: currentRetry,
      lastAttempt: new Date(),
      lockUntil: null,
    };
    await application.save();
  }
}

// Owner ID upload (for business registration identity step - no businessId yet)
const ownerIdUploadRoot = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "uploads",
  "owner-ids",
);
const ensureDir = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
};
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

/**
 * GET /api/business-owner/profile
 * Get current user's business profile
 */
router.get(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const profile = await businessProfileService.getProfile(req._userId);
      return respond.success(res, 200, profile);
    } catch (err) {
      console.error("GET /api/business-owner/profile error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch business profile",
      );
    }
  },
);

/**
 * POST /api/business-owner/profile/owner-id/upload
 * Upload owner ID image (front or back) during business registration
 */
router.post(
  "/profile/owner-id/upload",
  requireJwt,
  requireRole(["business_owner"]),
  ownerIdUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return respond.error(res, 400, "file_required", "No file uploaded");
      }
      const scanResult = await scanFile(req.file.path);
      if (!scanResult.clean) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (_) {}
        return respond.error(
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
        ipfsService = require("../lib/ipfsService");
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
          return respond.success(res, 200, { url, ipfsCid: cid, size });
        } catch (ipfsErr) {
          logger.error("IPFS upload failed for owner ID", {
            error: ipfsErr.message,
          });
        }
      }

      // Fallback: local storage
      const url = `/uploads/owner-ids/${userId}/${path.basename(req.file.path)}`;
      logger.info("Owner ID saved to local storage", { url, side, userId });
      return respond.success(res, 200, { url, ipfsCid: null, fallback: true });
    } catch (err) {
      console.error(
        "POST /api/business-owner/profile/owner-id/upload error:",
        err,
      );
      return respond.error(
        res,
        500,
        "upload_error",
        err.message || "Failed to upload ID",
      );
    }
  },
);

/**
 * POST /api/business-owner/profile
 * Update business profile (Step 2-8)
 */
router.post(
  "/profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId;
      const { step, data } = req.body;

      if (!step || !data)
        return respond.error(
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
      return respond.success(res, 200, profile);
    } catch (err) {
      console.error("POST /api/business-owner/profile error:", err);
      return respond.error(
        res,
        500,
        "update_error",
        err.message || "Failed to update business profile",
      );
    }
  },
);

/**
 * POST /api/business-owner/businesses
 * Add a new business (create draft application)
 */
router.post(
  "/businesses",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const businessData = req.body;

      // Generate unique application ID
      const mongoose = require("mongoose");
      const applicationId = new mongoose.Types.ObjectId().toString();

      // Create application in Application collection
      // Map documentCids to lguDocuments format
      const lguDocuments = {};
      if (businessData.documentCids) {
        for (const [key, cid] of Object.entries(businessData.documentCids)) {
          // Store as both the base key and the IpfsCid variant for compatibility
          lguDocuments[key] = cid;
          lguDocuments[`${key}IpfsCid`] = cid;
        }
      }

      // Generate reference number for submitted applications
      let applicationReferenceNumber =
        businessData.applicationReferenceNumber || "";
      const isSubmitted = businessData.applicationStatus === "submitted";
      if (
        isSubmitted &&
        (!applicationReferenceNumber ||
          applicationReferenceNumber.trim() === "")
      ) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomSeq = Math.floor(1000 + Math.random() * 9000);
        applicationReferenceNumber = `APP-${dateStr}-${randomSeq}`;
      }

      const application = await Application.create({
        applicationId,
        businessId: applicationId, // Set businessId to applicationId for frontend compatibility
        userId,
        applicationType: businessData.applicationType || "new",
        applicationStatus: businessData.applicationStatus || "draft",
        applicationReferenceNumber,
        formType: businessData.formType || "",
        category: businessData.category || "",
        permitFormId: businessData.permitFormId || businessData.formDefinitionId || null,
        formData: businessData.formData || {},
        lguDocuments: lguDocuments,
        submittedAt: businessData.submittedAt
          ? new Date(businessData.submittedAt)
          : isSubmitted
            ? new Date()
            : null,
        submittedToLguOfficer: isSubmitted,
        isSubmitted,
        // Store businessName at top level for display (extracted from various possible field keys)
        businessName:
          businessData.businessName ||
          businessData.formData?.businessName ||
          businessData.formData?.registeredBusinessName ||
          businessData.formData?.activityName ||
          businessData.formData?.["Business / trade name"] ||
          businessData.formData?.businessTradeName ||
          "",
        // Map business data to application fields
        organizationType: businessData.organizationType || "",
        businessPlateNo: businessData.businessPlateNo || "",
        yearEstablished: businessData.yearEstablished || null,
        houseBldgNo: businessData.houseBldgNo || "",
        buildingName: businessData.buildingName || "",
        subdivision: businessData.subdivision || "",
        blockCode: businessData.blockCode || "",
        pin: businessData.pin || "",
        buildingRegistryNo: businessData.buildingRegistryNo || "",
        businessAreaSqm: businessData.businessAreaSqm || 0,
        totalEmployees: businessData.totalEmployees || 0,
        employeesResidingInLgu: businessData.employeesResidingInLgu || 0,
        ownerAddress: businessData.ownerAddress || {},
        lessorInfo: businessData.lessorInfo || {},
        emergencyContact: businessData.emergencyContact || {},
        presidentName: businessData.presidentName || "",
        treasurerName: businessData.treasurerName || "",
        businessActivities: businessData.businessActivities || [],
        capital: businessData.capital || {},
        accreditations: businessData.accreditations || {},
        oathOfUndertaking: businessData.oathOfUndertaking || false,
        birRegistration: businessData.birRegistration || {},
        otherAgencyRegistrations: businessData.otherAgencyRegistrations || {},
      });

      // Log audit event for submitted applications
      if (isSubmitted) {
        await logAuditEvent(
          "application_submitted",
          userId,
          "application",
          application.applicationId,
          { applicationId: application.applicationId, userId },
        ).catch((err) => console.error("Failed to log audit event:", err));
      }

      // Send submitted email (await to ensure emailSendStatus is updated)
      if (isSubmitted) {
        try {
          await sendApplicationEmail(application, "submitted");
        } catch (err) {
          console.error("Failed to send submitted email:", err);
        }
      }

      // Return in format expected by frontend
      return respond.success(res, 200, {
        businessId: applicationId,
        business: application,
        businesses: [application],
      });
    } catch (err) {
      console.error("POST /api/business-owner/businesses error:", err);
      return respond.error(
        res,
        400,
        "add_error",
        err.message || "Failed to add business",
      );
    }
  },
);

/**
 * GET /api/business-owner/businesses
 * Get all businesses for the current business owner
 */
router.get(
  "/businesses",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        sort = "updatedAt",
        order = "desc",
      } = req.query;

      const userId = req._userId || req.user?.id;

      // Get draft/submitted applications from Application collection (no lean() to allow decryption)
      // Exclude officer_draft applications from business owner view
      const applications = await Application.find({ 
        userId,
        applicationStatus: { $ne: "officer_draft" }
      });

      // Merge only applications (convert to plain objects)
      let businesses = [
        ...applications.map((a) => ({
          ...a.toObject(),
          businessId: a.applicationId, // Map applicationId to businessId for frontend compatibility
          _source: "application",
        })),
      ];

      // Deduplicate by businessId/applicationId
      const seen = new Set();
      businesses = businesses.filter((b) => {
        const id = b.businessId || b._id?.toString();
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });

      // Filter by status
      if (status) {
        businesses = businesses.filter((b) => b.applicationStatus === status);
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        businesses = businesses.filter(
          (b) =>
            b.businessName?.toLowerCase().includes(searchLower) ||
            b.businessId?.toLowerCase().includes(searchLower),
        );
      }

      // Sort
      businesses.sort((a, b) => {
        const aVal = a[sort] || a.createdAt;
        const bVal = b[sort] || b.createdAt;
        return order === "desc"
          ? new Date(bVal) - new Date(aVal)
          : new Date(aVal) - new Date(bVal);
      });

      const total = businesses.length;

      // Return all businesses without pagination
      return respond.success(res, 200, {
        businesses: businesses,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: total,
          hasNext: false,
          hasPrev: false,
        },
      });
    } catch (err) {
      console.error("GET /api/business-owner/businesses error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch businesses",
      );
    }
  },
);

/**
 * GET /api/business-owner/businesses/:id
 * Get a specific business or application by ID
 */
router.get(
  "/businesses/:id",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;

      const mongoose = require("mongoose");

      // First try to find in Business collection
      const businessFilter = { userId };
      if (mongoose.Types.ObjectId.isValid(id)) {
        businessFilter.$or = [{ businessId: id }, { _id: id }];
      } else {
        businessFilter.businessId = id;
      }

      const business = await Business.findOne(businessFilter);

      if (business) {
        return respond.success(res, 200, { business });
      }

      // If not found in Business, try Application collection (for draft applications)
      const applicationFilter = { userId };
      if (mongoose.Types.ObjectId.isValid(id)) {
        applicationFilter.$or = [{ applicationId: id }, { _id: id }];
      } else {
        applicationFilter.applicationId = id;
      }

      const application = await Application.findOne(applicationFilter);

      if (application) {
        // Return application as business for frontend compatibility
        return respond.success(res, 200, { business: application });
      }

      return respond.error(
        res,
        404,
        "not_found",
        "Business or application not found",
      );
    } catch (err) {
      console.error("GET /api/business-owner/businesses/:id error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch business/application",
      );
    }
  },
);

/**
 * GET /api/business-owner/businesses/primary
 * Get the primary business for the current user
 */
router.get(
  "/businesses/primary",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const business = await Business.findOne({
        userId,
        isPrimary: true,
      });

      if (!business) {
        // If no primary business, return the most recently created one
        const fallback = await Business.findOne({ userId })
          .sort({ createdAt: -1 })
          .lean();

        if (!fallback) {
          return respond.error(res, 404, "not_found", "No businesses found");
        }

        return respond.success(res, 200, { business: fallback });
      }

      return respond.success(res, 200, { business });
    } catch (err) {
      console.error("GET /api/business-owner/businesses/primary error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch primary business",
      );
    }
  },
);

/**
 * PUT /api/business-owner/businesses/:id
 * Update a business
 */
router.put(
  "/businesses/:id",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;
      const businessData = req.body;

      const mongoose = require("mongoose");

      // Map documentCids to lguDocuments format for Application updates
      // Only update lguDocuments if documentCids is non-empty to avoid overwriting existing files
      const updateData = { ...businessData };
      if (
        businessData.documentCids &&
        Object.keys(businessData.documentCids).length > 0
      ) {
        const lguDocuments = {};
        for (const [key, cid] of Object.entries(businessData.documentCids)) {
          lguDocuments[key] = cid;
          lguDocuments[`${key}IpfsCid`] = cid;
        }
        updateData.lguDocuments = lguDocuments;
      }

      // Update businessName at top level for display (extracted from various possible field keys)
      updateData.businessName =
        businessData.businessName ||
        businessData.formData?.businessName ||
        businessData.formData?.registeredBusinessName ||
        businessData.formData?.activityName ||
        businessData.formData?.["Business / trade name"] ||
        businessData.formData?.businessTradeName ||
        "";

      // Generate reference number if submitting and missing
      const isSubmitting = businessData.applicationStatus === "submitted";
      const isResubmitting = businessData.applicationStatus === "resubmit";
      if (
        isSubmitting &&
        (!businessData.applicationReferenceNumber ||
          businessData.applicationReferenceNumber.trim() === "")
      ) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomSeq = Math.floor(1000 + Math.random() * 9000);
        updateData.applicationReferenceNumber = `APP-${dateStr}-${randomSeq}`;
        updateData.submittedAt = new Date();
        updateData.submittedToLguOfficer = true;
        updateData.isSubmitted = true;
      }

      // Reset return flags when resubmitting
      if (isResubmitting) {
        updateData.returnCount = 0;
        updateData.returnExhausted = false;
      }

      // First, try to update in Application collection (for draft applications)
      // Try both applicationId and _id to handle different ID types
      let application = await Application.findOneAndUpdate(
        { applicationId: id, userId },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      // If not found by applicationId, try by _id
      if (!application && mongoose.Types.ObjectId.isValid(id)) {
        console.log(
          `Application not found by applicationId ${id}, trying by _id`,
        );
        application = await Application.findOneAndUpdate(
          { _id: id, userId },
          { $set: updateData },
          { new: true, runValidators: true },
        );
      }

      if (application) {
        console.log(
          `Successfully updated Application with applicationId: ${application.applicationId}, status: ${application.applicationStatus}`,
        );

        // Send submitted email (fire and forget)
        if (isSubmitting || isResubmitting) {
          console.log('[PUT /businesses/:id] Attempting to send email', {
            applicationId: application.applicationId,
            isSubmitting,
            isResubmitting
          });
          const sendApplicationEmail = require("./lgu-officer/permitApplications").sendApplicationEmail;
          try {
            await sendApplicationEmail(application, isResubmitting ? "resubmitted" : "submitted");
          } catch (err) {
            console.error("Failed to send submitted email:", err);
          }
        }

        return respond.success(res, 200, { businesses: [application] });
      }

      console.log(
        `Application not found with id: ${id}, userId: ${userId}, trying Business collection`,
      );

      // If not found in Application, try Business collection (for approved businesses)
      const filter = { userId };

      // Match by businessId or by _id (only if id is a valid ObjectId)
      if (mongoose.Types.ObjectId.isValid(id)) {
        filter.$or = [{ businessId: id }, { _id: id }];
      } else {
        filter.businessId = id;
      }

      const business = await Business.findOneAndUpdate(
        filter,
        { $set: businessData },
        { new: true, runValidators: true },
      );

      if (!business) {
        console.log(`Business not found with id: ${id}, userId: ${userId}`);
        return respond.error(res, 404, "not_found", "Business not found");
      }

      console.log(
        `Successfully updated Business with businessId: ${business.businessId}, status: ${business.applicationStatus}`,
      );
      return respond.success(res, 200, { businesses: [business] });
    } catch (err) {
      console.error("PUT /api/business-owner/businesses/:id error:", err);
      return respond.error(
        res,
        400,
        "update_error",
        err.message || "Failed to update business",
      );
    }
  },
);

/**
 * PATCH /api/business-owner/businesses/:id
 * Update business status (active/inactive/closed) only
 */
router.patch(
  "/businesses/:id",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;
      const { businessStatus } = req.body || {};

      if (!businessStatus) {
        return respond.error(
          res,
          400,
          "missing_field",
          "businessStatus is required",
        );
      }

      const mongoose = require("mongoose");
      const filter = { userId };

      if (mongoose.Types.ObjectId.isValid(id)) {
        filter.$or = [{ businessId: id }, { _id: id }];
      } else {
        filter.businessId = id;
      }

      const business = await Business.findOneAndUpdate(
        filter,
        { $set: { businessStatus } },
        { new: true },
      );

      if (!business) {
        return respond.error(res, 404, "not_found", "Business not found");
      }

      return respond.success(res, 200, { business });
    } catch (err) {
      console.error("PATCH /api/business-owner/businesses/:id error:", err);
      return respond.error(
        res,
        400,
        "update_error",
        err.message || "Failed to update business status",
      );
    }
  },
);

/**
 * DELETE /api/business-owner/businesses/:id
 * Delete a business or application
 */
router.delete(
  "/businesses/:id",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;

      const mongoose = require("mongoose");

      // First try to delete from Business collection
      const businessFilter = { userId };
      if (mongoose.Types.ObjectId.isValid(id)) {
        businessFilter.$or = [{ businessId: id }, { _id: id }];
      } else {
        businessFilter.businessId = id;
      }

      const business = await Business.findOneAndDelete(businessFilter);

      if (business) {
        return respond.success(res, 200, { success: true });
      }

      // If not found in Business, try Application collection (for draft applications)
      const applicationFilter = { userId };
      if (mongoose.Types.ObjectId.isValid(id)) {
        applicationFilter.$or = [{ applicationId: id }, { _id: id }];
      } else {
        applicationFilter.applicationId = id;
      }

      const application = await Application.findOneAndDelete(applicationFilter);

      if (application) {
        return respond.success(res, 200, { success: true });
      }

      return respond.error(
        res,
        404,
        "not_found",
        "Business or application not found",
      );
    } catch (err) {
      console.error("DELETE /api/business-owner/businesses/:id error:", err);
      return respond.error(
        res,
        400,
        "delete_error",
        err.message || "Failed to delete business/application",
      );
    }
  },
);

/**
 * POST /api/business-owner/businesses/:id/primary
 * Set a business as primary
 */
router.post(
  "/businesses/:id/primary",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;

      // Unset primary for all user's businesses
      await Business.updateMany({ userId }, { $set: { isPrimary: false } });

      const mongoose = require("mongoose");
      const filter = { userId };

      if (mongoose.Types.ObjectId.isValid(id)) {
        filter.$or = [{ businessId: id }, { _id: id }];
      } else {
        filter.businessId = id;
      }

      // Set primary for the specified business
      const business = await Business.findOneAndUpdate(
        filter,
        { $set: { isPrimary: true } },
        { new: true },
      );

      if (!business) {
        return respond.error(res, 404, "not_found", "Business not found");
      }

      return respond.success(res, 200, { business });
    } catch (err) {
      console.error(
        "POST /api/business-owner/businesses/:id/primary error:",
        err,
      );
      return respond.error(
        res,
        400,
        "set_primary_error",
        err.message || "Failed to set primary business",
      );
    }
  },
);

/**
 * PUT /api/business-owner/businesses/:id/risk-profile
 * Update risk profile
 */
router.put(
  "/businesses/:id/risk-profile",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;
      const riskProfileData = req.body;

      const mongoose = require("mongoose");
      const filter = { userId };

      if (mongoose.Types.ObjectId.isValid(id)) {
        filter.$or = [{ businessId: id }, { _id: id }];
      } else {
        filter.businessId = id;
      }

      const business = await Business.findOneAndUpdate(
        filter,
        { $set: { riskProfile: riskProfileData } },
        { new: true },
      );

      if (!business) {
        return respond.error(res, 404, "not_found", "Business not found");
      }

      return respond.success(res, 200, { business });
    } catch (err) {
      console.error(
        "PUT /api/business-owner/businesses/:id/risk-profile error:",
        err,
      );
      return respond.error(
        res,
        400,
        "update_error",
        err.message || "Failed to update risk profile",
      );
    }
  },
);

/**
 * POST /api/business-owner/businesses/:id/submit
 * Submit business application to LGU
 */
router.post(
  "/businesses/:id/submit",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;

      const mongoose = require("mongoose");

      // Generate reference number (matching system format)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const referenceNumber = `APP-${dateStr}-${randomSeq}`;

      // Try Application collection (business is only created after approval)
      const applicationFilter = { userId };
      if (mongoose.Types.ObjectId.isValid(id)) {
        applicationFilter.$or = [{ applicationId: id }, { _id: id }];
      } else {
        applicationFilter.applicationId = id;
      }

      const application = await Application.findOneAndUpdate(
        applicationFilter,
        {
          $set: {
            submittedAt: new Date(),
            applicationStatus: "submitted",
            applicationReferenceNumber: referenceNumber,
            submittedToLguOfficer: true,
            isSubmitted: true,
          },
        },
        { new: true },
      );

      if (application) {
        // Send submitted email (await to ensure emailSendStatus is updated)
        console.log('[SUBMIT] Application found, attempting to send email', {
          applicationId: application.applicationId,
          userId: application.userId,
          businessName: application.businessName,
          applicationReferenceNumber: application.applicationReferenceNumber
        });
        const sendApplicationEmail = require("./lgu-officer/permitApplications").sendApplicationEmail;
        try {
          await sendApplicationEmail(application, "submitted");
        } catch (err) {
          console.error("Failed to send submitted email:", err);
        }
        return respond.success(res, 200, { business: application });
      }

      return respond.error(
        res,
        404,
        "not_found",
        "Business or application not found",
      );
    } catch (err) {
      console.error(
        "POST /api/business-owner/businesses/:id/submit error:",
        err,
      );
      return respond.error(
        res,
        400,
        "submit_error",
        err.message || "Failed to submit application",
      );
    }
  },
);

/**
 * PUT /api/business-owner/businesses/:id/payment-generation-status
 * Update payment generation status
 */
router.put(
  "/businesses/:id/payment-generation-status",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;
      const statusData = req.body;

      const mongoose = require("mongoose");
      const filter = { userId };

      if (mongoose.Types.ObjectId.isValid(id)) {
        filter.$or = [{ businessId: id }, { _id: id }];
      } else {
        filter.businessId = id;
      }

      const business = await Business.findOneAndUpdate(
        filter,
        {
          $set: {
            paymentGenerationStatus: { ...statusData, updatedAt: new Date() },
          },
        },
        { new: true },
      );

      if (!business) {
        return respond.error(res, 404, "not_found", "Business not found");
      }

      return respond.success(res, 200, {
        message: "Payment generation status updated successfully",
        paymentGenerationStatus: business.paymentGenerationStatus,
      });
    } catch (err) {
      console.error(
        "PUT /api/business-owner/businesses/:id/payment-generation-status error:",
        err,
      );
      return respond.error(
        res,
        400,
        "update_error",
        err.message || "Failed to update payment generation status",
      );
    }
  },
);

/**
 * GET /api/business-owner/businesses/:id/payment-generation-status
 * Get payment generation status
 */
router.get(
  "/businesses/:id/payment-generation-status",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const { id } = req.params;

      const mongoose = require("mongoose");
      const filter = { userId };

      if (mongoose.Types.ObjectId.isValid(id)) {
        filter.$or = [{ businessId: id }, { _id: id }];
      } else {
        filter.businessId = id;
      }

      const business = await Business.findOne(filter);

      if (!business) {
        return respond.error(res, 404, "not_found", "Business not found");
      }

      return respond.success(
        res,
        200,
        business.paymentGenerationStatus || { enabled: false },
      );
    } catch (err) {
      console.error(
        "GET /api/business-owner/businesses/:id/payment-generation-status error:",
        err,
      );
      return respond.error(
        res,
        400,
        "fetch_error",
        err.message || "Failed to fetch payment generation status",
      );
    }
  },
);

/**
 * POST /api/business-owner/debug/clear-applications
 * Debug endpoint to clear all applications and reset welcomeCompleted
 * WARNING: This is for development/testing only
 */
router.post(
  "/debug/clear-applications",
  requireJwt,
  requireRole(["business_owner"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;

      // Delete all applications for this user
      const appResult = await Application.deleteMany({ userId });
      console.log(`[DEBUG] Deleted ${appResult.deletedCount} applications for user ${userId}`);

      // Clear businesses array from BusinessProfile
      const bpResult = await BusinessProfile.updateMany(
        { userId },
        { $set: { businesses: [] } }
      );
      console.log(`[DEBUG] Cleared businesses array from ${bpResult.modifiedCount} profiles for user ${userId}`);

      // Reset welcomeCompleted for this user (need to call auth-service)
      // For now, we'll just log it - the user can manually reset via the auth-service script
      console.log(`[DEBUG] Note: welcomeCompleted needs to be reset via auth-service script`);

      return respond.success(res, 200, {
        message: "Applications cleared successfully",
        deletedApplications: appResult.deletedCount,
        clearedProfiles: bpResult.modifiedCount,
      });
    } catch (err) {
      console.error("POST /api/business-owner/debug/clear-applications error:", err);
      return respond.error(
        res,
        500,
        "clear_error",
        err.message || "Failed to clear applications",
      );
    }
  },
);

module.exports = router;
