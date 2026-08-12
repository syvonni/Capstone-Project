const Application = require("../../models/Application");
const Business = require("../../models/Business");
const BusinessProfile = require("../../models/BusinessProfile");
const User = require("../../models/User");
const PermitForm = require("../../../../../shared/models/PermitForm");
const { logAuditEvent } = require("../../lib/auditClient");
const ApplicationAuditHelper = require("../../lib/auditHelpers/applicationAuditHelper");
const applicationEmailService = require("../lgu-officer/applicationEmail.service");

class ApplicationService {
  /**
   * Helper to send application email (fire and forget, doesn't block status change)
   */
  async sendApplicationEmail(application, emailType, metadata = {}) {
    return applicationEmailService.sendApplicationEmail(
      application,
      emailType,
      metadata,
    );
  }

  /**
   * Extract the best available business name from form data.
   * Tries the same field keys used when approving/creating a Business record.
   */
  getBusinessNameFromFormData(formData) {
    if (!formData || typeof formData !== "object") return null;
    return (
      formData.businessName ||
      formData.registeredBusinessName ||
      formData.activityName ||
      formData["Business / trade name"] ||
      formData.businessTradeName ||
      formData.tradeName ||
      formData["Trade / Business Name"] ||
      null
    );
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
  async create(userId, applicationData, auditContext = {}) {
    // Ensure BusinessProfile exists
    let businessProfile = await BusinessProfile.findOne({ userId });
    if (!businessProfile) {
      businessProfile = await BusinessProfile.create({ userId });
    }

    // Fetch PermitForm version if formId is provided
    let formVersion = 1;
    if (applicationData.formId) {
      const permitForm = await PermitForm.findOne({
        formId: applicationData.formId,
        isActive: true,
      });
      if (!permitForm) {
        const error = new Error(
          `Permit form with formId ${applicationData.formId} not found`,
        );
        error.code = "PERMIT_FORM_NOT_FOUND";
        error.status = 404;
        throw error;
      }
      formVersion = permitForm.version || 1;
    }

    // Create application
    const application = await Application.create({
      applicationId: this.generateApplicationId(),
      userId,
      businessId: null,
      formVersion,
      ...applicationData,
    });

    // Log a draft/created audit event, not a submission audit.
    ApplicationAuditHelper.logCreated(
      auditContext?.req,
      userId,
      application,
    );

    return { application };
  }

  /**
   * Partial form data update for autosave
   */
  async patchFormData(id, patch, userId, auditContext = {}) {
    // Resolve by custom applicationId or MongoDB _id (same as _findById)
    const application = await this._findById(id);

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.userId) !== String(userId)) {
      const error = new Error("You can only update your own applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const allowedFields = {};

    if (patch.formData !== undefined) {
      allowedFields.formData = patch.formData;
    }
    if (patch.businessName !== undefined) {
      allowedFields.businessName = patch.businessName;
    }

    // Preserve updatedAt; only set if we have something to save
    if (Object.keys(allowedFields).length === 0) {
      return { application };
    }

    allowedFields.updatedAt = new Date();

    const updatedApplication = await Application.findByIdAndUpdate(
      application._id,
      { $set: allowedFields },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedApplication) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Fire-and-forget audit (do not block response)
    const changedKeys = Object.keys(allowedFields).filter((k) => k !== "updatedAt");
    ApplicationAuditHelper.logAutosaved(
      auditContext?.req,
      userId,
      updatedApplication,
      undefined,
      changedKeys,
    );

    // Hide requested field changes until the application is formally returned.
    this._filterFieldReviewDecisionsForView(updatedApplication);

    return { application: updatedApplication };
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

      paginatedApplications.forEach((app) =>
        this._filterFieldReviewDecisionsForView(app),
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

    applications.forEach((app) => this._filterFieldReviewDecisionsForView(app));

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
   * Filter out field-level review decisions from an application record
   * unless the application has been returned to the applicant for revision.
   * This prevents business owners (and staff viewing as business owners) from
   * seeing requested changes before the application is formally returned.
   */
  _filterFieldReviewDecisionsForView(application) {
    if (!application) return application;

    const status = application.applicationStatus;
    const ownerCanSeeDecisions = ["needs_revision", "returned"].includes(status);

    if (!ownerCanSeeDecisions) {
      application.fieldReviewDecisions = {};
    }

    return application;
  }

  /**
   * Helper to find application by either applicationId or _id
   */
  async _findById(id) {
    // Try applicationId first (string), then _id (ObjectId) if it looks valid
    let application;
    try {
      application = await Application.findOne({ applicationId: id });
    } catch (err) {
      // If applicationId lookup fails, try _id
    }

    if (!application) {
      // Only try _id if it looks like a valid ObjectId (24 hex chars)
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        try {
          application = await Application.findById(id);
        } catch (err) {
          // Invalid ObjectId
        }
      }
    }

    return application;
  }

  /**
   * Get application details
   */
  async getById(id) {
    const application = await this._findById(id);

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

    // Hide requested field changes from the owner until the application is
    // formally returned for revision (needs_revision / returned).
    this._filterFieldReviewDecisionsForView(application);

    return application;
  }

  /**
   * Update application
   */
  async update(id, updateData, userId, auditContext = {}) {
    const application = await this._findById(id);

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

    const oldApplication = application.toObject();
    Object.assign(application, updateData);
    await application.save();

    // Log audit event
    ApplicationAuditHelper.logUpdated(
      auditContext?.req,
      userId,
      oldApplication,
      application,
    );

    // Hide requested field changes until the application is formally returned.
    this._filterFieldReviewDecisionsForView(application);

    return { application };
  }

  /**
   * Submit application (draft → submitted)
   */
  async submit(id, userId, auditContext = {}) {
    const application = await this._findById(id);

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const oldApplication = application.toObject();

    // Only allow owner to submit their own applications
    if (String(application.userId) !== String(userId)) {
      const error = new Error("You can only submit your own applications");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Only allow transition from draft or returned to submitted/resubmit
    const currentStatus = application.applicationStatus;
    if (currentStatus !== "draft" && currentStatus !== "returned") {
      const error = new Error(
        `Cannot submit application with status: ${currentStatus}`,
      );
      error.code = "INVALID_STATUS";
      error.status = 400;
      throw error;
    }

    // Set status and timestamp
    application.applicationStatus =
      currentStatus === "returned" ? "resubmit" : "submitted";
    application.submittedAt = new Date();
    application.submittedToLguOfficer = true;
    application.isSubmitted = true;

    // Use the real business name from form data if the stored name is just a placeholder
    const realBusinessName = this.getBusinessNameFromFormData(application.formData);
    if (realBusinessName) {
      application.businessName = realBusinessName;
    }

    // Generate reference number if missing
    if (
      !application.applicationReferenceNumber ||
      String(application.applicationReferenceNumber).trim() === ""
    ) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      application.applicationReferenceNumber = `APP-${dateStr}-${randomSeq}`;
    }

    await application.save();

    // Log audit event
    const isResubmit = currentStatus === "returned";
    ApplicationAuditHelper.logSubmitted(
      auditContext?.req,
      userId,
      application,
      undefined,
      { isResubmit, oldApplication },
    );

    // Send submission/resubmission email (fire and forget, but capture result for warning)
    const emailType = currentStatus === "returned" ? "resubmitted" : "submitted";
    const emailResult = await this.sendApplicationEmail(
      application,
      emailType,
    );

    // Hide requested field changes until the application is formally returned.
    this._filterFieldReviewDecisionsForView(application);

    return {
      application,
      warnings:
        emailResult?.success === false
          ? [`Failed to send ${emailType} email: ${emailResult.error}`]
          : undefined,
    };
  }

  /**
   * Claim an application for review
   */
  async claim(id, officerId) {
    const application = await this._findById(id);

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
    const application = await this._findById(id);

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error(
        "You can only approve your own claimed applications",
      );
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
      {
        applicationId: application.applicationId,
        businessId: business.businessId,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    // Send approval email (fire and forget, but capture result for warning)
    const emailResult = await this.sendApplicationEmail(application, "approved");

    return {
      application,
      business,
      warnings:
        emailResult?.success === false
          ? [`Failed to send approval email: ${emailResult.error}`]
          : undefined,
    };
  }

  /**
   * Reject an application
   */
  async reject(id, officerId, rejectionReason) {
    const application = await this._findById(id);

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error(
        "You can only reject your own claimed applications",
      );
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

    // Send rejection email (fire and forget, but capture result for warning)
    const emailResult = await this.sendApplicationEmail(
      application,
      "rejected",
      { rejectionReason },
    );

    return {
      application,
      warnings:
        emailResult?.success === false
          ? [`Failed to send rejection email: ${emailResult.error}`]
          : undefined,
    };
  }

  /**
   * Return application for revision
   */
  async returnForRevision(id, officerId, reviewComments) {
    const application = await this._findById(id);

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error(
        "You can only return your own claimed applications",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Check if return is exhausted (already returned once)
    if (application.returnExhausted) {
      const error = new Error(
        "This application has already been returned once. No further returns are allowed.",
      );
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

    // Send returned email (fire and forget, but capture result for warning)
    const emailResult = await this.sendApplicationEmail(
      application,
      "returned",
      { reviewComments },
    );

    return {
      application,
      warnings:
        emailResult?.success === false
          ? [`Failed to send returned email: ${emailResult.error}`]
          : undefined,
    };
  }

  /**
   * Resend application email
   */
  async resendEmail(id, officerId, emailType) {
    if (
      !emailType ||
      ![
        "submitted",
        "resubmitted",
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

    const application = await this._findById(id);

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
      const error = new Error(
        "Maximum retry attempts exceeded for this email type",
      );
      error.code = "MAX_RETRIES_EXCEEDED";
      error.status = 400;
      throw error;
    }

    // Check if locked (rate limiting)
    if (
      emailStatus?.lockUntil &&
      new Date(emailStatus.lockUntil) > new Date()
    ) {
      const error = new Error(
        "Email resend is temporarily locked. Please try again later.",
      );
      error.code = "RATE_LIMITED";
      error.status = 429;
      throw error;
    }

    // Send email
    const emailResult = await this.sendApplicationEmail(application, emailType);

    if (emailResult?.success === false) {
      const error = new Error(emailResult.error || "Failed to resend email");
      error.code = "EMAIL_SEND_FAILED";
      error.status = 500;
      throw error;
    }

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
  async delete(id, userId, auditContext = {}) {
    const application = await this._findById(id);

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
    if (
      application.applicationStatus !== "draft" &&
      application.applicationStatus !== "officer_draft"
    ) {
      const error = new Error("Can only delete draft applications");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    // Log audit event before the record is gone
    ApplicationAuditHelper.logDeleted(
      auditContext?.req,
      userId,
      application,
    );

    await Application.deleteOne({ _id: application._id });

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
      { $set: { welcomeCompleted: false } },
    );

    // Log audit event
    await logAuditEvent("debug_clear_applications", userId, "user", userId, {
      deletedCount: deleteResult.deletedCount,
      resetWelcomeCompleted: true,
    }).catch((err) => console.error("Failed to log audit event:", err));

    return {
      message: "Applications cleared successfully",
      deletedCount: deleteResult.deletedCount,
    };
  }
}

module.exports = new ApplicationService();
