const express = require("express");
const axios = require("axios");
const router = express.Router();
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const Application = require("../../models/Application");
const Business = require("../../models/Business");
const BusinessProfile = require("../../models/BusinessProfile");
const GeneralPermit = require("../../models/GeneralPermit");
const User = require("../../models/User");
const respond = require("../../middleware/respond");
const { logAuditEvent } = require("../../lib/auditClient");

// Helper to send application email (fire and forget, doesn't block status change)
async function sendApplicationEmail(application, emailType, metadata = {}) {
  console.log('[sendApplicationEmail] START', { 
    applicationId: application.applicationId || application._id, 
    emailType, 
    userId: application.userId,
    businessName: application.businessName 
  });
  try {
    const user = await User.findById(application.userId).select(
      "firstName lastName email",
    );
    console.log('[sendApplicationEmail] User lookup result', { 
      found: !!user, 
      hasEmail: !!user?.email,
      email: user?.email 
    });
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
    console.log('[sendApplicationEmail] Email data prepared', { 
      to: emailData.to, 
      firstName: emailData.firstName,
      businessName: emailData.businessName,
      applicationReferenceNumber: emailData.applicationReferenceNumber 
    });

    // Import mailer functions dynamically to avoid circular dependency
    const mailer = require("../../../../auth-service/src/lib/mailer");
    console.log('[sendApplicationEmail] Mailer imported');

    switch (emailType) {
      case "submitted":
        console.log('[sendApplicationEmail] Calling sendApplicationSubmittedEmail');
        await mailer.sendApplicationSubmittedEmail(emailData);
        console.log('[sendApplicationEmail] sendApplicationSubmittedEmail completed');
        break;
      case "resubmitted":
        console.log('[sendApplicationEmail] Calling sendApplicationResubmittedEmail');
        await mailer.sendApplicationResubmittedEmail(emailData);
        console.log('[sendApplicationEmail] sendApplicationResubmittedEmail completed');
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

    // Update emailSendStatus to sent using direct updateOne to avoid document instance issues
    const Application = require("../../models/Application");
    console.log('[sendApplicationEmail] Attempting updateOne with _id:', application._id, 'emailType:', emailType);
    const updateResult = await Application.updateOne(
      { _id: application._id },
      {
        $set: {
          [`emailSendStatus.${emailType}`]: {
            status: "sent",
            retryCount: 0,
            lastAttempt: new Date(),
            lockUntil: null,
          },
        },
      },
    );
    console.log('[sendApplicationEmail] Direct updateOne result:', JSON.stringify(updateResult));
    console.log('[sendApplicationEmail] SUCCESS - emailSendStatus updated via updateOne');
  } catch (err) {
    console.error(
      `Failed to send ${emailType} email for application ${application.applicationId}:`,
      err.message,
    );
    // Update emailSendStatus to failed using direct updateOne
    const Application = require("../../models/Application");
    const currentRetry =
      (application.emailSendStatus?.[emailType]?.retryCount || 0) + 1;
    await Application.updateOne(
      { _id: application._id },
      {
        $set: {
          [`emailSendStatus.${emailType}`]: {
            status: "failed",
            retryCount: currentRetry,
            lastAttempt: new Date(),
            lockUntil: null,
          },
        },
      },
    );
  }
}

/**
 * POST /api/lgu-officer/permit-applications/:id/start-review
 * Claim an application for review
 */
router.post(
  "/permit-applications/:id/start-review",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { businessId } = req.body;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
      const application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (application.reviewedBy) {
        return respond.error(
          res,
          400,
          "already_claimed",
          "Application already claimed",
        );
      }

      // Fetch officer name
      const officer =
        await User.findById(officerId).select("firstName lastName");
      const officerName = officer
        ? `${officer.firstName} ${officer.lastName}`.trim()
        : "Officer";

      application.reviewedBy = officerId;
      application.reviewedByName = officerName;
      application.applicationStatus = "under_review";
      application.reviewedAt = new Date();

      // Add to reviewers array if not already present
      if (!application.reviewers) {
        application.reviewers = [];
      }
      const alreadyInReviewers = application.reviewers.some(
        (r) => String(r.officerId) === String(officerId),
      );
      if (!alreadyInReviewers) {
        application.reviewers.push({
          officerId: officerId,
          officerName: officerName,
        });
      }

      await application.save();

      return respond.success(res, 200, {
        application,
        lockedByOfficer: true,
      });
    } catch (err) {
      console.error(
        "POST /api/lgu-officer/permit-applications/:id/start-review error:",
        err,
      );
      return respond.error(
        res,
        500,
        "claim_error",
        "Failed to claim application",
      );
    }
  },
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
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { decision, comments, rejectionReason, businessId } = req.body;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
      const application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only review your own claimed applications",
        );
      }

      if (decision === "approve") {
        // Generate business ID
        const generatedBusinessId =
          `BIZ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

        // Get BusinessProfile
        const businessProfile = await BusinessProfile.findOne({
          userId: application.userId,
        });
        if (!businessProfile) {
          return respond.error(
            res,
            404,
            "profile_not_found",
            "Business profile not found",
          );
        }

        // Create Business from approved application
        // Extract business name from various possible field keys (different form types use different keys)
        const businessName =
          application.formData?.businessName ||
          application.formData?.registeredBusinessName ||
          application.formData?.activityName ||
          application.formData?.["Business / trade name"] ||
          application.formData?.businessTradeName ||
          "Unnamed Business";

        const business = await Business.create({
          businessId: generatedBusinessId,
          userId: application.userId,
          ownerProfileId: businessProfile._id,
          approvedApplicationId: application._id,
          businessName,
          registeredBusinessName:
            application.formData?.registeredBusinessName || "",
          businessStatus: "active",
          registrationStatus: "proposed",
          location: application.formData?.location || {},
          businessType: application.formData?.businessType,
          registrationAgency: application.formData?.registrationAgency,
          businessRegistrationNumber:
            application.formData?.businessRegistrationNumber || "",
          businessStartDate: application.formData?.businessStartDate,
          numberOfBranches: application.formData?.numberOfBranches || 0,
          industryClassification:
            application.formData?.industryClassification || "",
          taxIdentificationNumber:
            application.formData?.taxIdentificationNumber || "",
          contactNumber: application.formData?.contactNumber || "",
          riskProfile: application.formData?.riskProfile || {},
        });

        // Update application with business reference
        application.businessId = business._id;
        application.applicationStatus = "approved";
        application.reviewedAt = new Date();
        application.reviewComments = comments;
        await application.save();

        // Send approval email (await to ensure emailSendStatus is updated)
        try {
          await sendApplicationEmail(application, "approved");
        } catch (err) {
          console.error("Failed to send approval email:", err);
        }

        return respond.success(res, 200, { application, business });
      } else if (decision === "reject") {
        application.applicationStatus = "rejected";
        application.rejectionReason = rejectionReason;
        if (!application.originalRejectionReason) {
          application.originalRejectionReason = rejectionReason;
        }
        application.reviewComments = comments;
        application.reviewedAt = new Date();
        await application.save();

        // Send rejection email (await to ensure emailSendStatus is updated)
        try {
          await sendApplicationEmail(application, "rejected", {
            rejectionReason,
          });
        } catch (err) {
          console.error("Failed to send rejection email:", err);
        }

        return respond.success(res, 200, { application });
      } else if (decision === "request_changes") {
        application.applicationStatus = "needs_revision";
        application.reviewComments = comments;
        application.reviewedAt = new Date();
        await application.save();

        // Send returned email (await to ensure emailSendStatus is updated)
        try {
          await sendApplicationEmail(application, "returned", {
            reviewComments: comments,
          });
        } catch (err) {
          console.error("Failed to send returned email:", err);
        }

        return respond.success(res, 200, { application });
      } else {
        return respond.error(res, 400, "invalid_decision", "Invalid decision");
      }
    } catch (err) {
      console.error(
        "POST /api/lgu-officer/permit-applications/:id/review error:",
        err,
      );
      return respond.error(
        res,
        500,
        "review_error",
        "Failed to review application",
      );
    }
  },
);

/**
 * GET /api/lgu-officer/permit-applications
 * Get permit applications with filters (includes both Application and GeneralPermit)
 */
router.get(
  "/permit-applications",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const { status, reviewedBy, page = 1, limit = 50 } = req.query;

      const filter = {};
      if (status) {
        // Support comma-separated statuses (e.g. "pending_renewal,renewal_submitted")
        const statuses = status
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        filter.applicationStatus =
          statuses.length > 1 ? { $in: statuses } : statuses[0];
      } else {
        // Default: show all SUBMITTED applications regardless of status (exclude drafts)
        filter.applicationStatus = { $ne: "draft" };
      }

      if (reviewedBy) filter.reviewedBy = reviewedBy;

      // Get applications from Application collection
      const applications = await Application.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Application.countDocuments(filter);

      // Also get GeneralPermit documents (temporary permits)
      const GeneralPermit = require("../../models/GeneralPermit");
      const permitFilter = {};
      if (status) {
        const statuses = status
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        permitFilter.status =
          statuses.length > 1 ? { $in: statuses } : statuses[0];
      } else {
        permitFilter.status = { $ne: "draft" };
      }

      const generalPermits = await GeneralPermit.find(permitFilter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const permitTotal = await GeneralPermit.countDocuments(permitFilter);

      // Merge results and add formType to distinguish
      const mergedApplications = [
        ...applications.map((app) => ({
          ...app.toObject(),
          formType: app.formType || "permit",
        })),
        ...generalPermits.map((permit) => ({
          ...permit.toObject(),
          formType: "general_permit",
          applicationStatus: permit.status,
          userId: permit.applicantId,
          businessName: permit.permitCategory,
          formData: {
            permitCategory: permit.permitCategory,
            businessPlateNo: permit.businessPlateNo,
            requirements: permit.requirements,
          },
        })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return respond.success(res, 200, {
        applications: mergedApplications,
        meta: {
          total: total + permitTotal,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((total + permitTotal) / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("GET /api/lgu-officer/permit-applications error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch applications",
      );
    }
  },
);

/**
 * GET /api/lgu-officer/permit-applications/:id
 * Get single application by ID (includes GeneralPermit)
 */
router.get(
  "/permit-applications/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const rawId = req.params.id;
      // Only query by _id when the value is a valid Mongo ObjectId; otherwise
      // Mongoose throws a CastError (e.g. for applicationId values like "APP-XXX").
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);

      // First check Application collection (for draft/submitted applications)
      const applicationOr = [{ applicationId: rawId }];
      if (isObjectId) applicationOr.push({ _id: rawId });
      let doc = await Application.findOne({ $or: applicationOr });

      // If not found in Application, check Business collection (for approved applications)
      if (!doc) {
        const businessOr = [{ businessId: rawId }];
        if (isObjectId) businessOr.push({ _id: rawId });
        doc = await Business.findOne({ $or: businessOr });
      }

      // If not found in Business, check GeneralPermit collection (for temporary permits)
      if (!doc && isObjectId) {
        const GeneralPermit = require("../../models/GeneralPermit");
        doc = await GeneralPermit.findOne({ _id: rawId });
      }

      if (!doc) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Convert to plain object so we can enrich with ownerName
      const application = doc.toObject ? doc.toObject() : doc;

      // Handle GeneralPermit-specific field mapping
      if (doc.constructor.modelName === "GeneralPermit") {
        application.formType = "general_permit";
        application.applicationStatus = application.status;
        application.userId = application.applicantId;
        application.businessName = application.permitCategory;
        application.category = application.permitCategory;
        application.formData = {
          permitCategory: application.permitCategory,
          businessPlateNo: application.businessPlateNo,
          requirements: application.requirements,
        };
      }

      // Enrich with owner's full name (frontend reads application.ownerName)
      const ownerId =
        application.userId || application.ownerId || application.applicantId;
      if (ownerId) {
        try {
          const owner = await User.findById(ownerId)
            .select("firstName lastName email")
            .lean();
          if (owner) {
            application.ownerName =
              `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
              owner.email ||
              "N/A";
            application.ownerEmail = owner.email;
          }
        } catch (e) {
          // Non-fatal: owner lookup failure shouldn't block the response
        }
      }

      // Map lguDocuments to documents for frontend compatibility
      // Frontend reads application.documents, but Application model uses lguDocuments
      console.log("[GET /:id] lguDocuments:", application.lguDocuments);
      console.log(
        "[GET /:id] formData keys:",
        Object.keys(application.formData || {}),
      );

      // Initialize lguDocuments if it doesn't exist
      if (!application.lguDocuments) {
        application.lguDocuments = {};
      }

      // Try to extract document CIDs from formData if lguDocuments is empty
      // Form fields might store CIDs directly in formData
      if (
        Object.keys(application.lguDocuments).length === 0 &&
        application.formData
      ) {
        const docFields = [
          "ownerGovernmentId",
          "barangayClearance",
          "dtiSecCdaCertificate",
          "leaseContractOrTitle",
          "ctcCedula",
          "occupancyPermit",
        ];
        for (const field of docFields) {
          if (application.formData[field]) {
            application.lguDocuments[`${field}IpfsCid`] =
              application.formData[field];
            console.log(
              `[GET /:id] Extracted ${field} from formData:`,
              application.formData[field],
            );
          }
        }
      }

      if (application.lguDocuments && !application.documents) {
        application.documents = application.lguDocuments;
      }

      // Also map lguDocuments fields to match form definition keys
      // Form definition uses keys like 'ownerGovernmentId', 'barangayClearance', etc.
      // lguDocuments uses 'ownerGovernmentIdIpfsCid', 'barangayClearanceIpfsCid', etc.
      // Add the base keys to documents for easier lookup
      if (application.lguDocuments) {
        const keyMapping = {
          ownerGovernmentIdIpfsCid: "ownerGovernmentId",
          barangayClearanceIpfsCid: "barangayClearance",
          dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
          leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
          ctcCedulaIpfsCid: "ctcCedula",
          occupancyPermitIpfsCid: "occupancyPermit",
        };
        for (const [ipfsKey, baseKey] of Object.entries(keyMapping)) {
          if (
            application.lguDocuments[ipfsKey] &&
            !application.documents[baseKey]
          ) {
            application.documents[baseKey] = application.lguDocuments[ipfsKey];
            console.log(
              `[GET /:id] Mapped ${ipfsKey} -> ${baseKey}:`,
              application.lguDocuments[ipfsKey],
            );
          }
        }
        console.log("[GET /:id] Final documents:", application.documents);
      }

      // Return the application object directly (frontend uses the response as-is)
      return res.json(application);
    } catch (err) {
      console.error("GET /api/lgu-officer/permit-applications/:id error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch application",
      );
    }
  },
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/claim
 * Claim a permit application for review
 */
router.put(
  "/permit-applications/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { force } = req.query;
      const officerId = req._userId;

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!application) {
        application = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Fetch officer name for reviewedByName (don't use lean() to allow decryption)
      const officer =
        await User.findById(officerId).select("firstName lastName");
      const officerName = officer
        ? `${officer.firstName} ${officer.lastName}`.trim()
        : req._userEmail || "Officer";

      // Set reviewer and transition to under_review if currently submitted
      // Keep resubmit status as is to distinguish from first-time submissions
      const updateData = {
        reviewedBy: officerId,
        reviewedByName: officerName,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      };

      if (application.applicationStatus === "submitted") {
        updateData.applicationStatus = "under_review";
      }

      // Update based on collection type with atomic condition to prevent race condition
      // Allow override if force=true (officer confirmed in modal)
      let updated;
      const atomicCondition =
        force === "true"
          ? {}
          : { $or: [{ reviewedBy: null }, { reviewedBy: officerId }] };

      if (application.constructor.modelName === "Application") {
        updated = await Application.findOneAndUpdate(
          {
            _id: application._id,
            ...atomicCondition,
          },
          {
            $set: updateData,
            $addToSet: {
              reviewers: {
                officerId: officerId,
                officerName: officerName,
              },
            },
          },
          { new: true },
        );
      } else {
        updated = await Business.findOneAndUpdate(
          {
            _id: application._id,
            ...atomicCondition,
          },
          { $set: updateData },
          { new: true },
        );
      }

      if (!updated) {
        return respond.error(
          res,
          409,
          "conflict",
          "Application already claimed by another officer",
        );
      }

      // Emit real-time event to all officers
      req.io?.to("lgu-officers").emit("application:claimed", {
        applicationId:
          application.applicationId ||
          application.businessId ||
          application._id.toString(),
        claimedBy: officerId,
        claimedByName: officerName,
      });

      // Log audit event
      await logAuditEvent(
        "application_claimed",
        officerId,
        application.constructor.modelName,
        application.applicationId ||
          application.businessId ||
          application._id.toString(),
        {
          applicationId: application.applicationId || application.businessId,
          businessName: application.businessName,
          applicationStatus: application.applicationStatus,
          applicationReferenceNumber: application.applicationReferenceNumber,
          officerName,
        },
      );

      // Re-fetch to get updated data
      const updatedApplication = await (application.constructor.modelName ===
      "Application"
        ? Application.findById(application._id)
        : Business.findById(application._id));

      return res.json({
        success: true,
        message: "Application claimed successfully",
        application: updatedApplication,
      });
    } catch (err) {
      console.error(
        "PUT /api/lgu-officer/permit-applications/:id/claim error:",
        err,
      );
      return respond.error(
        res,
        500,
        "claim_failed",
        "Failed to claim application",
      );
    }
  },
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/release
 * Release a permit application back to the pool
 */
router.put(
  "/permit-applications/:id/release",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const officerId = req._userId;

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!application) {
        application = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Only the claiming officer can release (or admin)
      const userRole = req.user?.role?.slug || req._userRole;
      if (
        application.reviewedBy &&
        String(application.reviewedBy) !== String(officerId) &&
        userRole !== "admin"
      ) {
        return respond.error(
          res,
          403,
          "forbidden",
          "Only the claiming officer can release this application",
        );
      }

      // Revert to submitted if under_review
      const updateData = {
        reviewedBy: null,
        reviewedByName: "",
        reviewedAt: null,
        updatedAt: new Date(),
      };

      if (application.applicationStatus === "under_review") {
        updateData.applicationStatus = "submitted";
      }

      // Update based on collection type
      if (application.constructor.modelName === "Application") {
        await Application.updateOne(
          { _id: application._id },
          { $set: updateData },
        );
      } else {
        await Business.updateOne(
          { _id: application._id },
          { $set: updateData },
        );
      }

      // Log audit event
      await logAuditEvent(
        "application_released",
        officerId,
        application.constructor.modelName,
        application.applicationId ||
          application.businessId ||
          application._id.toString(),
        {
          applicationId: application.applicationId || application.businessId,
          businessName: application.businessName,
          applicationStatus: application.applicationStatus,
          applicationReferenceNumber: application.applicationReferenceNumber,
          officerName,
        },
      );

      return res.json({
        success: true,
        message: "Application released successfully",
      });
    } catch (err) {
      console.error(
        "PUT /api/lgu-officer/permit-applications/:id/release error:",
        err,
      );
      return respond.error(
        res,
        500,
        "release_failed",
        "Failed to release application",
      );
    }
  },
);

/**
 * POST /api/lgu-officer/permit-applications/:id/reset-status
 * Reset application status (for testing - undo approval)
 */
router.post(
  "/permit-applications/:id/reset-status",
  requireJwt,
  requireRole(["lgu_officer", "admin", "staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newStatus } = req.body;

      if (!newStatus) {
        return respond.error(
          res,
          400,
          "validation_error",
          "New status is required",
        );
      }

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!application) {
        application = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Update status
      const updateData = {
        applicationStatus: newStatus,
        updatedAt: new Date(),
      };

      // Update based on collection type
      if (application.constructor.modelName === "Application") {
        await Application.updateOne(
          { _id: application._id },
          { $set: updateData },
        );
      } else {
        await Business.updateOne(
          { _id: application._id },
          { $set: updateData },
        );
      }

      return respond.success(res, 200, {
        message: "Application status reset successfully",
      });
    } catch (err) {
      console.error(
        "POST /api/lgu-officer/permit-applications/:id/reset-status error:",
        err,
      );
      return respond.error(
        res,
        500,
        "reset_error",
        err.message || "Failed to reset application status",
      );
    }
  },
);

/**
 * PATCH /api/lgu-officer/permit-applications/:id/field-decisions
 * Update field-level review decisions
 */
router.patch(
  "/permit-applications/:id/field-decisions",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const {
        businessId,
        fieldKey,
        status,
        reasonCode,
        reasonOther,
        decisions,
      } = req.body;
      const officerId = req._userId;

      // Build payload from single decision or batch decisions
      const payload =
        decisions && Array.isArray(decisions)
          ? decisions
          : fieldKey && status !== undefined && status !== null
            ? [{ fieldKey, status, reasonCode, reasonOther }]
            : fieldKey && (status === null || status === undefined)
              ? [{ fieldKey, status: null, reasonCode, reasonOther }]
              : null;

      if (!payload || payload.length === 0) {
        return respond.error(
          res,
          400,
          "missing_data",
          "fieldKey and status, or decisions array, required",
        );
      }

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);

      // Find application in Application collection
      let doc = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!doc) {
        doc = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: req.params.id }, { _id: req.params.id }]
            : [{ businessId: req.params.id }],
        });
      }

      if (!doc) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Fetch officer name for audit trail (don't use lean() to allow decryption)
      const officer =
        await User.findById(officerId).select("firstName lastName");
      const officerName = officer
        ? `${officer.firstName} ${officer.lastName}`.trim()
        : "Officer";

      // Get existing fieldReviewDecisions as object (not array)
      const decisionsObj =
        doc.fieldReviewDecisions && typeof doc.fieldReviewDecisions === "object"
          ? { ...doc.fieldReviewDecisions }
          : {};

      // Process each decision
      for (const item of payload) {
        const {
          fieldKey: itemFieldKey,
          status: decisionStatus,
          requestCode,
          requestOther,
          reasonCode: itemReasonCode,
          reasonOther: itemReasonOther,
        } = item;
        if (!itemFieldKey) continue;

        // Clear decision if status is null
        if (decisionStatus === null || decisionStatus === undefined) {
          delete decisionsObj[itemFieldKey];
          continue;
        }

        if (!["accepted", "request_changes"].includes(decisionStatus)) continue;

        decisionsObj[itemFieldKey] = {
          status: decisionStatus,
          requestCode:
            decisionStatus === "request_changes"
              ? itemReasonCode || requestCode || null
              : undefined,
          requestOther:
            decisionStatus === "request_changes"
              ? itemReasonOther || requestOther || null
              : undefined,
          decidedAt: new Date(),
          decidedBy: officerId,
          decidedByName: officerName,
        };

        // Log audit event for individual field review
        await logAuditEvent(
          "field_reviewed",
          officerId,
          doc.constructor.modelName,
          doc.applicationId || doc.businessId || doc._id.toString(),
          {
            applicationId: doc.applicationId || doc.businessId,
            fieldKey: itemFieldKey,
            decision: decisionStatus,
            reasonCode: decisionStatus === "request_changes" ? (itemReasonCode || requestCode || null) : undefined,
            reasonOther: decisionStatus === "request_changes" ? (itemReasonOther || requestOther || null) : undefined,
            officerName,
          },
        );
      }

      // Update based on collection type
      const updateData = {
        fieldReviewDecisions: decisionsObj,
        updatedAt: new Date(),
      };

      if (doc.constructor.modelName === "Application") {
        await Application.updateOne({ _id: doc._id }, { $set: updateData });
      } else {
        await Business.updateOne({ _id: doc._id }, { $set: updateData });
      }

      // Log audit event for field decisions
      await logAuditEvent(
        "field_decisions_updated",
        officerId,
        doc.constructor.modelName,
        doc.applicationId || doc.businessId || doc._id.toString(),
        {
          applicationId: doc.applicationId || doc.businessId,
          decisionsCount: payload.length,
          officerName,
          decisions: payload.map((item) => ({
            fieldKey: item.fieldKey,
            status: item.status,
            requestCode: item.requestCode,
            requestOther: item.requestOther,
            reasonCode: item.reasonCode,
            reasonOther: item.reasonOther,
          })),
        },
      );

      // Re-fetch and return the updated application
      const updatedApplication = await (doc.constructor.modelName ===
      "Application"
        ? Application.findById(doc._id)
        : Business.findById(doc._id));

      // Enrich with ownerName and map lguDocuments to documents (same as GET /:id)
      const application = updatedApplication.toObject
        ? updatedApplication.toObject()
        : updatedApplication;
      const ownerId = application.userId || application.ownerId;
      if (ownerId) {
        try {
          const owner = await User.findById(ownerId)
            .select("firstName lastName email")
            .lean();
          if (owner) {
            application.ownerName =
              `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
              owner.email ||
              "N/A";
            application.ownerEmail = owner.email;
          }
        } catch (e) {
          // Non-fatal
        }
      }

      if (application.lguDocuments && !application.documents) {
        application.documents = application.lguDocuments;
        const keyMapping = {
          ownerGovernmentIdIpfsCid: "ownerGovernmentId",
          barangayClearanceIpfsCid: "barangayClearance",
          dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
          leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
          ctcCedulaIpfsCid: "ctcCedula",
          occupancyPermitIpfsCid: "occupancyPermit",
        };
        for (const [ipfsKey, baseKey] of Object.entries(keyMapping)) {
          if (
            application.lguDocuments[ipfsKey] &&
            !application.documents[baseKey]
          ) {
            application.documents[baseKey] = application.lguDocuments[ipfsKey];
          }
        }
      }

      return res.json(application);
    } catch (err) {
      console.error(
        "PATCH /api/lgu-officer/permit-applications/:id/field-decisions error:",
        err,
      );
      return respond.error(
        res,
        500,
        "update_error",
        "Failed to update field decisions",
      );
    }
  },
);

/**
 * POST /api/lgu-officer/permit-applications/:id/pending-action
 * Create a pending action with undo window
 */
router.post(
  "/permit-applications/:id/pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { actionType, payload, delayMinutes } = req.body;

      if (
        !actionType ||
        !["complete_review", "reject", "return", "reject_appeal"].includes(
          actionType,
        )
      ) {
        return respond.error(
          res,
          400,
          "invalid_data",
          "actionType must be one of: complete_review, reject, return, reject_appeal",
        );
      }

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let doc = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!doc) {
        doc = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      // If not found in Business, check GeneralPermit collection (for temporary permits)
      if (!doc) {
        const GeneralPermit = require("../../models/GeneralPermit");
        doc = await GeneralPermit.findOne({ _id: id });
      }

      if (!doc) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Check if there's already a pending action
      if (doc.pendingAction?.actionType) {
        return respond.error(
          res,
          409,
          "conflict",
          "A pending action already exists. Cancel it first.",
        );
      }

      const now = new Date();
      const scheduledAt = new Date(
        now.getTime() + (delayMinutes || 10) * 60 * 1000,
      );

      const updateData = {
        pendingAction: {
          actionType,
          scheduledAt,
          payload: payload || {},
          expiresAt: scheduledAt,
          createdAt: now,
        },
        updatedAt: new Date(),
      };

      // Update based on collection type
      if (doc.constructor.modelName === "Application") {
        await Application.updateOne({ _id: doc._id }, { $set: updateData });
      } else if (doc.constructor.modelName === "GeneralPermit") {
        await require("../../models/GeneralPermit").updateOne(
          { _id: doc._id },
          { $set: updateData },
        );
      } else {
        await Business.updateOne({ _id: doc._id }, { $set: updateData });
      }

      // Log audit event for pending action creation
      await logAuditEvent(
        "pending_action_created",
        req._userId,
        doc.constructor.modelName,
        doc.applicationId || doc.businessId || doc._id.toString(),
        {
          applicationId: doc.applicationId || doc.businessId,
          actionType,
          scheduledAt,
        },
      );

      // Re-fetch and return the updated application
      const updatedApplication = await (doc.constructor.modelName ===
      "Application"
        ? Application.findById(doc._id)
        : doc.constructor.modelName === "GeneralPermit"
          ? require("../../models/GeneralPermit").findById(doc._id)
          : Business.findById(doc._id));

      // Enrich with ownerName and map lguDocuments to documents (same as GET /:id)
      const application = updatedApplication.toObject
        ? updatedApplication.toObject()
        : updatedApplication;
      const ownerId = application.userId || application.ownerId;
      if (ownerId) {
        try {
          const owner = await User.findById(ownerId)
            .select("firstName lastName email")
            .lean();
          if (owner) {
            application.ownerName =
              `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
              owner.email ||
              "N/A";
            application.ownerEmail = owner.email;
          }
        } catch (e) {
          // Non-fatal
        }
      }

      if (application.lguDocuments && !application.documents) {
        application.documents = application.lguDocuments;
        const keyMapping = {
          ownerGovernmentIdIpfsCid: "ownerGovernmentId",
          barangayClearanceIpfsCid: "barangayClearance",
          dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
          leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
          ctcCedulaIpfsCid: "ctcCedula",
          occupancyPermitIpfsCid: "occupancyPermit",
        };
        for (const [ipfsKey, baseKey] of Object.entries(keyMapping)) {
          if (
            application.lguDocuments[ipfsKey] &&
            !application.documents[baseKey]
          ) {
            application.documents[baseKey] = application.lguDocuments[ipfsKey];
          }
        }
      }

      return res.json(application);
    } catch (err) {
      console.error("POST /pending-action error:", err);
      if (err.message === "Application not found") {
        return respond.error(res, 404, "not_found", "Application not found");
      }
      return respond.error(
        res,
        500,
        "server_error",
        err.message || "Failed to create pending action",
      );
    }
  },
);

/**
 * DELETE /api/lgu-officer/permit-applications/:id/pending-action
 * Cancel a pending action (undo)
 */
router.delete(
  "/permit-applications/:id/pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let doc = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!doc) {
        doc = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      // If not found in Business, check GeneralPermit collection (for temporary permits)
      if (!doc) {
        const GeneralPermit = require("../../models/GeneralPermit");
        doc = await GeneralPermit.findOne({ _id: id });
      }

      if (!doc) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      const updateData = {
        pendingAction: null,
        updatedAt: new Date(),
      };

      // Update based on collection type
      if (doc.constructor.modelName === "Application") {
        await Application.updateOne({ _id: doc._id }, { $set: updateData });
      } else if (doc.constructor.modelName === "GeneralPermit") {
        await require("../../models/GeneralPermit").updateOne(
          { _id: doc._id },
          { $set: updateData },
        );
      } else {
        await Business.updateOne({ _id: doc._id }, { $set: updateData });
      }

      // Log audit event for pending action cancellation
      await logAuditEvent(
        "pending_action_cancelled",
        req._userId,
        doc.constructor.modelName,
        doc.applicationId || doc.businessId || doc._id.toString(),
        {
          applicationId: doc.applicationId || doc.businessId,
        },
      );

      // Re-fetch and return the updated application
      const updatedApplication = await (doc.constructor.modelName ===
      "Application"
        ? Application.findById(doc._id)
        : Business.findById(doc._id));

      // Enrich with ownerName and map lguDocuments to documents (same as GET /:id)
      const application = updatedApplication.toObject
        ? updatedApplication.toObject()
        : updatedApplication;
      const ownerId = application.userId || application.ownerId;
      if (ownerId) {
        try {
          const owner = await User.findById(ownerId)
            .select("firstName lastName email")
            .lean();
          if (owner) {
            application.ownerName =
              `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
              owner.email ||
              "N/A";
            application.ownerEmail = owner.email;
          }
        } catch (e) {
          // Non-fatal
        }
      }

      if (application.lguDocuments && !application.documents) {
        application.documents = application.lguDocuments;
        const keyMapping = {
          ownerGovernmentIdIpfsCid: "ownerGovernmentId",
          barangayClearanceIpfsCid: "barangayClearance",
          dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
          leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
          ctcCedulaIpfsCid: "ctcCedula",
          occupancyPermitIpfsCid: "occupancyPermit",
        };
        for (const [ipfsKey, baseKey] of Object.entries(keyMapping)) {
          if (
            application.lguDocuments[ipfsKey] &&
            !application.documents[baseKey]
          ) {
            application.documents[baseKey] = application.lguDocuments[ipfsKey];
          }
        }
      }

      return res.json(application);
    } catch (err) {
      console.error("DELETE /pending-action error:", err);
      return respond.error(
        res,
        500,
        "server_error",
        err.message || "Failed to cancel pending action",
      );
    }
  },
);

/**
 * GET /api/lgu-officer/permit-applications/:id/pending-action
 * Get pending action
 */
router.get(
  "/permit-applications/:id/pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let doc = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!doc) {
        doc = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      if (!doc) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      return res.json({ pendingAction: doc.pendingAction });
    } catch (err) {
      console.error("GET /pending-action error:", err);
      return respond.error(
        res,
        500,
        "server_error",
        err.message || "Failed to get pending action",
      );
    }
  },
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/execute-pending-action
 * Execute a pending action (called by scheduled job or manual trigger)
 */
router.put(
  "/permit-applications/:id/execute-pending-action",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Only query by _id when the value is a valid Mongo ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

      // Find application in Application collection
      let doc = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: id }, { _id: id }]
          : [{ applicationId: id }],
      });

      // If not found in Application, check Business collection (for approved applications)
      if (!doc) {
        doc = await Business.findOne({
          $or: isObjectId
            ? [{ businessId: id }, { _id: id }]
            : [{ businessId: id }],
        });
      }

      // If not found in Business, check GeneralPermit collection (for temporary permits)
      if (!doc) {
        const GeneralPermit = require("../../models/GeneralPermit");
        doc = await GeneralPermit.findOne({ _id: id });
      }

      if (!doc) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      const pendingAction = doc.pendingAction;
      if (!pendingAction || !pendingAction.actionType) {
        return respond.error(
          res,
          400,
          "no_pending_action",
          "No pending action to execute",
        );
      }

      // Execute the action based on type
      let newStatus = doc.applicationStatus || doc.status;
      if (pendingAction.actionType === "complete_review") {
        newStatus = "approved";
      } else if (pendingAction.actionType === "reject") {
        newStatus = "rejected";
      } else if (pendingAction.actionType === "return") {
        newStatus = "returned";
      } else if (pendingAction.actionType === "reject_appeal") {
        newStatus = "appeal_rejected";
      }

      const updateData = {
        pendingAction: null,
        updatedAt: new Date(),
      };
      // Use appropriate status field based on model type
      if (doc.constructor.modelName === "GeneralPermit") {
        updateData.status = newStatus;
      } else {
        updateData.applicationStatus = newStatus;
      }

      // Store rejection reason or comments on the document when rejecting
      if (pendingAction.actionType === "reject") {
        updateData.rejectionReason =
          pendingAction.payload?.rejectionReason ||
          pendingAction.payload?.comments ||
          pendingAction.payload?.requestOther;
      }
      // Store comments when approving
      if (pendingAction.actionType === "complete_review") {
        updateData.reviewComments = pendingAction.payload?.comments;
      }
      // Handle appeal rejection - update appeal document
      if (pendingAction.actionType === "reject_appeal") {
        const Appeal = require("../../models/Appeal");
        const appealId = pendingAction.payload?.appealId;
        if (appealId) {
          await Appeal.updateOne(
            { _id: appealId },
            {
              $set: {
                status: "rejected",
                resolution: pendingAction.payload?.rejectionReason || "",
                reviewedBy: req._userId,
                reviewedAt: new Date(),
              },
            },
          );
        }
      }

      // Update based on collection type
      if (doc.constructor.modelName === "Application") {
        await Application.updateOne({ _id: doc._id }, { $set: updateData });

        // If approving an Application, create a corresponding Business record
        if (newStatus === "approved") {
          const BusinessProfile = require("../../models/BusinessProfile");
          const businessProfile = await BusinessProfile.findOne({
            userId: doc.userId,
          });
          if (!businessProfile) {
            console.error(
              "[execute-pending-action] BusinessProfile not found for Application applicant:",
              doc.userId,
            );
          } else {
            const businessId = `BIZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            // For general_permit formType, use activityName as business name (the actual name submitted by user)
            const businessName =
              doc.formType === "general_permit"
                ? doc.formData?.activityName ||
                  doc.formData?.businessName ||
                  "Temporary Permit"
                : doc.formData?.businessName || "Unknown Business";
            const business = await Business.create({
              businessId,
              userId: doc.userId,
              ownerProfileId: businessProfile._id,
              approvedApplicationId: doc._id,
              businessName,
              businessStatus: "active",
              registrationStatus: "not_yet_registered",
              applicationStatus: "approved",
              applicationReferenceNumber: doc.applicationReferenceNumber,
              formType: doc.formType || "permit",
              category:
                doc.formType === "general_permit"
                  ? doc.formData?.generalPermitCategory || doc.category || ""
                  : doc.category || "",
              formData: doc.formData || {},
              submittedAt: doc.submittedAt,
              reviewedBy: doc.reviewedBy,
              location: {
                street: doc.formData?.businessAddress?.streetAddress || "",
                barangay: doc.formData?.businessAddress?.barangayName || "",
                city: "",
                municipality: "",
                province: "",
                zipCode: doc.formData?.businessAddress?.postalCode || "",
              },
              businessType: "g", // Default to retail trade (Wholesale and retail trade) - can be mapped from LOB later
              registrationAgency: "LGU",
              businessRegistrationNumber:
                doc.formData?.tin ||
                `APP-${doc._id.toString().slice(-8).toUpperCase()}`,
              contactNumber: doc.formData?.businessPhone || "",
            });
            console.log(
              "[execute-pending-action] Created Business record:",
              businessId,
              "for Application:",
              doc.applicationId,
            );
          }
        }
      } else if (doc.constructor.modelName === "GeneralPermit") {
        await require("../../models/GeneralPermit").updateOne(
          { _id: doc._id },
          { $set: updateData },
        );

        // If approving a GeneralPermit, create a corresponding Business record
        if (newStatus === "approved") {
          const BusinessProfile = require("../../models/BusinessProfile");
          const businessProfile = await BusinessProfile.findOne({
            userId: doc.applicantId,
          });
          if (!businessProfile) {
            console.error(
              "[execute-pending-action] BusinessProfile not found for GeneralPermit applicant:",
              doc.applicantId,
            );
          } else {
            const businessId = `BIZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const business = await Business.create({
              businessId,
              userId: doc.applicantId,
              ownerProfileId: businessProfile._id,
              approvedGeneralPermitId: doc._id,
              businessName: doc.permitCategory || "Temporary Permit",
              registeredBusinessName: "",
              businessStatus: "active",
              registrationStatus: "not_yet_registered",
              applicationStatus: "approved",
              applicationReferenceNumber: `GP-${doc._id.toString().slice(-8).toUpperCase()}`,
              formType: "general_permit",
              category: doc.permitCategory || "",
              formData: {
                permitCategory: doc.permitCategory,
                businessPlateNo: doc.businessPlateNo,
                requirements: doc.requirements,
              },
              submittedAt: doc.createdAt,
              reviewedBy: req._userId,
              location: {},
              businessType: "g",
              registrationAgency: "LGU",
              businessRegistrationNumber: `TEMP-${doc._id.toString().slice(-8).toUpperCase()}`,
              contactNumber: "",
            });
            // Update permit with business reference
            await require("../../models/GeneralPermit").updateOne(
              { _id: doc._id },
              { $set: { businessId: business._id } },
            );
            console.log(
              "[execute-pending-action] Created Business record:",
              businessId,
              "for GeneralPermit:",
              doc._id,
            );
          }
        }
      } else {
        await Business.updateOne({ _id: doc._id }, { $set: updateData });
      }

      // Log audit event for the executed decision
      let eventType = null;
      if (pendingAction.actionType === "complete_review") {
        eventType = "review_completed";
      } else if (pendingAction.actionType === "reject") {
        eventType = "application_rejected";
      } else if (pendingAction.actionType === "return") {
        eventType = "application_returned";
      } else if (pendingAction.actionType === "reject_appeal") {
        eventType = "appeal_rejected";
      }

      if (eventType) {
        await logAuditEvent(
          eventType,
          req._userId,
          doc.constructor.modelName,
          doc.applicationId || doc.businessId || doc._id.toString(),
          {
            applicationId: doc.applicationId || doc.businessId,
            businessId: doc.businessId,
            applicationStatus: newStatus,
            previousStatus: doc.applicationStatus,
            comments: pendingAction.payload?.comments,
            rejectionReason: pendingAction.payload?.rejectionReason,
            requestType: pendingAction.payload?.requestType,
            requestOther: pendingAction.payload?.requestOther,
            appealId: pendingAction.payload?.appealId,
          },
        );
      }

      // Send email based on action type (await to ensure emailSendStatus is updated)
      let emailType = null;
      let emailMetadata = {};
      if (pendingAction.actionType === "complete_review") {
        emailType = "approved";
        emailMetadata = { comments: pendingAction.payload?.comments };
      } else if (pendingAction.actionType === "reject") {
        emailType = "rejected";
        emailMetadata = { rejectionReason: pendingAction.payload?.rejectionReason || pendingAction.payload?.comments };
      } else if (pendingAction.actionType === "return") {
        emailType = "returned";
        emailMetadata = { reviewComments: pendingAction.payload?.comments };
      } else if (pendingAction.actionType === "reject_appeal") {
        // Send appeal denied email
        const appealId = pendingAction.payload?.appealId;
        if (appealId) {
          try {
            const Appeal = require("../../models/Appeal");
            const appeal = await Appeal.findById(appealId);
            if (appeal) {
              const sendAppealEmail = require("../appeals").sendAppealEmail;
              await sendAppealEmail(doc, appealId, "appeal_denied", {
                resolution: pendingAction.payload?.rejectionReason || "",
              });
            }
          } catch (err) {
            console.error("Failed to send appeal denied email:", err);
          }
        }
      }

      if (emailType) {
        try {
          await sendApplicationEmail(doc, emailType, emailMetadata);
        } catch (err) {
          console.error(`Failed to send ${emailType} email:`, err);
        }
      }

      // Re-fetch and return the updated application
      const updatedApplication = await (doc.constructor.modelName ===
      "Application"
        ? Application.findById(doc._id)
        : Business.findById(doc._id));

      // Enrich with ownerName and map lguDocuments to documents (same as GET /:id)
      const application = updatedApplication.toObject
        ? updatedApplication.toObject()
        : updatedApplication;
      const ownerId = application.userId || application.ownerId;
      if (ownerId) {
        try {
          const owner = await User.findById(ownerId)
            .select("firstName lastName email")
            .lean();
          if (owner) {
            application.ownerName =
              `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
              owner.email ||
              "N/A";
            application.ownerEmail = owner.email;
          }
        } catch (e) {
          // Non-fatal
        }
      }

      if (application.lguDocuments && !application.documents) {
        application.documents = application.lguDocuments;
        const keyMapping = {
          ownerGovernmentIdIpfsCid: "ownerGovernmentId",
          barangayClearanceIpfsCid: "barangayClearance",
          dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
          leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
          ctcCedulaIpfsCid: "ctcCedula",
          occupancyPermitIpfsCid: "occupancyPermit",
        };
        for (const [ipfsKey, baseKey] of Object.entries(keyMapping)) {
          if (
            application.lguDocuments[ipfsKey] &&
            !application.documents[baseKey]
          ) {
            application.documents[baseKey] = application.lguDocuments[ipfsKey];
          }
        }
      }

      return res.json(application);
    } catch (err) {
      console.error("PUT /execute-pending-action error:", err);
      return respond.error(
        res,
        500,
        "server_error",
        err.message || "Failed to execute pending action",
      );
    }
  },
);

/**
 * PATCH /api/lgu-officer/permit-applications/:id/form-data
 * Update form data (for officer drafts and general form updates)
 */
router.patch(
  "/permit-applications/:id/form-data",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const {
        formData,
        documentCids,
        businessId,
        businessDescriptionText,
        businessActivities,
      } = req.body;
      const id = req.params.id;

      // Try by applicationId first (string ID), then by _id (ObjectId)
      let application = await Application.findOne({ applicationId: id });
      if (!application) {
        // Only try _id if it looks like a valid ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          application = await Application.findById(id);
        }
      }

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Only allow form data updates by the claiming officer
      const officerId = req._userId || req.user?.id;
      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only edit your own claimed drafts",
        );
      }

      if (!application.formData) application.formData = {};

      // Support both old LOB-specific fields and new full formData
      if (formData && typeof formData === "object") {
        Object.assign(application.formData, formData);
      }

      // Legacy support for LOB fields
      if (businessDescriptionText) {
        application.formData.businessDescriptionText = businessDescriptionText;
      }
      if (businessActivities) {
        application.formData.businessActivities = businessActivities;
      }

      // formData is a Mixed type — Mongoose does not detect in-place mutations,
      // so we must explicitly mark it modified for the changes to persist.
      application.markModified("formData");

      // Update document CIDs if provided
      if (documentCids && typeof documentCids === "object") {
        if (!application.lguDocuments) application.lguDocuments = {};
        Object.assign(application.lguDocuments, documentCids);
        application.markModified("lguDocuments");
      }

      await application.save();

      // Emit real-time event to all officers
      req.io?.to("lgu-officers").emit("application:updated", {
        application: application,
      });

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error(
        "PATCH /api/lgu-officer/permit-applications/:id/form-data error:",
        err,
      );
      return respond.error(
        res,
        500,
        "update_error",
        "Failed to update form data",
      );
    }
  },
);

/**
 * POST /api/lgu-officer/walk-in-applications
 * Create a walk-in application for a business owner (officer draft)
 */
router.post(
  "/walk-in-applications",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { ownerId, permitType, category } = req.body;

      if (!ownerId) {
        return respond.error(res, 400, "missing_owner", "ownerId is required");
      }
      if (!permitType) {
        return respond.error(
          res,
          400,
          "missing_permit_type",
          "permitType is required",
        );
      }

      // Verify business owner exists
      const businessOwner = await User.findById(ownerId);
      if (!businessOwner) {
        return respond.error(
          res,
          404,
          "owner_not_found",
          "Business owner not found",
        );
      }

      // Fetch officer name
      const officer =
        await User.findById(officerId).select("firstName lastName");
      const officerName = officer
        ? `${officer.firstName} ${officer.lastName}`.trim()
        : "Officer";

      // Fetch active permit form
      const PermitForm = require('../../admin-service/src/models/PermitForm')
      const permitForm = await PermitForm.findOne({ formType: permitType, isActive: true })
      if (!permitForm) {
        return respond.error(
          res,
          404,
          "no_permit_form",
          "No active permit form found for this permit type",
        );
      }

      // Generate application ID
      const applicationId =
        `APP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

      // Create application with officer_draft status
      const application = await Application.create({
        applicationId,
        userId: ownerId,
        applicationType: "new",
        applicationStatus: "officer_draft",
        formType: permitType,
        category: category || "",
        permitFormId: permitForm._id.toString(),
        formData: {},
        lguDocuments: {},
        reviewedBy: officerId,
        reviewedByName: officerName,
        reviewedAt: new Date(),
        createdByOfficer: true,
        reviewers: [{ officerId, officerName }],
      });

      // Log audit event
      await logAuditEvent(
        "walkin_application_created",
        officerId,
        "application",
        applicationId,
        {
          ownerId,
          applicationId,
          permitType,
          category,
          createdByOfficer: true,
        },
      );

      return respond.success(res, 201, { application });
    } catch (err) {
      console.error("POST /api/lgu-officer/walk-in-applications error:", err);
      if (err.response?.status === 404) {
        return respond.error(
          res,
          404,
          "form_not_found",
          "Form definition not found",
        );
      }
      return respond.error(
        res,
        500,
        "create_error",
        "Failed to create walk-in application",
      );
    }
  },
);

/**
 * POST /api/lgu-officer/permit-applications/:id/finish
 * Finish an officer draft application (transition to approved)
 */
router.post(
  "/permit-applications/:id/finish",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
      const application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (application.applicationStatus !== "officer_draft") {
        return respond.error(
          res,
          400,
          "invalid_status",
          "Only officer draft applications can be finished",
        );
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only finish your own claimed drafts",
        );
      }

      // Validate that form is complete (basic check - formData should not be empty)
      if (
        !application.formData ||
        Object.keys(application.formData).length === 0
      ) {
        return respond.error(
          res,
          400,
          "form_incomplete",
          "Application form must be completed before finishing",
        );
      }

      // Generate application reference number if not set
      if (!application.applicationReferenceNumber) {
        application.applicationReferenceNumber =
          `REF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
      }

      // Transition to approved
      application.applicationStatus = "approved";
      application.reviewedAt = new Date();

      await application.save();

      // Send approval email (await to ensure emailSendStatus is updated)
      try {
        await sendApplicationEmail(application, "approved");
      } catch (err) {
        console.error("Failed to send approval email:", err);
      }

      // Log audit event
      await logAuditEvent(
        "officer_draft_finished",
        officerId,
        "application",
        application.applicationId,
        {
          applicationId: application.applicationId,
          applicationReferenceNumber: application.applicationReferenceNumber,
        },
      );

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error(
        "POST /api/lgu-officer/permit-applications/:id/finish error:",
        err,
      );
      return respond.error(
        res,
        500,
        "finish_error",
        "Failed to finish application",
      );
    }
  },
);

/**
 * POST /api/lgu-officer/permit-applications/:id/resend-email
 * Resend application email (with step-up authentication)
 */
router.post(
  "/permit-applications/:id/resend-email",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    console.log('[BACKEND] RESEND EMAIL CALLED', { id: req.params.id, emailType: req.body.emailType, officerId: req._userId || req.user?.id })
    try {
      const officerId = req._userId || req.user?.id;
      const { emailType } = req.body;

      if (
        !emailType ||
        !["submitted", "approved", "rejected", "returned"].includes(emailType)
      ) {
        return respond.error(
          res,
          400,
          "invalid_email_type",
          "Invalid email type",
        );
      }

      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
      const application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Check if officer has claimed the application (or is admin)
      const isAdmin = req.user?.roles?.includes('admin');
      const isClaimedByOfficer = application.reviewedBy && 
        String(application.reviewedBy._id || application.reviewedBy) === String(officerId);
      
      if (!isAdmin && !isClaimedByOfficer) {
        return respond.error(
          res,
          403,
          "not_claimed",
          "You must claim this application before resending emails"
        );
      }

      // Check if retry count is exhausted - auto-reset if exhausted
      const emailStatus = application.emailSendStatus?.[emailType];
      if (emailStatus && emailStatus.retryCount >= 3) {
        // Auto-reset retry count and status to allow retry
        application.emailSendStatus[emailType].retryCount = 0;
        application.emailSendStatus[emailType].status = null;
        application.emailSendStatus[emailType].lastAttempt = null;
        await application.save();
      }

      // Check lock
      const now = new Date();
      const lockUntil = emailStatus?.lockUntil;
      if (lockUntil && new Date(lockUntil) > now) {
        return respond.error(
          res,
          429,
          "locked",
          "Email resend is in progress, please wait",
        );
      }

      // Set lock for 30 seconds
      application.emailSendStatus = application.emailSendStatus || {};
      application.emailSendStatus[emailType] =
        application.emailSendStatus[emailType] || {};
      application.emailSendStatus[emailType].lockUntil = new Date(
        Date.now() + 30 * 1000,
      );
      await application.save();

      // Send email
      try {
        await sendApplicationEmail(application, emailType, {
          rejectionReason: application.rejectionReason,
          reviewComments: application.reviewComments,
        });

        // Log audit event
        await logAuditEvent(
          officerId,
          "application_email_resent",
          "application",
          JSON.stringify({
            applicationId: application.applicationId,
            emailType,
          }),
          JSON.stringify({
            applicationId: application.applicationId,
            emailType,
            status: "sent",
          }),
          "lgu_officer",
          { applicationId: application.applicationId, emailType },
        ).catch((err) => console.error("Failed to log audit event:", err));

        return respond.success(res, 200, {
          message: "Email sent successfully",
        });
      } catch (emailErr) {
        // Update status to failed
        const retryCount =
          (application.emailSendStatus[emailType].retryCount || 0) + 1;
        application.emailSendStatus[emailType].status = "failed";
        application.emailSendStatus[emailType].retryCount = retryCount;
        application.emailSendStatus[emailType].lastAttempt = new Date();
        application.emailSendStatus[emailType].lockUntil = null;
        await application.save();

        // Log audit event
        await logAuditEvent(
          officerId,
          "application_email_resent",
          "application",
          JSON.stringify({
            applicationId: application.applicationId,
            emailType,
          }),
          JSON.stringify({
            applicationId: application.applicationId,
            emailType,
            status: "failed",
            error: emailErr.message,
          }),
          "lgu_officer",
          { applicationId: application.applicationId, emailType },
        ).catch((err) => console.error("Failed to log audit event:", err));

        return respond.error(
          res,
          500,
          "email_send_failed",
          `Failed to send email: ${emailErr.message}`,
        );
      }
    } catch (err) {
      console.error(
        "POST /api/lgu-officer/permit-applications/:id/resend-email error:",
        err,
      );
      return respond.error(res, 500, "resend_error", "Failed to resend email");
    }
  },
);

/**
 * PUT /api/lgu-officer/permit-applications/:id/reset-email-status
 * Reset email send status for manual retry after 3 failed attempts
 */
router.put(
  "/permit-applications/:id/reset-email-status",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { emailType } = req.body;

      if (
        !emailType ||
        !["submitted", "approved", "rejected", "returned"].includes(emailType)
      ) {
        return respond.error(
          res,
          400,
          "invalid_email_type",
          "Invalid email type",
        );
      }

      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
      const application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Reset the specified email type status
      application.emailSendStatus = application.emailSendStatus || {};
      application.emailSendStatus[emailType] = {
        status: "pending",
        retryCount: 0,
        lastAttempt: null,
        lockUntil: null,
      };
      await application.save();

      // Log audit event
      await logAuditEvent(
        officerId,
        "application_email_status_reset",
        "application",
        JSON.stringify({ applicationId: application.applicationId, emailType }),
        JSON.stringify({
          applicationId: application.applicationId,
          emailType,
          status: "reset",
        }),
        "lgu_officer",
        { applicationId: application.applicationId, emailType },
      ).catch((err) => console.error("Failed to log audit event:", err));

      return respond.success(res, 200, {
        message: "Email status reset successfully",
      });
    } catch (err) {
      console.error(
        "PUT /api/lgu-officer/permit-applications/:id/reset-email-status error:",
        err,
      );
      return respond.error(
        res,
        500,
        "reset_error",
        "Failed to reset email status",
      );
    }
  },
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
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
      const application = await Application.findOne({
        $or: isObjectId
          ? [{ applicationId: req.params.id }, { _id: req.params.id }]
          : [{ applicationId: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Only allow deletion of officer drafts by the officer who created them
      if (application.applicationStatus !== "officer_draft") {
        return respond.error(
          res,
          400,
          "invalid_status",
          "Only officer draft applications can be deleted",
        );
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only delete your own drafts",
        );
      }

      await Application.deleteOne({ _id: application._id });

      // Log audit event
      await logAuditEvent(
        officerId,
        "officer_draft_deleted",
        "application",
        JSON.stringify({ applicationId: application.applicationId }),
        null,
        "lgu_officer",
        { applicationId: application.applicationId },
      );

      return respond.success(res, 200, {
        message: "Application deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE /api/lgu-officer/permit-applications/:id error:",
        err,
      );
      return respond.error(
        res,
        500,
        "delete_error",
        "Failed to delete application",
      );
    }
  },
);

module.exports = router;
module.exports.sendApplicationEmail = sendApplicationEmail;
