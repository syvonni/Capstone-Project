/**
 * Permit Application Service
 *
 * PURPOSE: Handles all business logic for LGU Officer permit application operations.
 * Extracts business logic from routes/lgu-officer/permitApplications.routes.js
 *
 * METHODS:
 * - listApplications: List permit applications with filters
 * - getApplicationById: Get single application by ID (supports applicationId and _id)
 * - startReview: Claim an application for review
 * - reviewApplication: Review and approve/reject an application
 * - claimApplication: Claim a permit application for review
 * - releaseApplication: Release a claimed application
 * - resetApplicationStatus: Reset application status
 * - updateFieldDecisions: Update field-level review decisions
 * - updateFormData: Update application form data
 * - deleteApplication: Delete an application (for officer drafts)
 * - resendEmail: Resend application email
 * - resetEmailStatus: Reset email send status
 *
 * USAGE EXAMPLE:
 * const permitApplicationService = require('../services/lgu-officer/permitApplication.service');
 * const result = await permitApplicationService.listApplications({ status: 'submitted', page: 1, limit: 50 });
 */

const Application = require("../../models/Application");
const Business = require("../../models/Business");
const BusinessProfile = require("../../models/BusinessProfile");
const GeneralPermit = require("../../models/GeneralPermit");
const User = require("../../models/User");
const { logAuditEvent } = require("../../lib/auditClient");
const applicationEmailService = require("./applicationEmail.service");
const businessCreationService = require("./businessCreation.service");
const pendingActionService = require("./pendingAction.service");

class PermitApplicationService {
  /**
   * Helper to enrich application with owner name and map documents
   *
   * @param {object} application - Application document
   * @returns {Promise<object>} - Enriched application
   */
  async enrichApplication(application) {
    const app = application.toObject ? application.toObject() : application;

    // Handle GeneralPermit-specific field mapping
    if (application.constructor.modelName === "GeneralPermit") {
      app.formType = "general_permit";
      app.applicationStatus = application.status;
      app.userId = application.applicantId;
      app.businessName = application.permitCategory;
      app.category = application.permitCategory;
      app.formData = {
        permitCategory: application.permitCategory,
        businessPlateNo: application.businessPlateNo,
        requirements: application.requirements,
      };
    }

    // Enrich with owner's full name
    const ownerId = app.userId || app.ownerId || app.applicantId;
    if (ownerId) {
      try {
        const owner = await User.findById(ownerId)
          .select("firstName lastName email")
          .lean();
        if (owner) {
          app.ownerName =
            `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
            owner.email ||
            "N/A";
          app.ownerEmail = owner.email;
        }
      } catch (e) {
        // Non-fatal: owner lookup failure shouldn't block the response
      }
    }

    // Map lguDocuments to documents for frontend compatibility
    if (!app.lguDocuments) {
      app.lguDocuments = {};
    }

    // Try to extract document CIDs from formData if lguDocuments is empty
    if (Object.keys(app.lguDocuments).length === 0 && app.formData) {
      const docFields = [
        "ownerGovernmentId",
        "barangayClearance",
        "dtiSecCdaCertificate",
        "leaseContractOrTitle",
        "ctcCedula",
        "occupancyPermit",
      ];
      for (const field of docFields) {
        if (app.formData[field]) {
          app.lguDocuments[`${field}IpfsCid`] = app.formData[field];
        }
      }
    }

    if (app.lguDocuments && !app.documents) {
      app.documents = app.lguDocuments;
    }

    // Map lguDocuments fields to match form definition keys
    if (app.lguDocuments) {
      const keyMapping = {
        ownerGovernmentIdIpfsCid: "ownerGovernmentId",
        barangayClearanceIpfsCid: "barangayClearance",
        dtiSecCdaCertificateIpfsCid: "dtiSecCdaCertificate",
        leaseContractOrTitleIpfsCid: "leaseContractOrTitle",
        ctcCedulaIpfsCid: "ctcCedula",
        occupancyPermitIpfsCid: "occupancyPermit",
      };
      for (const [ipfsKey, baseKey] of Object.entries(keyMapping)) {
        if (app.lguDocuments[ipfsKey] && !app.documents[baseKey]) {
          app.documents[baseKey] = app.lguDocuments[ipfsKey];
        }
      }
    }

    return app;
  }

  /**
   * Find document across Application, Business, and GeneralPermit collections
   *
   * @param {string} id - Document ID
   * @returns {Promise<object|null>} - Document or null
   */
  async findDocument(id) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Try Application collection
    let doc = await Application.findOne({
      $or: isObjectId ? [{ applicationId: id }, { _id: id }] : [{ applicationId: id }],
    });

    // Try Business collection
    if (!doc) {
      doc = await Business.findOne({
        $or: isObjectId ? [{ businessId: id }, { _id: id }] : [{ businessId: id }],
      });
    }

    // Try GeneralPermit collection
    if (!doc && isObjectId) {
      doc = await GeneralPermit.findOne({ _id: id });
    }

    return doc;
  }

  /**
   * List permit applications with filters (includes both Application and GeneralPermit)
   *
   * @param {object} filters - Query filters
   * @param {string} filters.status - Application status (supports comma-separated)
   * @param {string} filters.reviewedBy - Officer ID who reviewed
   * @param {number} filters.page - Page number (default 1)
   * @param {number} filters.limit - Items per page (default 50)
   * @returns {Promise<object>} - Applications with metadata
   */
  async listApplications(filters = {}) {
    const { status, reviewedBy, page = 1, limit = 50 } = filters;

    const filter = {};
    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
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
    const permitFilter = {};
    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
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

    return {
      applications: mergedApplications,
      meta: {
        total: total + permitTotal,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((total + permitTotal) / parseInt(limit)),
      },
    };
  }

  /**
   * Get single application by ID (includes GeneralPermit)
   *
   * @param {string} id - Application ID (supports both applicationId and _id)
   * @returns {Promise<object>} - Application document
   * @throws {Error} - If application not found (code: NOT_FOUND)
   */
  async getApplicationById(id) {
    const doc = await this.findDocument(id);

    if (!doc) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return await this.enrichApplication(doc);
  }

  /**
   * Start review - Claim an application for review
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @returns {Promise<object>} - Updated application with lockedByOfficer flag
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If already claimed (code: ALREADY_CLAIMED)
   */
  async startReview(id, officerId) {
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

    if (application.reviewedBy) {
      const error = new Error("Application already claimed");
      error.code = "ALREADY_CLAIMED";
      error.status = 400;
      throw error;
    }

    // Fetch officer name
    const officer = await User.findById(officerId).select("firstName lastName");
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

    return {
      application,
      lockedByOfficer: true,
    };
  }

  /**
   * Review and approve/reject an application
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @param {object} reviewData - Review data
   * @param {string} reviewData.decision - Decision: approved, rejected, returned
   * @param {string} reviewData.comments - Review comments
   * @param {string} reviewData.rejectionReason - Rejection reason
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If forbidden (code: FORBIDDEN)
   */
  async reviewApplication(id, officerId, reviewData) {
    const { decision, comments, rejectionReason } = reviewData;
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

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only review applications you have claimed");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Update application based on decision
    if (decision === "approved") {
      application.applicationStatus = "approved";
      application.reviewComments = comments;
      application.reviewedAt = new Date();

      // Generate application reference number if not set
      if (!application.applicationReferenceNumber) {
        application.applicationReferenceNumber =
          `REF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
      }

      await application.save();

      // Create business from approved application
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
      applicationEmailService
        .sendApplicationEmail(application, "approved")
        .catch((err) => console.error("Failed to send approval email:", err));
    } else if (decision === "rejected") {
      application.applicationStatus = "rejected";
      application.rejectionReason = rejectionReason || comments;
      application.reviewedAt = new Date();

      await application.save();

      // Send rejection email (fire and forget)
      applicationEmailService
        .sendApplicationEmail(application, "rejected", { rejectionReason })
        .catch((err) => console.error("Failed to send rejection email:", err));
    } else if (decision === "returned") {
      application.applicationStatus = "returned";
      application.reviewComments = comments;
      application.reviewedAt = new Date();

      await application.save();

      // Send returned email (fire and forget)
      applicationEmailService
        .sendApplicationEmail(application, "returned", { reviewComments: comments })
        .catch((err) => console.error("Failed to send returned email:", err));
    } else {
      const error = new Error("Invalid decision");
      error.code = "INVALID_DECISION";
      error.status = 400;
      throw error;
    }

    // Log audit event
    await logAuditEvent(
      "application_reviewed",
      officerId,
      "application",
      application.applicationId,
      {
        applicationId: application.applicationId,
        decision,
        comments,
        rejectionReason,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return application;
  }

  /**
   * Claim a permit application for review
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @param {boolean} force - Force claim even if already claimed
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If already claimed and not forced (code: ALREADY_CLAIMED)
   */
  async claimApplication(id, officerId, force = false) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Find application in Application collection
    let application = await Application.findOne({
      $or: isObjectId ? [{ applicationId: id }, { _id: id }] : [{ applicationId: id }],
    });

    // If not found in Application, check Business collection
    if (!application) {
      application = await Business.findOne({
        $or: isObjectId ? [{ businessId: id }, { _id: id }] : [{ businessId: id }],
      });
    }

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Fetch officer name
    const officer = await User.findById(officerId).select("firstName lastName");
    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`.trim()
      : "Officer";

    // Set reviewer and transition to under_review if currently submitted
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
    const atomicCondition =
      force === "true"
        ? {}
        : { $or: [{ reviewedBy: null }, { reviewedBy: officerId }] };

    let updated;
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
    }

    if (!updated) {
      const error = new Error("Application already claimed by another officer");
      error.code = "ALREADY_CLAIMED";
      error.status = 409;
      throw error;
    }

    // Log audit event
    await logAuditEvent(
      "application_claimed",
      officerId,
      updated.constructor.modelName,
      updated.applicationId || updated.businessId,
      {
        applicationId: updated.applicationId || updated.businessId,
        officerName,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return updated;
  }

  /**
   * Release a claimed application
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If forbidden (code: FORBIDDEN)
   */
  async releaseApplication(id, officerId) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Find application in Application collection
    let application = await Application.findOne({
      $or: isObjectId ? [{ applicationId: id }, { _id: id }] : [{ applicationId: id }],
    });

    // If not found in Application, check Business collection
    if (!application) {
      application = await Business.findOne({
        $or: isObjectId ? [{ businessId: id }, { _id: id }] : [{ businessId: id }],
      });
    }

    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only release applications you have claimed");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const updateData = {
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      updatedAt: new Date(),
    };

    // If status is under_review, revert to submitted
    if (application.applicationStatus === "under_review") {
      updateData.applicationStatus = "submitted";
    }

    let updated;
    if (application.constructor.modelName === "Application") {
      updated = await Application.findByIdAndUpdate(
        application._id,
        { $set: updateData },
        { new: true },
      );
    } else {
      updated = await Business.findByIdAndUpdate(
        application._id,
        { $set: updateData },
        { new: true },
      );
    }

    // Log audit event
    await logAuditEvent(
      "application_released",
      officerId,
      updated.constructor.modelName,
      updated.applicationId || updated.businessId,
      {
        applicationId: updated.applicationId || updated.businessId,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return updated;
  }

  /**
   * Reset application status
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @param {string} newStatus - New status
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   */
  async resetApplicationStatus(id, officerId, newStatus) {
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

    application.applicationStatus = newStatus;
    application.updatedAt = new Date();
    await application.save();

    // Log audit event
    await logAuditEvent(
      "application_status_reset",
      officerId,
      "application",
      application.applicationId,
      {
        applicationId: application.applicationId,
        newStatus,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return application;
  }

  /**
   * Update field-level review decisions
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @param {object} decisionsData - Field decisions data
   * @param {string} decisionsData.fieldKey - Field key (for single decision)
   * @param {string} decisionsData.status - Decision status: accepted, request_changes
   * @param {string} decisionsData.reasonCode - Reason code
   * @param {string} decisionsData.reasonOther - Other reason
   * @param {array} decisionsData.decisions - Batch decisions array
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   */
  async updateFieldDecisions(id, officerId, decisionsData) {
    const {
      fieldKey,
      status,
      reasonCode,
      reasonOther,
      decisions,
    } = decisionsData;

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
      const error = new Error("fieldKey and status, or decisions array, required");
      error.code = "MISSING_DATA";
      error.status = 400;
      throw error;
    }

    // Find application in Application collection
    let doc = await Application.findOne({
      $or: /^[0-9a-fA-F]{24}$/.test(id)
        ? [{ applicationId: id }, { _id: id }]
        : [{ applicationId: id }],
    });

    // If not found in Application, check Business collection
    if (!doc) {
      doc = await Business.findOne({
        $or: /^[0-9a-fA-F]{24}$/.test(id)
          ? [{ businessId: id }, { _id: id }]
          : [{ businessId: id }],
      });
    }

    if (!doc) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Fetch officer name for audit trail
    const officer = await User.findById(officerId).select("firstName lastName");
    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`.trim()
      : "Officer";

    // Get existing fieldReviewDecisions as object
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
          reasonCode:
            decisionStatus === "request_changes"
              ? itemReasonCode || requestCode || null
              : undefined,
          reasonOther:
            decisionStatus === "request_changes"
              ? itemReasonOther || requestOther || null
              : undefined,
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
    const updatedApplication = await (doc.constructor.modelName === "Application"
      ? Application.findById(doc._id)
      : Business.findById(doc._id));

    return await this.enrichApplication(updatedApplication);
  }

  /**
   * Update application form data
   *
   * @param {string} id - Application ID
   * @param {object} formDataUpdate - Form data updates
   * @param {object} documentCids - Document CIDs updates
   * @param {array} businessActivities - Business activities updates
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   */
  async updateFormData(id, formDataUpdate, documentCids, businessActivities) {
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

    // Update formData if provided
    if (formDataUpdate && typeof formDataUpdate === "object") {
      if (!application.formData) application.formData = {};
      Object.assign(application.formData, formDataUpdate);
      application.markModified("formData");
    }

    // Update businessActivities if provided
    if (businessActivities) {
      application.formData.businessActivities = businessActivities;
    }

    // Update document CIDs if provided
    if (documentCids && typeof documentCids === "object") {
      if (!application.lguDocuments) application.lguDocuments = {};
      Object.assign(application.lguDocuments, documentCids);
      application.markModified("lguDocuments");
    }

    await application.save();

    return { application };
  }

  /**
   * Delete an application (for officer drafts)
   *
   * @param {string} id - Application ID
   * @param {string} officerId - Officer ID
   * @returns {Promise<object>} - Deletion result
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If invalid status (code: INVALID_STATUS)
   * @throws {Error} - If forbidden (code: FORBIDDEN)
   */
  async deleteApplication(id, officerId) {
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

    // Only allow deletion of officer drafts by the officer who created them
    if (application.applicationStatus !== "officer_draft") {
      const error = new Error("Only officer draft applications can be deleted");
      error.code = "INVALID_STATUS";
      error.status = 400;
      throw error;
    }

    if (String(application.reviewedBy) !== String(officerId)) {
      const error = new Error("You can only delete your own drafts");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
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

    return { message: "Application deleted successfully" };
  }

  /**
   * Resend application email
   *
   * @param {string} id - Application ID
   * @param {string} emailType - Email type: submitted, approved, rejected, returned
   * @param {string} officerId - Officer ID
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   * @throws {Error} - If invalid email type (code: INVALID_DATA)
   */
  async resendEmail(id, emailType, officerId) {
    if (
      !emailType ||
      !["submitted", "approved", "rejected", "returned"].includes(emailType)
    ) {
      const error = new Error("Invalid email type");
      error.code = "INVALID_DATA";
      error.status = 400;
      throw error;
    }

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

    // Send email (fire and forget)
    await applicationEmailService.sendApplicationEmail(application, emailType);

    // Log audit event
    await logAuditEvent(
      "email_resent",
      officerId,
      "application",
      application.applicationId,
      {
        applicationId: application.applicationId,
        emailType,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { application };
  }

  /**
   * Reset email send status
   *
   * @param {string} id - Application ID
   * @param {string} emailType - Email type to reset
   * @param {string} officerId - Officer ID
   * @returns {Promise<object>} - Updated application
   * @throws {Error} - If application not found (code: NOT_FOUND)
   */
  async resetEmailStatus(id, emailType, officerId) {
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

    // Reset email status
    await Application.updateOne(
      { _id: application._id },
      {
        $set: {
          [`emailSendStatus.${emailType}`]: {
            status: "pending",
            retryCount: 0,
            lastAttempt: null,
            lockUntil: null,
          },
        },
      },
    );

    // Log audit event
    await logAuditEvent(
      "email_status_reset",
      officerId,
      "application",
      application.applicationId,
      {
        applicationId: application.applicationId,
        emailType,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return { application };
  }
}

module.exports = new PermitApplicationService();
