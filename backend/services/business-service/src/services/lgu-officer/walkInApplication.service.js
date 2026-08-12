/**
 * Walk-in Application Service
 *
 * PURPOSE: Handles walk-in application creation and finishing for LGU Officer operations.
 * Extracts business logic from routes/lgu-officer/permitApplications.routes.js
 *
 * METHODS:
 * - createWalkInApplication: Create a walk-in application for a business owner (officer draft)
 * - finishWalkInApplication: Finish an officer draft application (transition to approved)
 *
 * USAGE EXAMPLE:
 * const walkInApplicationService = require('../services/lgu-officer/walkInApplication.service');
 * const result = await walkInApplicationService.createWalkInApplication(ownerId, permitType, category, officerId);
 */

const Application = require("../../models/Application");
const User = require("../../models/User");
const ApplicationAuditHelper = require("../../lib/auditHelpers/applicationAuditHelper");
const businessCreationService = require("./businessCreation.service");
const applicationEmailService = require("./applicationEmail.service");

class WalkInApplicationService {
  /**
   * Generate application ID
   *
   * @returns {string} - Application ID in format APP-{timestamp}-{random}
   */
  generateApplicationId() {
    return `APP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  /**
   * Create a walk-in application for a business owner (officer draft)
   *
   * @param {string} ownerId - Business owner user ID
   * @param {string} permitType - Permit type (formType)
   * @param {string} category - Category (optional)
   * @param {string} officerId - Officer ID creating the application
   * @param {object} [auditContext={}] - Optional audit context (e.g., { req })
   * @returns {Promise<object>} - Created application
   * @throws {Error} - If owner not found (code: NOT_FOUND)
   * @throws {Error} - If no permit form found (code: NOT_FOUND)
   */
  async createWalkInApplication(ownerId, permitType, category, officerId, auditContext = {}) {
    if (!ownerId) {
      const error = new Error("ownerId is required");
      error.code = "MISSING_OWNER";
      error.status = 400;
      throw error;
    }

    if (!permitType) {
      const error = new Error("permitType is required");
      error.code = "MISSING_PERMIT_TYPE";
      error.status = 400;
      throw error;
    }

    // Verify business owner exists
    const businessOwner = await User.findById(ownerId);
    if (!businessOwner) {
      const error = new Error("Business owner not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Fetch officer name
    const officer = await User.findById(officerId).select("firstName lastName");
    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`.trim()
      : "Officer";

    // Fetch active permit form
    const PermitForm = require("../../../../../shared/models/PermitForm");
    const permitForm = await PermitForm.findOne({
      formType: permitType,
      isActive: true,
    });
    if (!permitForm) {
      const error = new Error(
        "No active permit form found for this permit type",
      );
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Generate application ID
    const applicationId = this.generateApplicationId();

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
    await ApplicationAuditHelper.logWalkInCreated(
      auditContext?.req,
      officerId,
      application,
    );

    return { application };
  }

  /**
   * Finish an officer draft application (transition to approved)
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @param {object} [auditContext={}] - Optional audit context (e.g., { req })
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If invalid status (code: INVALID_STATUS)
   * @throws {Error} - If forbidden (code: FORBIDDEN)
   */
  async finishWalkInApplication(id, officerId, auditContext = {}) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const application = await Application.findOne({
      $or: isObjectId
        ? [{ applicationId: id }, { _id: id }]
        : [{ applicationId: id }],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (application.applicationStatus !== "officer_draft") {
      const error = new Error(
        "Only officer draft applications can be finished",
      );
      error.code = "INVALID_STATUS";
      error.status = 400;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only finish your own claimed drafts");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Validate that form is complete (basic check - formData should not be empty)
    if (
      !application.formData ||
      Object.keys(application.formData).length === 0
    ) {
      const error = new Error(
        "Application form must be completed before finishing",
      );
      error.code = "FORM_INCOMPLETE";
      error.status = 400;
      throw error;
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

    // Create business from approved application
    const BusinessProfile = require("../../models/BusinessProfile");
    const businessProfile = await BusinessProfile.findOne({
      userId: application.userId,
    });
    if (businessProfile) {
      await businessCreationService.createBusinessFromApplication(
        application,
        businessProfile,
      );
    }

    // Send approval email (fire and forget)
    try {
      await applicationEmailService.sendApplicationEmail(
        application,
        "approved",
      );
    } catch (err) {
      console.error("Failed to send approval email:", err);
    }

    // Log audit event
    await ApplicationAuditHelper.logOfficerDraftFinished(
      auditContext?.req,
      officerId,
      application,
    );

    return { application };
  }
}

module.exports = new WalkInApplicationService();
