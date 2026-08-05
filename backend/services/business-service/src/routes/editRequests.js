const express = require("express");
const mongoose = require("mongoose");
const EditRequest = require("../models/EditRequest");
const BusinessProfile = require("../models/BusinessProfile");
const { requireJwt, requireRole } = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { crossClaimForBusiness } = require("../lib/crossClaimService");

const router = express.Router();

// Helper: build query that matches either businessId or subdoc _id
function buildBusinessLookupQuery(identifier) {
  const target = String(identifier || "");
  const clauses = [{ "businesses.businessId": target }];
  if (mongoose.Types.ObjectId.isValid(target)) {
    clauses.push({ "businesses._id": new mongoose.Types.ObjectId(target) });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function isBusinessMatch(business, identifier) {
  const target = String(identifier || "");
  return (
    String(business?.businessId || "") === target ||
    String(business?._id || "") === target
  );
}

// Allowed fields per Appendix K UC-2N-3
const ALLOWED_EDIT_FIELDS = [
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

function ensureFormDataObject(business) {
  if (
    !business.formData ||
    typeof business.formData !== "object" ||
    Array.isArray(business.formData)
  ) {
    business.formData = {};
  }
}

function applyFieldUpdateToBusiness(business, fieldName, requestedValue) {
  const normalizedValue =
    typeof requestedValue === "string" ? requestedValue.trim() : requestedValue;
  ensureFormDataObject(business);

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

async function applyApprovedEditRequest(editRequest) {
  let profile = await BusinessProfile.findOne(
    buildBusinessLookupQuery(editRequest.businessId),
  );
  if (!profile && editRequest.requestedBy) {
    // Fallback for legacy/migrating records where querying by businesses.businessId may miss.
    profile = await BusinessProfile.findOne({
      userId: editRequest.requestedBy,
    });
  }
  if (!profile) {
    throw new Error("Business profile not found");
  }

  let businessIndex = profile.businesses.findIndex((b) =>
    isBusinessMatch(b, editRequest.businessId),
  );
  if (businessIndex === -1 && profile.businesses.length === 1) {
    // Safe compatibility fallback: older edit requests may have stale IDs; if owner only has
    // one business, apply the change there.
    businessIndex = 0;
  }

  if (businessIndex === -1) {
    throw new Error("Business not found in profile");
  }

  const business = profile.businesses[businessIndex];
  applyFieldUpdateToBusiness(
    business,
    editRequest.fieldName,
    editRequest.requestedValue,
  );
  business.updatedAt = new Date();

  profile.markModified("businesses");
  await profile.save();

  return business;
}

// GET /api/business/edit-requests
router.get("/", requireJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    let filter = {};
    if (role !== "staff" && req._userRole === "business_owner") {
      filter.requestedBy = req._userId;
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

    return res.json({
      data: enrichedRequests,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("GET /edit-requests error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch edit requests" },
    });
  }
});

// POST /api/business/edit-requests — submit
router.post("/", requireJwt, async (req, res) => {
  try {
    const {
      businessId,
      fieldName,
      currentValue,
      requestedValue,
      reason,
      supportingDocuments,
    } = req.body;
    if (!businessId || !fieldName || !requestedValue) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "businessId, fieldName, and requestedValue are required",
        },
      });
    }

    // Reject if new value is identical to current value
    if (
      currentValue !== undefined &&
      String(requestedValue).trim() === String(currentValue).trim()
    ) {
      return res.status(400).json({
        error: {
          code: "IDENTICAL_VALUE",
          message: "The requested value is the same as the current value",
        },
      });
    }

    // Edge case UC-2N-3: Validate allowed fields
    if (!ALLOWED_EDIT_FIELDS.includes(fieldName)) {
      return res.status(400).json({
        error: {
          code: "FIELD_NOT_EDITABLE",
          message: `Field "${fieldName}" is not editable. Allowed fields: ${ALLOWED_EDIT_FIELDS.join(", ")}`,
        },
      });
    }

    // Resolve and normalize business identifier against the requester's own profile.
    // This prevents orphaned edit requests caused by stale/transient IDs.
    const requesterProfile = await BusinessProfile.findOne({
      userId: req._userId,
    });
    if (!requesterProfile) {
      return res.status(404).json({
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "Business profile not found for requesting user",
        },
      });
    }

    const targetBusiness = requesterProfile.businesses.find((b) =>
      isBusinessMatch(b, businessId),
    );
    if (!targetBusiness) {
      return res.status(404).json({
        error: {
          code: "BUSINESS_NOT_FOUND",
          message: "Business not found in requester profile",
        },
      });
    }

    const normalizedBusinessId = String(
      targetBusiness.businessId || targetBusiness._id || "",
    );
    if (!normalizedBusinessId) {
      return res.status(400).json({
        error: {
          code: "INVALID_BUSINESS_ID",
          message: "Could not resolve a valid business identifier",
        },
      });
    }

    // Edge case UC-2N-6: Block duplicate pending EditRequest for same field
    const existingPending = await EditRequest.findOne({
      businessId: normalizedBusinessId,
      fieldName,
      status: "pending",
    });
    if (existingPending) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EDIT_REQUEST",
          message: `A pending edit request already exists for field "${fieldName}" on this business`,
        },
      });
    }

    // Auto-assign to claiming officer if the business already has one
    let claimingOfficerId = null;
    if (targetBusiness?.reviewedBy) {
      claimingOfficerId = targetBusiness.reviewedBy;
    }

    const editRequest = await EditRequest.create({
      businessId: normalizedBusinessId,
      requestedBy: req._userId,
      fieldName,
      currentValue: currentValue || "",
      requestedValue,
      reason: reason || "",
      supportingDocuments: supportingDocuments || [],
      status: "pending",
      ...(claimingOfficerId ? { reviewedBy: claimingOfficerId } : {}),
    });
    logAuditEvent(
      "edit_request_submitted",
      req._userId,
      "EditRequest",
      editRequest._id.toString(),
      {
        businessId: normalizedBusinessId,
        businessName: business?.businessName,
        fieldName,
        applicationReferenceNumber: business?.applicationReferenceNumber,
      },
    );
    return res.status(201).json({ data: editRequest });
  } catch (err) {
    console.error("POST /edit-requests error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to create edit request" },
    });
  }
});

// PUT /api/business/edit-requests/:id — approve / reject (officer)
router.put(
  "/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const editRequest = await EditRequest.findById(req.params.id);
      if (!editRequest) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Edit request not found" },
        });
      }

      const userRole = req._userRole;
      const isManagerOrAdmin = userRole === "admin";
      if (
        editRequest.reviewedBy &&
        String(editRequest.reviewedBy) !== String(req._userId) &&
        !isManagerOrAdmin
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only the claiming officer can review this edit request",
          },
        });
      }

      // Cannot update already resolved requests
      if (
        editRequest.status === "approved" ||
        editRequest.status === "rejected"
      ) {
        return res.status(400).json({
          error: {
            code: "ALREADY_RESOLVED",
            message: "This edit request has already been resolved",
          },
        });
      }

      const { status, reviewNotes } = req.body;
      const validStatuses = ["approved", "rejected"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: "INVALID_STATUS",
            message: `Status must be one of: ${validStatuses.join(", ")}`,
          },
        });
      }

      if (
        status === "approved" &&
        editRequest.fieldName &&
        editRequest.requestedValue !== undefined
      ) {
        try {
          await applyApprovedEditRequest(editRequest);
        } catch (applyErr) {
          console.error(
            "Failed to apply approved edit to BusinessProfile:",
            applyErr,
          );
          const isNotFound = /not found/i.test(String(applyErr?.message || ""));
          return res.status(isNotFound ? 404 : 500).json({
            error: {
              code: isNotFound ? "BUSINESS_NOT_FOUND" : "APPLY_FAILED",
              message: isNotFound
                ? "Business record for this edit request could not be found"
                : "Failed to apply approved edit request",
            },
          });
        }
      }

      if (status) {
        editRequest.status = status;
        editRequest.reviewedBy = req._userId;
        editRequest.reviewNotes = reviewNotes || "";
        editRequest.resolvedAt = new Date();
      }
      await editRequest.save();

      // When approved, apply the change to the actual BusinessProfile
      if (
        status === "approved" &&
        editRequest.fieldName &&
        editRequest.requestedValue !== undefined
      ) {
        logAuditEvent(
          "edit_request_applied",
          req._userId,
          "BusinessProfile",
          editRequest.businessId,
          {
            businessId: editRequest.businessId,
            businessName: business?.businessName,
            fieldName: editRequest.fieldName,
            previousValue: editRequest.currentValue,
            newValue: editRequest.requestedValue,
            editRequestId: editRequest._id.toString(),
            applicationReferenceNumber: business?.applicationReferenceNumber,
          },
        );
      }

      return res.json({ data: editRequest });
    } catch (err) {
      console.error("PUT /edit-requests error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to update edit request" },
      });
    }
  },
);

// PUT /api/business/edit-requests/:id/claim
router.put(
  "/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const editRequest = await EditRequest.findById(req.params.id);
      if (!editRequest) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Edit request not found" },
        });
      }

      if (
        editRequest.status === "approved" ||
        editRequest.status === "rejected"
      ) {
        return res.status(400).json({
          error: {
            code: "ALREADY_RESOLVED",
            message: "Cannot claim a resolved edit request",
          },
        });
      }

      if (
        editRequest.reviewedBy &&
        String(editRequest.reviewedBy) !== String(req._userId)
      ) {
        return res.status(409).json({
          error: {
            code: "ALREADY_CLAIMED",
            message: "Edit request is already claimed by another officer",
          },
        });
      }

      editRequest.reviewedBy = req._userId;
      await editRequest.save();

      // Cross-claim all other requests for this business
      await crossClaimForBusiness(editRequest.businessId, req._userId, {
        skipModel: "EditRequest",
        skipId: editRequest._id,
      });

      return res.json({ success: true, application: editRequest });
    } catch (err) {
      console.error("PUT /edit-requests/:id/claim error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to claim edit request" },
      });
    }
  },
);

// PUT /api/business/edit-requests/:id/release
router.put(
  "/:id/release",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const editRequest = await EditRequest.findById(req.params.id);
      if (!editRequest) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Edit request not found" },
        });
      }

      const userRole = req._userRole;
      const isManagerOrAdmin = userRole === "admin";
      if (
        editRequest.reviewedBy &&
        String(editRequest.reviewedBy) !== String(req._userId) &&
        !isManagerOrAdmin
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only the claiming officer can release this edit request",
          },
        });
      }

      editRequest.reviewedBy = null;
      await editRequest.save();

      // Cross-release all other requests for this business
      await crossClaimForBusiness(editRequest.businessId, null, {
        skipModel: "EditRequest",
        skipId: editRequest._id,
      });

      return res.json({
        success: true,
        application: editRequest,
        message: "Edit request released",
      });
    } catch (err) {
      console.error("PUT /edit-requests/:id/release error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to release edit request",
        },
      });
    }
  },
);

// PUT /api/business/edit-requests/:id/transfer
router.put(
  "/:id/transfer",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const { targetOfficerId } = req.body;
      if (!targetOfficerId) {
        return res.status(400).json({
          error: {
            code: "MISSING_TARGET",
            message: "targetOfficerId is required",
          },
        });
      }

      const editRequest = await EditRequest.findById(req.params.id);
      if (!editRequest) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Edit request not found" },
        });
      }

      const userRole = req._userRole;
      const isManagerOrAdmin = userRole === "admin";
      if (
        editRequest.reviewedBy &&
        String(editRequest.reviewedBy) !== String(req._userId) &&
        !isManagerOrAdmin
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only the claiming officer can transfer this edit request",
          },
        });
      }

      editRequest.reviewedBy = targetOfficerId;
      await editRequest.save();

      // Cross-transfer all other requests for this business
      await crossClaimForBusiness(editRequest.businessId, targetOfficerId, {
        skipModel: "EditRequest",
        skipId: editRequest._id,
      });

      return res.json({
        success: true,
        application: editRequest,
        message: "Edit request transferred",
      });
    } catch (err) {
      console.error("PUT /edit-requests/:id/transfer error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to transfer edit request",
        },
      });
    }
  },
);

module.exports = router;
