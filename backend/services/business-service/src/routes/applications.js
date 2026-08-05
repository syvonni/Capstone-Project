const express = require("express");
const router = express.Router();
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const Application = require("../models/Application");
const Business = require("../models/Business");
const BusinessProfile = require("../models/BusinessProfile");
const User = require("../models/User");
const respond = require("../middleware/respond");
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
    const mailer = require("../../auth-service/src/lib/mailer");

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

// Helper to generate application ID
const generateApplicationId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `APP-${timestamp}-${random}`.toUpperCase();
};

/**
 * POST /api/business/applications
 * Submit a new application
 */
router.post(
  "/applications",
  requireJwt,
  requireRole(["business_owner", "lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const userId = req._userId || req.user?.id;
      const applicationData = req.body;

      // Ensure BusinessProfile exists
      let businessProfile = await BusinessProfile.findOne({ userId });
      if (!businessProfile) {
        businessProfile = await BusinessProfile.create({ userId });
      }

      // Create application
      const application = await Application.create({
        applicationId: generateApplicationId(),
        userId,
        businessId: null,
        ...applicationData,
      });

      // Log audit event
      await logAuditEvent(
        "application_submitted",
        userId,
        "application",
        application.applicationId,
        { applicationId: application.applicationId, userId },
      ).catch((err) => console.error("Failed to log audit event:", err));

      return respond.success(res, 201, { application });
    } catch (err) {
      console.error("POST /api/business/applications error:", err);
      return respond.error(
        res,
        500,
        "create_error",
        "Failed to create application",
      );
    }
  },
);

/**
 * GET /api/business/applications
 * List applications with optional filters
 */
router.get(
  "/applications",
  requireJwt,
  requireRole(["business_owner", "lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, status, userId, reviewedBy } = req.query;
      const userRole = req.user?.role;

      // For officers/staff, read from Application collection
      if (userRole === "lgu_officer" || userRole === "staff") {
        const filter = {};
        if (status) filter.applicationStatus = status;
        if (userId) filter.userId = userId;
        if (reviewedBy) filter.reviewedBy = reviewedBy;

        const applications = await Application.find(filter)
          .sort({ createdAt: -1 })
          .lean();

        const total = applications.length;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedApplications = applications.slice(
          startIndex,
          startIndex + parseInt(limit),
        );

        return respond.success(res, 200, {
          applications: paginatedApplications,
          meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        });
      }

      // For business owners, read from Application collection
      const filter = {};

      // Exclude officer_draft applications from business owner view
      filter.applicationStatus = { $ne: "officer_draft" };

      if (status) filter.applicationStatus = status;
      if (userId) filter.userId = userId;
      if (reviewedBy) filter.reviewedBy = reviewedBy;

      const applications = await Application.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Application.countDocuments(filter);

      return respond.success(res, 200, {
        applications,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("GET /api/business/applications error:", err);
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
 * GET /api/business/applications/:id
 * Get application details
 */
router.get(
  "/applications/:id",
  requireJwt,
  requireRole(["business_owner", "lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Map lguDocuments to documents for frontend compatibility
      // Frontend reads application.documents, but Application model uses lguDocuments
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
          }
        }
      }

      if (application.lguDocuments && !application.documents) {
        application.documents = application.lguDocuments;
      }

      // Also map lguDocuments fields to match form definition keys
      // Form definition uses keys like 'ctc', 'barangayClearance', etc.
      // lguDocuments uses 'ctcIpfsCid', 'barangayClearanceIpfsCid', etc.
      // Add the base keys to documents for easier lookup
      if (application.lguDocuments) {
        const keyMapping = {
          ownerGovernmentIdIpfsCid: "ownerGovernmentId",
          barangayClearanceIpfsCid: "barangayClearance",
          dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
          leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
          ctcCedulaIpfsCid: "ctcCedula",
          occupancyPermitIpfsCid: "occupancyPermit",
          // General permit form fields
          ctcIpfsCid: "ctc",
          cdaRegistrationIpfsCid: "cdaRegistration",
          cityCooperativesComplianceIpfsCid: "cityCooperativesCompliance",
          spaOrAuthLetterIpfsCid: "spaOrAuthLetter",
          leaseAndLessorPermitIpfsCid: "leaseAndLessorPermit",
          rptClearanceIpfsCid: "rptClearance",
          accountClearanceIpfsCid: "accountClearance",
          secDoleRegistrationIpfsCid: "secDoleRegistration",
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

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error("GET /api/business/applications/:id error:", err);
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
 * PUT /api/business/applications/:id/claim
 * Claim an application
 */
router.put(
  "/applications/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
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

      application.reviewedBy = officerId;
      application.applicationStatus = "under_review";
      application.reviewedAt = new Date();
      await application.save();

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error("PUT /api/business/applications/:id/claim error:", err);
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
 * PUT /api/business/applications/:id/release
 * Release an application
 */
router.put(
  "/applications/:id/release",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only release your own claimed applications",
        );
      }

      application.reviewedBy = null;
      application.applicationStatus = "submitted";
      application.reviewedAt = null;
      await application.save();

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error("PUT /api/business/applications/:id/release error:", err);
      return respond.error(
        res,
        500,
        "release_error",
        "Failed to release application",
      );
    }
  },
);

/**
 * PUT /api/business/applications/:id/transfer
 * Transfer an application to another officer
 */
router.put(
  "/applications/:id/transfer",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { targetOfficerId } = req.body;

      if (!targetOfficerId) {
        return respond.error(
          res,
          400,
          "missing_target",
          "targetOfficerId is required",
        );
      }

      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only transfer your own claimed applications",
        );
      }

      application.reviewedBy = targetOfficerId;
      await application.save();

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error("PUT /api/business/applications/:id/transfer error:", err);
      return respond.error(
        res,
        500,
        "transfer_error",
        "Failed to transfer application",
      );
    }
  },
);

/**
 * PUT /api/business/applications/:id/approve
 * Approve an application and create a Business
 */
router.put(
  "/applications/:id/approve",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only approve your own claimed applications",
        );
      }

      if (application.applicationStatus === "approved") {
        return respond.error(
          res,
          400,
          "already_approved",
          "Application already approved",
        );
      }

      // Generate business ID
      const businessId =
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
        businessId,
        userId: application.userId,
        ownerProfileId: businessProfile._id,
        approvedApplicationId: application._id,
        businessName,
        registeredBusinessName:
          application.formData?.registeredBusinessName || "",
        businessStatus: "active",
        registrationStatus: "proposed",
        location: application.formData?.location || {},
        businessType: application.formData?.businessType || "g",
        registrationAgency: application.formData?.registrationAgency || "LGU",
        businessRegistrationNumber:
          application.formData?.businessRegistrationNumber ||
          application.formData?.tin ||
          `APP-${application._id.toString().slice(-8).toUpperCase()}`,
        businessStartDate: application.formData?.businessStartDate,
        numberOfBranches: application.formData?.numberOfBranches || 0,
        industryClassification:
          application.formData?.industryClassification || "",
        taxIdentificationNumber:
          application.formData?.taxIdentificationNumber || "",
        contactNumber:
          application.formData?.contactNumber ||
          application.formData?.businessPhone ||
          "",
        riskProfile: application.formData?.riskProfile || {},
      });

      // Update application with business reference
      application.businessId = business._id;
      application.applicationStatus = "approved";
      application.reviewedAt = new Date();
      await application.save();

      // Send approval email (await to ensure emailSendStatus is updated)
      try {
        await sendApplicationEmail(application, "approved");
      } catch (err) {
        console.error("Failed to send approval email:", err);
      }

      return respond.success(res, 200, { application, business });
    } catch (err) {
      console.error("PUT /api/business/applications/:id/approve error:", err);
      return respond.error(
        res,
        500,
        "approve_error",
        "Failed to approve application",
      );
    }
  },
);

/**
 * PUT /api/business/applications/:id/reject
 * Reject an application
 */
router.put(
  "/applications/:id/reject",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { rejectionReason } = req.body;

      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only reject your own claimed applications",
        );
      }

      application.applicationStatus = "rejected";
      application.rejectionReason = rejectionReason || "";
      if (!application.originalRejectionReason) {
        application.originalRejectionReason = rejectionReason || "";
      }
      application.reviewedAt = new Date();
      await application.save();

      // Send rejection email (await to ensure emailSendStatus is updated)
      try {
        await sendApplicationEmail(application, "rejected", { rejectionReason });
      } catch (err) {
        console.error("Failed to send rejection email:", err);
      }

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error("PUT /api/business/applications/:id/reject error:", err);
      return respond.error(
        res,
        500,
        "reject_error",
        "Failed to reject application",
      );
    }
  },
);

/**
 * PUT /api/business/applications/:id/return
 * Return application for revision
 */
router.put(
  "/applications/:id/return",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { reviewComments } = req.body;

      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      if (String(application.reviewedBy) !== String(officerId)) {
        return respond.error(
          res,
          403,
          "forbidden",
          "You can only return your own claimed applications",
        );
      }

      // Check if return is exhausted (already returned once)
      if (application.returnExhausted) {
        return respond.error(
          res,
          400,
          "return_exhausted",
          "This application has already been returned once. No further returns are allowed.",
        );
      }

      application.applicationStatus = "needs_revision";
      application.reviewComments = reviewComments || "";
      application.reviewedAt = new Date();
      application.returnCount = (application.returnCount || 0) + 1;
      application.returnExhausted = true; // Only allow one return
      await application.save();

      // Send returned email (await to ensure emailSendStatus is updated)
      try {
        await sendApplicationEmail(application, "returned", { reviewComments });
      } catch (err) {
        console.error("Failed to send returned email:", err);
      }

      return respond.success(res, 200, { application });
    } catch (err) {
      console.error("PUT /api/business/applications/:id/return error:", err);
      return respond.error(
        res,
        500,
        "return_error",
        "Failed to return application",
      );
    }
  },
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
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { emailType } = req.body;

      if (
        !emailType ||
        ![
          "submitted",
          "approved",
          "rejected",
          "returned",
          "appeal_denied",
          "appeal_approved",
        ].includes(emailType)
      ) {
        return respond.error(
          res,
          400,
          "invalid_email_type",
          "Invalid email type",
        );
      }

      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
      });

      if (!application) {
        return respond.error(res, 404, "not_found", "Application not found");
      }

      // Check if retry count is exhausted
      const emailStatus = application.emailSendStatus?.[emailType];
      if (emailStatus && emailStatus.retryCount >= 3) {
        return respond.error(
          res,
          429,
          "retry_exhausted",
          "Maximum retry attempts reached. Please reset email status.",
        );
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
          {
            applicationId: application.applicationId,
            emailType,
            error: emailErr.message,
          },
        ).catch((err) => console.error("Failed to log audit event:", err));

        logger.error("Failed to resend application email", {
          error: emailErr.message,
          applicationId: application.applicationId,
          emailType,
        });

        return respond.error(res, 500, "email_error", "Failed to send email");
      }
    } catch (err) {
      console.error(
        "POST /api/business/applications/:id/resend-email error:",
        err,
      );
      return respond.error(res, 500, "resend_error", "Failed to resend email");
    }
  },
);

/**
 * PUT /api/business/applications/:id/reset-email-status
 * Reset email send status for manual retry after 3 failed attempts
 */
router.put(
  "/applications/:id/reset-email-status",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { emailType } = req.body;

      if (
        !emailType ||
        ![
          "submitted",
          "approved",
          "rejected",
          "returned",
          "appeal_denied",
          "appeal_approved",
        ].includes(emailType)
      ) {
        return respond.error(
          res,
          400,
          "invalid_email_type",
          "Invalid email type",
        );
      }

      const application = await Application.findOne({
        $or: [{ applicationId: req.params.id }, { _id: req.params.id }],
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
        "PUT /api/business/applications/:id/reset-email-status error:",
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

module.exports = router;
