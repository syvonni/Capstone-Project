const Application = require("../../models/Application");
const Business = require("../../models/Business");
const BusinessProfile = require("../../models/BusinessProfile");
const User = require("../../models/User");
const { logAuditEvent } = require("../../lib/auditClient");
const { createHttpClient } = require("../../../shared/lib/httpClient");

class ApplicationService {
  /**
   * Helper to send application email (fire and forget, doesn't block status change)
   */
  async sendApplicationEmail(application, emailType, metadata = {}) {
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
      const mailer = require("../../auth-service/../../lib/mailer");

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

  /**
   * Helper to generate application ID
   */
  generateApplicationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `APP-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Submit a new application
   */
  async create(userId, applicationData) {
    // Ensure BusinessProfile exists
    let businessProfile = await BusinessProfile.findOne({ userId });
    if (!businessProfile) {
      businessProfile = await BusinessProfile.create({ userId });
    }

    // Fetch PermitForm version if formId is provided
    let formVersion = 1
    if (applicationData.formId) {
      try {
        const adminClient = createHttpClient("admin");
        const permitFormResponse = await adminClient.get(`/public/permit-forms/${applicationData.formId}`);
        if (permitFormResponse.data && permitFormResponse.data.version) {
          formVersion = permitFormResponse.data.version
        }
      } catch (err) {
        console.error('Failed to fetch PermitForm version, defaulting to 1:', err.message)
      }
    }

    // Create application
    const application = await Application.create({
      applicationId: this.generateApplicationId(),
      userId,
      businessId: null,
      formVersion,
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

    // Send submission email (fire and forget)
    this.sendApplicationEmail(application, "submitted").catch((err) => {
      console.error("Failed to send submission email:", err);
    });

    return { application };
  }

  /**
   * List applications with optional filters
   */
  async list(userId, userRole, query) {
    const { page = 1, limit = 50, status, reviewedBy } = query;

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

      return {
        applications: paginatedApplications,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    }

    // For business owners, read from Application collection
    const filter = {};

    // Exclude officer_draft applications from business owner view
    filter.applicationStatus = { $ne: "officer_draft" };
    filter.userId = userId;

    if (status) filter.applicationStatus = status;
    if (reviewedBy) filter.reviewedBy = reviewedBy;

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Application.countDocuments(filter);

    return {
      applications,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Get application details
   */
  async getById(id) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
        "ctcCedu",
        "picture",
        "zoningClearance",
        "fireSafetyInspection",
        "sanitaryPermit",
        "environmentalClearance",
      ];

      docFields.forEach((field) => {
        const cid = application.formData[field];
        if (cid && typeof cid === "string" && cid.startsWith("Qm")) {
          application.lguDocuments[field] = cid;
        }
      });
    }

    // Add documents field for frontend compatibility
    application.documents = application.lguDocuments;

    return application;
  }

  /**
   * Update application
   */
  async update(id, updateData, userId) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Only allow owner to update their own applications
    if (String(application.userId) !== String(userId)) {
      const error = new Error("You can only update your own applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Don't allow status updates through this endpoint
    if (updateData.applicationStatus) {
      delete updateData.applicationStatus;
    }

    Object.assign(application, updateData);
    await application.save();

    // Log audit event
    await logAuditEvent(
      "application_updated",
      userId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId, updateData },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { application };
  }

  /**
   * Claim an application for review
   */
  async claim(id, officerId) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (application.reviewedBy) {
      const error = new Error("Application already claimed");
      error.code = "ALREADY_CLAIMED";
      error.status = 400;
      throw error;
    }

    application.reviewedBy = officerId;
    application.claimedAt = new Date();
    await application.save();

    // Log audit event
    await logAuditEvent(
      "application_claimed",
      officerId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId, officerId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { application };
  }

  /**
   * Approve an application
   */
  async approve(id, officerId) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only approve your own claimed applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    if (application.applicationStatus === "approved") {
      const error = new Error("Application already approved");
      error.code = "ALREADY_APPROVED";
      error.status = 400;
      throw error;
    }

    // Generate business ID
    const businessId =
      `BIZ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

    // Get BusinessProfile
    const businessProfile = await BusinessProfile.findOne({
      userId: application.userId,
    });
    if (!businessProfile) {
      const error = new Error("Business profile not found");
      error.code = "PROFILE_NOT_FOUND";
      error.status = 404;
      throw error;
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

    // Log audit event
    await logAuditEvent(
      "application_approved",
      officerId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId, businessId: business.businessId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    // Send approval email (fire and forget)
    this.sendApplicationEmail(application, "approved").catch((err) => {
      console.error("Failed to send approval email:", err);
    });

    return { application, business };
  }

  /**
   * Reject an application
   */
  async reject(id, officerId, rejectionReason) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only reject your own claimed applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    application.applicationStatus = "rejected";
    application.rejectionReason = rejectionReason || "";
    if (!application.originalRejectionReason) {
      application.originalRejectionReason = rejectionReason || "";
    }
    application.reviewedAt = new Date();
    await application.save();

    // Log audit event
    await logAuditEvent(
      "application_rejected",
      officerId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId, rejectionReason },
    ).catch((err) => console.error("Failed to log audit event:", err));

    // Send rejection email (fire and forget)
    this.sendApplicationEmail(application, "rejected", { rejectionReason }).catch((err) => {
      console.error("Failed to send rejection email:", err);
    });

    return { application };
  }

  /**
   * Return application for revision
   */
  async returnForRevision(id, officerId, reviewComments) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only return your own claimed applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Check if return is exhausted (already returned once)
    if (application.returnExhausted) {
      const error = new Error("This application has already been returned once. No further returns are allowed.");
      error.code = "RETURN_EXHAUSTED";
      error.status = 400;
      throw error;
    }

    application.applicationStatus = "needs_revision";
    application.reviewComments = reviewComments || "";
    application.reviewedAt = new Date();
    application.returnCount = (application.returnCount || 0) + 1;
    application.returnExhausted = true; // Only allow one return
    await application.save();

    // Log audit event
    await logAuditEvent(
      "application_returned",
      officerId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId, reviewComments },
    ).catch((err) => console.error("Failed to log audit event:", err));

    // Send returned email (fire and forget)
    this.sendApplicationEmail(application, "returned", { reviewComments }).catch((err) => {
      console.error("Failed to send returned email:", err);
    });

    return { application };
  }

  /**
   * Resend application email
   */
  async resendEmail(id, officerId, emailType) {
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
      const error = new Error("Invalid email type");
      error.code = "INVALID_EMAIL_TYPE";
      error.status = 400;
      throw error;
    }

    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Check if retry count is exhausted
    const emailStatus = application.emailSendStatus?.[emailType];
    const MAX_RETRIES = 3;
    if (emailStatus?.retryCount >= MAX_RETRIES) {
      const error = new Error("Maximum retry attempts exceeded for this email type");
      error.code = "MAX_RETRIES_EXCEEDED";
      error.status = 400;
      throw error;
    }

    // Check if locked (rate limiting)
    if (emailStatus?.lockUntil && new Date(emailStatus.lockUntil) > new Date()) {
      const error = new Error("Email resend is temporarily locked. Please try again later.");
      error.code = "RATE_LIMITED";
      error.status = 429;
      throw error;
    }

    // Send email
    await this.sendApplicationEmail(application, emailType);

    // Log audit event
    await logAuditEvent(
      "application_email_resent",
      officerId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId, emailType },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { application, message: "Email resent successfully" };
  }

  /**
   * Delete application
   */
  async delete(id, userId) {
    const application = await Application.findOne({
      $or: [{ applicationId: id }, { _id: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Only allow owner to delete their own applications
    if (String(application.userId) !== String(userId)) {
      const error = new Error("You can only delete your own applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Only allow deletion of draft applications
    if (application.applicationStatus !== "draft" && application.applicationStatus !== "officer_draft") {
      const error = new Error("Can only delete draft applications");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    await Application.deleteOne({ _id: application._id });

    // Log audit event
    await logAuditEvent(
      "application_deleted",
      userId,
      "application",
      application.applicationId,
      { applicationId: application.applicationId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { message: "Application deleted successfully" };
  }

  /**
   * Debug: Clear all applications for current user and reset welcome state
   */
  async clearAllApplications(userId) {
    // Delete all applications for the user
    const deleteResult = await Application.deleteMany({ userId });

    // Reset welcomeCompleted flag on user
    await User.updateOne(
      { _id: userId },
      { $set: { welcomeCompleted: false } }
    );

    // Log audit event
    await logAuditEvent(
      "debug_clear_applications",
      userId,
      "user",
      userId,
      { 
        deletedCount: deleteResult.deletedCount,
        resetWelcomeCompleted: true 
      }
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { 
      message: "Applications cleared successfully",
      deletedCount: deleteResult.deletedCount 
    };
  }
}

module.exports = new ApplicationService();
