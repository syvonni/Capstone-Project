const mongoose = require("mongoose");
const EditRequest = require("../../models/EditRequest");
const BusinessProfile = require("../../models/BusinessProfile");
const { logAuditEvent } = require("../../lib/auditClient");
const { crossClaimForBusiness } = require("../../lib/crossClaimService");

class EditRequestService {
  /**
   * Helper: build query that matches either businessId or subdoc _id
   */
  buildBusinessLookupQuery(identifier) {
    const target = String(identifier || "");
    const clauses = [{ "businesses.businessId": target }];
    if (mongoose.Types.ObjectId.isValid(target)) {
      clauses.push({ "businesses._id": new mongoose.Types.ObjectId(target) });
    }
    return clauses.length === 1 ? clauses[0] : { $or: clauses };
  }

  /**
   * Check if business matches identifier
   */
  isBusinessMatch(business, identifier) {
    const target = String(identifier || "");
    return (
      String(business?.businessId || "") === target ||
      String(business?._id || "") === target
    );
  }

  /**
   * Allowed fields per Appendix K UC-2N-3
   */
  ALLOWED_EDIT_FIELDS = [
    "address",
    "tradeName",
    "businessActivities",
    "capital",
    "contact",
    "businessName",
    "registeredBusinessName",
    "phoneNumber",
    "email",
  ];

  /**
   * Ensure formData object exists
   */
  ensureFormDataObject(business) {
    if (
      !business.formData ||
      typeof business.formData !== "object" ||
      Array.isArray(business.formData)
    ) {
      business.formData = {};
    }
  }

  /**
   * Apply field update to business
   */
  applyFieldUpdateToBusiness(business, fieldName, requestedValue) {
    const normalizedValue =
      typeof requestedValue === "string" ? requestedValue.trim() : requestedValue;
    this.ensureFormDataObject(business);

    switch (fieldName) {
      case "businessName":
        business.businessName = String(normalizedValue || "");
        business.formData.businessName = String(normalizedValue || "");
        business.formData["Business / trade name"] = String(
          normalizedValue || "",
        );
        break;

      case "registeredBusinessName":
        business.registeredBusinessName = String(normalizedValue || "");
        business.formData.registeredBusinessName = String(normalizedValue || "");
        break;

      case "tradeName":
        business.businessTradeName = String(normalizedValue || "");
        business.formData.businessTradeName = String(normalizedValue || "");
        business.formData.tradeName = String(normalizedValue || "");
        break;

      case "address":
        business.businessAddress = String(normalizedValue || "");
        business.formData.businessAddress = String(normalizedValue || "");
        break;

      case "phoneNumber":
        business.mobileNumber = String(normalizedValue || "");
        business.contactNumber = String(normalizedValue || "");
        business.formData.businessPhone = String(normalizedValue || "");
        business.formData.phoneNumber = String(normalizedValue || "");
        break;

      case "email":
        business.emailAddress = String(normalizedValue || "");
        business.formData.businessEmail = String(normalizedValue || "");
        business.formData.email = String(normalizedValue || "");
        break;

      case "businessActivities":
        business.primaryLineOfBusiness = String(normalizedValue || "");
        business.formData.businessActivities = String(normalizedValue || "");
        break;

      case "capital": {
        const numeric = Number(normalizedValue);
        if (Number.isFinite(numeric)) {
          business.declaredCapitalInvestment = numeric;
        }
        business.formData.capital = normalizedValue;
        break;
      }

      case "contact":
        business.ownerFullName = String(normalizedValue || "");
        business.formData.contact = String(normalizedValue || "");
        break;

      default:
        break;
    }
  }

  /**
   * Apply approved edit request to business profile
   */
  async applyApprovedEditRequest(editRequest) {
    let profile = await BusinessProfile.findOne(
      this.buildBusinessLookupQuery(editRequest.businessId),
    );
    if (!profile && editRequest.requestedBy) {
      // Fallback for legacy/migrating records where querying by businesses.businessId may miss.
      profile = await BusinessProfile.findOne({
        userId: editRequest.requestedBy,
      });
    }
    if (!profile) {
      const error = new Error("Business profile not found");
      error.code = "PROFILE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    let businessIndex = profile.businesses.findIndex((b) =>
      this.isBusinessMatch(b, editRequest.businessId),
    );
    if (businessIndex === -1 && profile.businesses.length === 1) {
      // Safe compatibility fallback: older edit requests may have stale IDs; if owner only has
      // one business, apply the change there.
      businessIndex = 0;
    }

    if (businessIndex === -1) {
      const error = new Error("Business not found in profile");
      error.code = "BUSINESS_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const business = profile.businesses[businessIndex];
    this.applyFieldUpdateToBusiness(
      business,
      editRequest.fieldName,
      editRequest.requestedValue,
    );
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    return business;
  }

  /**
   * List edit requests
   */
  async list(userId, userRole, query) {
    const { page = 1, limit = 20 } = query;
    let filter = {};
    if (userRole !== "staff" && userRole === "business_owner") {
      filter.requestedBy = userId;
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      EditRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      EditRequest.countDocuments(filter),
    ]);

    // Populate businessName from BusinessProfile for each edit request
    // NOTE: Do NOT use .lean() here — we need Mongoose decryption hooks to fire
    const businessIds = [
      ...new Set(requests.map((r) => r.businessId).filter(Boolean)),
    ];
    const profiles =
      businessIds.length > 0
        ? await BusinessProfile.find({
            $or: businessIds.flatMap((id) => {
              const clauses = [{ "businesses.businessId": id }];
              if (mongoose.Types.ObjectId.isValid(id)) {
                clauses.push({
                  "businesses._id": new mongoose.Types.ObjectId(id),
                });
              }
              return clauses;
            }),
          })
        : [];

    // Build businessId -> { name, subdocId, businessId } map for alias resolution
    const businessInfoMap = new Map();
    for (const profile of profiles) {
      for (const biz of profile.businesses || []) {
        const bizId = biz.businessId || String(biz._id);
        const subdocId = String(biz._id || "");
        const name =
          biz.businessName ||
          biz.registeredBusinessName ||
          biz.formData?.businessName;
        const info = { name, subdocId, businessId: biz.businessId || "" };
        if (!businessInfoMap.has(bizId)) businessInfoMap.set(bizId, info);
        if (subdocId && !businessInfoMap.has(subdocId))
          businessInfoMap.set(subdocId, info);
      }
    }

    // Attach businessName and _businessSubdocId to each edit request
    const enrichedRequests = requests.map((req) => {
      const info =
        businessInfoMap.get(req.businessId) ||
        businessInfoMap.get(String(req.businessId));
      return {
        ...req,
        businessName: info?.name || null,
        _businessSubdocId: info?.subdocId || null,
        _canonicalBusinessId: info?.businessId || null,
      };
    });

    return {
      data: enrichedRequests,
      meta: { page: Number(page), limit: Number(limit), total },
    };
  }

  /**
   * Create edit request
   */
  async create(userId, editRequestData) {
    const {
      businessId,
      fieldName,
      currentValue,
      requestedValue,
      reason,
      supportingDocuments,
    } = editRequestData;

    if (!businessId || !fieldName || !requestedValue) {
      const error = new Error("businessId, fieldName, and requestedValue are required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Reject if new value is identical to current value
    if (
      currentValue !== undefined &&
      String(requestedValue).trim() === String(currentValue).trim()
    ) {
      const error = new Error("The requested value is the same as the current value");
      error.code = "IDENTICAL_VALUE";
      error.status = 400;
      throw error;
    }

    // Edge case UC-2N-3: Validate allowed fields
    if (!this.ALLOWED_EDIT_FIELDS.includes(fieldName)) {
      const error = new Error(
        `Field "${fieldName}" is not editable. Allowed fields: ${this.ALLOWED_EDIT_FIELDS.join(", ")}`,
      );
      error.code = "FIELD_NOT_EDITABLE";
      error.status = 400;
      throw error;
    }

    // Resolve and normalize business identifier against the requester's own profile.
    // This prevents orphaned edit requests caused by stale/transient IDs.
    const requesterProfile = await BusinessProfile.findOne({
      userId,
    });
    if (!requesterProfile) {
      const error = new Error("Business profile not found for requesting user");
      error.code = "PROFILE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const targetBusiness = requesterProfile.businesses.find((b) =>
      this.isBusinessMatch(b, businessId),
    );
    if (!targetBusiness) {
      const error = new Error("Business not found in requester profile");
      error.code = "BUSINESS_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const normalizedBusinessId = String(
      targetBusiness.businessId || targetBusiness._id || "",
    );
    if (!normalizedBusinessId) {
      const error = new Error("Could not resolve a valid business identifier");
      error.code = "INVALID_BUSINESS_ID";
      error.status = 400;
      throw error;
    }

    // Edge case UC-2N-6: Block duplicate pending EditRequest for same field
    const existingPending = await EditRequest.findOne({
      businessId: normalizedBusinessId,
      fieldName,
      status: "pending",
    });
    if (existingPending) {
      const error = new Error(
        `A pending edit request already exists for field "${fieldName}" on this business`,
      );
      error.code = "DUPLICATE_EDIT_REQUEST";
      error.status = 409;
      throw error;
    }

    // Auto-assign to claiming officer if the business already has one
    let claimingOfficerId = null;
    if (targetBusiness?.reviewedBy) {
      claimingOfficerId = targetBusiness.reviewedBy;
    }

    const editRequest = await EditRequest.create({
      businessId: normalizedBusinessId,
      requestedBy: userId,
      fieldName,
      currentValue: currentValue || "",
      requestedValue,
      reason: reason || "",
      supportingDocuments: supportingDocuments || [],
      status: "pending",
      ...(claimingOfficerId ? { reviewedBy: claimingOfficerId } : {}),
    });

    // Log audit event
    await logAuditEvent(
      "edit_request_submitted",
      userId,
      "EditRequest",
      editRequest._id.toString(),
      {
        businessId: normalizedBusinessId,
        businessName: targetBusiness?.businessName,
        fieldName,
        applicationReferenceNumber: targetBusiness?.applicationReferenceNumber,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return editRequest;
  }

  /**
   * Update edit request (approve/reject)
   */
  async update(id, userId, userRole, updateData) {
    const { status, reviewNotes } = updateData;
    const validStatuses = ["approved", "rejected"];
    
    if (status && !validStatuses.includes(status)) {
      const error = new Error(`Status must be one of: ${validStatuses.join(", ")}`);
      error.code = "INVALID_STATUS";
      error.status = 400;
      throw error;
    }

    const editRequest = await EditRequest.findById(id);
    if (!editRequest) {
      const error = new Error("Edit request not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const isManagerOrAdmin = userRole === "admin";
    if (
      editRequest.reviewedBy &&
      String(editRequest.reviewedBy) !== String(userId) &&
      !isManagerOrAdmin
    ) {
      const error = new Error("Only the claiming officer can review this edit request");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Cannot update already resolved requests
    if (
      editRequest.status === "approved" ||
      editRequest.status === "rejected"
    ) {
      const error = new Error("This edit request has already been resolved");
      error.code = "ALREADY_RESOLVED";
      error.status = 400;
      throw error;
    }

    if (
      status === "approved" &&
      editRequest.fieldName &&
      editRequest.requestedValue !== undefined
    ) {
      try {
        await this.applyApprovedEditRequest(editRequest);
      } catch (applyErr) {
        console.error(
          "Failed to apply approved edit to BusinessProfile:",
          applyErr,
        );
        const isNotFound = /not found/i.test(String(applyErr?.message || ""));
        const error = new Error(
          isNotFound
            ? "Business record for this edit request could not be found"
            : "Failed to apply approved edit request",
        );
        error.code = isNotFound ? "BUSINESS_NOT_FOUND" : "APPLY_FAILED";
        error.status = isNotFound ? 404 : 500;
        throw error;
      }
    }

    if (status) {
      editRequest.status = status;
      editRequest.reviewedBy = userId;
      editRequest.reviewNotes = reviewNotes || "";
      editRequest.resolvedAt = new Date();
    }
    await editRequest.save();

    // When approved, log the application of the change
    if (
      status === "approved" &&
      editRequest.fieldName &&
      editRequest.requestedValue !== undefined
    ) {
      await logAuditEvent(
        "edit_request_applied",
        userId,
        "BusinessProfile",
        editRequest.businessId,
        {
          businessId: editRequest.businessId,
          businessName: editRequest.businessName,
          fieldName: editRequest.fieldName,
          previousValue: editRequest.currentValue,
          newValue: editRequest.requestedValue,
          editRequestId: editRequest._id.toString(),
          applicationReferenceNumber: editRequest.applicationReferenceNumber,
        },
      ).catch((err) => console.error("Failed to log audit event:", err));
    }

    return editRequest;
  }

  /**
   * Claim edit request
   */
  async claim(id, userId) {
    const editRequest = await EditRequest.findById(id);
    if (!editRequest) {
      const error = new Error("Edit request not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (
      editRequest.status === "approved" ||
      editRequest.status === "rejected"
    ) {
      const error = new Error("Cannot claim a resolved edit request");
      error.code = "ALREADY_RESOLVED";
      error.status = 400;
      throw error;
    }

    if (
      editRequest.reviewedBy &&
      String(editRequest.reviewedBy) !== String(userId)
    ) {
      const error = new Error("Edit request is already claimed by another officer");
      error.code = "ALREADY_CLAIMED";
      error.status = 409;
      throw error;
    }

    editRequest.reviewedBy = userId;
    await editRequest.save();

    // Cross-claim all other requests for this business
    await crossClaimForBusiness(editRequest.businessId, userId, {
      skipModel: "EditRequest",
      skipId: editRequest._id,
    }).catch((err) => {
      console.error("Cross-claim failed for edit request:", err);
    });

    // Log audit event
    await logAuditEvent(
      "edit_request_claimed",
      userId,
      "EditRequest",
      editRequest._id.toString(),
      { businessId: editRequest.businessId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return editRequest;
  }

  /**
   * Release edit request
   */
  async release(id, userId, userRole) {
    const editRequest = await EditRequest.findById(id);
    if (!editRequest) {
      const error = new Error("Edit request not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const isManagerOrAdmin = userRole === "admin";
    if (
      editRequest.reviewedBy &&
      String(editRequest.reviewedBy) !== String(userId) &&
      !isManagerOrAdmin
    ) {
      const error = new Error("Only the claiming officer can release this edit request");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    editRequest.reviewedBy = null;
    await editRequest.save();

    // Cross-release all other requests for this business
    await crossClaimForBusiness(editRequest.businessId, null, {
      skipModel: "EditRequest",
      skipId: editRequest._id,
    }).catch((err) => {
      console.error("Cross-release failed for edit request:", err);
    });

    // Log audit event
    await logAuditEvent(
      "edit_request_released",
      userId,
      "EditRequest",
      editRequest._id.toString(),
      { businessId: editRequest.businessId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return editRequest;
  }

  /**
   * Transfer edit request
   */
  async transfer(id, userId, userRole, targetOfficerId) {
    if (!targetOfficerId) {
      const error = new Error("targetOfficerId is required");
      error.code = "MISSING_TARGET";
      error.status = 400;
      throw error;
    }

    const editRequest = await EditRequest.findById(id);
    if (!editRequest) {
      const error = new Error("Edit request not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const isManagerOrAdmin = userRole === "admin";
    if (
      editRequest.reviewedBy &&
      String(editRequest.reviewedBy) !== String(userId) &&
      !isManagerOrAdmin
    ) {
      const error = new Error("Only the claiming officer can transfer this edit request");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    editRequest.reviewedBy = targetOfficerId;
    await editRequest.save();

    // Cross-transfer all other requests for this business
    await crossClaimForBusiness(editRequest.businessId, targetOfficerId, {
      skipModel: "EditRequest",
      skipId: editRequest._id,
    }).catch((err) => {
      console.error("Cross-transfer failed for edit request:", err);
    });

    // Log audit event
    await logAuditEvent(
      "edit_request_transferred",
      userId,
      "EditRequest",
      editRequest._id.toString(),
      {
        businessId: editRequest.businessId,
        fromOfficerId: userId,
        toOfficerId: targetOfficerId,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return editRequest;
  }
}

module.exports = new EditRequestService();
