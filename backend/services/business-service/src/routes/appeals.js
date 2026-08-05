const express = require("express");
const mongoose = require("mongoose");
const Appeal = require("../models/Appeal");
const BusinessProfile = require("../models/BusinessProfile");
const Application = require("../models/Application");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { crossClaimForBusiness } = require("../lib/crossClaimService");

const router = express.Router();

// Helper to send appeal email (fire and forget, doesn't block status change)
async function sendAppealEmail(
  application,
  appealId,
  emailType,
  metadata = {},
) {
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
      appealId,
      ...metadata,
    };

    // Import mailer functions dynamically to avoid circular dependency
    const mailer = require("../../../auth-service/src/lib/mailer");

    switch (emailType) {
      case "appeal_submitted":
        await mailer.sendAppealSubmittedEmail(emailData);
        break;
      case "appeal_approved":
        await mailer.sendAppealApprovedEmail(emailData);
        break;
      case "appeal_denied":
        await mailer.sendAppealDeniedEmail({
          ...emailData,
          resolution: metadata.resolution,
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
      `Failed to send ${emailType} email for appeal ${appealId}:`,
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

// Helper: build query that matches either applicationId or _id in Application collection
function buildApplicationLookupQuery(identifier) {
  const target = String(identifier || "");
  const clauses = [{ applicationId: target }];
  if (mongoose.Types.ObjectId.isValid(target)) {
    clauses.push({ _id: new mongoose.Types.ObjectId(target) });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

// Helper: build query that matches either businessId or subdoc _id
function buildBusinessLookupQuery(identifier) {
  const target = String(identifier || "");
  const clauses = [{ "businesses.businessId": target }];
  if (mongoose.Types.ObjectId.isValid(target)) {
    clauses.push({ "businesses._id": new mongoose.Types.ObjectId(target) });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function normalizeAppealResolutionStatus(status) {
  if (!status) return null;
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "upheld") return "approved";
  if (
    normalized === "overturned" ||
    normalized === "deny" ||
    normalized === "denied"
  )
    return "rejected";
  if (
    normalized === "approved" ||
    normalized === "rejected" ||
    normalized === "submitted" ||
    normalized === "under_review"
  ) {
    return normalized;
  }
  return null;
}

// Helper: find business in profile by either businessId or subdoc _id
function findBusinessInProfile(profile, identifier) {
  if (!profile?.businesses) return null;
  const target = String(identifier);
  return profile.businesses.find(
    (b) => b.businessId === target || String(b._id) === target,
  );
}

function findBusinessIndexInProfile(profile, identifier) {
  if (!profile?.businesses) return -1;
  const target = String(identifier);
  return profile.businesses.findIndex(
    (b) => b.businessId === target || String(b._id) === target,
  );
}

// Helper: generate payment ID
async function generatePaymentId() {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${year}-${ts}-${rand}`;
}

async function findProfileForAppeal(appeal) {
  const businessId = appeal?.businessId;
  const requestedBy = appeal?.requestedBy;

  let profile = await BusinessProfile.findOne(
    buildBusinessLookupQuery(businessId),
  );
  let businessIndex = findBusinessIndexInProfile(profile, businessId);

  if ((!profile || businessIndex === -1) && requestedBy) {
    profile = await BusinessProfile.findOne({ userId: requestedBy });
    businessIndex = findBusinessIndexInProfile(profile, businessId);
  }

  return { profile, businessIndex };
}

// Appeal deadline: 30 days from rejection
const APPEAL_DEADLINE_DAYS = 30;

// GET /api/business/appeals
router.get("/", requireJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, businessId } = req.query;
    let filter = {};
    // Staff sees all; owner sees only their own
    if (role !== "staff" && req._userRole === "business_owner") {
      filter.requestedBy = req._userId;
    }
    if (status) filter.status = status;
    if (businessId) filter.businessId = businessId;
    const skip = (Number(page) - 1) * Number(limit);
    const [appeals, total] = await Promise.all([
      Appeal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Appeal.countDocuments(filter),
    ]);

    // Populate businessName from BusinessProfile for each appeal
    // NOTE: Do NOT use .lean() here — we need Mongoose decryption hooks to fire
    // so that businessId/businessName fields are readable plaintext.
    const businessIds = [
      ...new Set(appeals.map((a) => a.businessId).filter(Boolean)),
    ];
    const profileQuery =
      businessIds.length > 0
        ? {
            $or: businessIds.flatMap((id) => {
              const clauses = [{ "businesses.businessId": id }];
              if (mongoose.Types.ObjectId.isValid(id)) {
                clauses.push({
                  "businesses._id": new mongoose.Types.ObjectId(id),
                });
              }
              return clauses;
            }),
          }
        : { _id: null }; // no-op query if no businessIds
    const profiles =
      businessIds.length > 0 ? await BusinessProfile.find(profileQuery) : [];

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
        // Map both businessId and subdoc _id to the same info
        if (bizId && !businessInfoMap.has(bizId))
          businessInfoMap.set(bizId, info);
        if (subdocId && !businessInfoMap.has(subdocId))
          businessInfoMap.set(subdocId, info);
      }
    }

    // Attach businessName and alias IDs to each appeal
    const enrichedAppeals = appeals.map((appeal) => {
      const info =
        businessInfoMap.get(appeal.businessId) ||
        businessInfoMap.get(String(appeal.businessId));
      return {
        ...appeal,
        businessName: info?.name || null,
        _businessSubdocId: info?.subdocId || null,
        _canonicalBusinessId: info?.businessId || null,
      };
    });

    return res.json({
      data: enrichedAppeals,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("GET /appeals error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch appeals" },
    });
  }
});

// GET /api/business/appeals/by-business/:businessId - Get appeals for a specific business
router.get("/by-business/:businessId", requireJwt, async (req, res) => {
  try {
    const { businessId } = req.params;
    const appeals = await Appeal.find({ businessId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ data: appeals });
  } catch (err) {
    console.error("GET /appeals/by-business error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch appeals" },
    });
  }
});

// GET /api/business/appeals/:id - Get a specific appeal by ID
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const appeal = await Appeal.findById(id).lean();

    if (!appeal) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Appeal not found" },
      });
    }

    return res.json({ data: appeal });
  } catch (err) {
    console.error("GET /appeals/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch appeal" },
    });
  }
});

// POST /api/business/appeals — submit appeal
router.post("/", requireJwt, async (req, res) => {
  try {
    const {
      businessId,
      applicationId,
      appealType,
      description,
      evidence,
    } = req.body;

    // Validation
    if (!appealType || !description) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "appealType and description are required",
        },
      });
    }

    if (!businessId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "businessId is required" },
      });
    }

    // Validate appealType is a known type
    const validTypes = [
      "wrong_fees",
      "wrong_violations",
      "wrong_assessment",
      "rejection_appeal",
      "other",
    ];
    if (!validTypes.includes(appealType)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid appealType. Must be one of: ${validTypes.join(", ")}`,
        },
      });
    }

    // For rejection appeals, check if within 30-day deadline and if appeal already exhausted
    if (
      appealType === "rejection_appeal" ||
      appealType === "wrong_assessment"
    ) {
      // Find the application to check rejection date and appeal status
      const application = await Application.findOne(
        buildApplicationLookupQuery(businessId),
      );
      if (application) {
        // Check if appeal is exhausted (previous appeal was rejected)
        if (application.appealExhausted) {
          return res.status(400).json({
            error: {
              code: "APPEAL_EXHAUSTED",
              message:
                "You have already used your appeal for this application. No further appeals are allowed.",
            },
          });
        }

        // Check 30-day deadline from rejection date
        if (
          application.reviewedAt &&
          application.applicationStatus === "rejected"
        ) {
          const rejectionDate = new Date(application.reviewedAt);
          const deadlineDate = new Date(rejectionDate);
          deadlineDate.setDate(deadlineDate.getDate() + APPEAL_DEADLINE_DAYS);

          if (new Date() > deadlineDate) {
            return res.status(400).json({
              error: {
                code: "APPEAL_DEADLINE_PASSED",
                message: `The ${APPEAL_DEADLINE_DAYS}-day deadline to file an appeal has passed.`,
              },
            });
          }
        }
      }
    }

    // Check for duplicate open appeal on same business
    const existingFilter = {
      businessId,
      status: { $in: ["submitted", "under_review"] },
    };
    const existing = await Appeal.findOne(existingFilter);
    if (existing) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_APPEAL",
          message: "An open appeal already exists for this business",
        },
      });
    }

    // Check if there's already a rejected appeal for this business (appeal exhausted)
    const rejectedAppeal = await Appeal.findOne({
      businessId,
      status: "rejected",
      appealType: { $in: ["rejection_appeal", "wrong_assessment"] },
    });
    if (
      rejectedAppeal &&
      (appealType === "rejection_appeal" || appealType === "wrong_assessment")
    ) {
      return res.status(400).json({
        error: {
          code: "APPEAL_EXHAUSTED",
          message:
            "You have already used your appeal for this application. No further appeals are allowed.",
        },
      });
    }

    // Look up claiming officer on the business so the appeal is auto-assigned
    let claimingOfficerId = null;
    try {
      const profile = await BusinessProfile.findOne(
        buildBusinessLookupQuery(businessId),
      );
      if (profile) {
        const biz = findBusinessInProfile(profile, businessId);
        if (biz?.reviewedBy) {
          claimingOfficerId = biz.reviewedBy;
        }
      }
    } catch (lookupErr) {
      console.error(
        "Failed to look up claiming officer for appeal auto-assign:",
        lookupErr,
      );
    }

    const appeal = await Appeal.create({
      businessId,
      applicationId: applicationId || businessId,
      appealType,
      description,
      evidence: evidence || [],
      requestedBy: req._userId,
      status: "submitted",
      ...(claimingOfficerId ? { reviewedBy: claimingOfficerId } : {}),
    });

    // Create appeal fee payment record (auto-paid for demo)
    try {
      const appealFeeAmount = 500; // Default appeal fee amount
      const paymentId = await generatePaymentId();
      const payment = await Payment.create({
        paymentId,
        userId: req._userId,
        businessId,
        paymentType: "appeal_fee",
        description: "Appeal Fee",
        amount: appealFeeAmount,
        relatedEntityType: "other",
        relatedEntityId: appeal._id.toString(),
        feeBreakdown: [
          {
            label: "Appeal Fee",
            amount: appealFeeAmount,
            type: "appeal_fee",
          },
        ],
        status: "paid",
        paymentMethod: "demo_auto",
        paidAt: new Date(),
        breakdown: {
          baseFee: appealFeeAmount,
          surcharge: 0,
          penalty: 0,
          discount: 0,
          tax: 0,
        },
        metadata: {
          isMockPayment: true,
          appealId: appeal._id.toString(),
        },
      });
      console.log(`Appeal payment created and auto-paid: ${payment.paymentId}`);
    } catch (paymentErr) {
      console.error("Failed to create appeal payment record:", paymentErr);
      // Don't fail the appeal submission if payment creation fails
    }

    // Update application to mark that an appeal is active and change status to appeal_pending
    try {
      await Application.updateOne(buildApplicationLookupQuery(businessId), {
        $set: {
          hasActiveAppeal: true,
          appealId: appeal._id.toString(),
          applicationStatus: "appeal_pending",
        },
      });
    } catch (updateErr) {
      console.error(
        "Failed to update application with appeal flag:",
        updateErr,
      );
    }

    // Send appeal submitted email (await to ensure emailSendStatus is updated)
    try {
      const application = await Application.findOne(buildApplicationLookupQuery(businessId));
      if (application) {
        await sendAppealEmail(application, appeal._id.toString(), "appeal_submitted");
      }
    } catch (emailErr) {
      console.error("Failed to send appeal submitted email:", emailErr);
      // Don't fail the appeal submission if email fails
    }

    logAuditEvent(
      "appeal_submitted",
      req._userId,
      "Appeal",
      appeal._id.toString(),
      {
        businessId: appeal.businessId,
        businessName: appeal.businessName,
        applicationReferenceNumber: appeal.applicationReferenceNumber,
      },
    );
    return res.status(201).json({ data: appeal });
  } catch (err) {
    console.error("POST /appeals error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to submit appeal" },
    });
  }
});

// PUT /api/business/appeals/:id — resolve (LGU Manager/Officer)
router.put("/:id", requireJwt, async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.id);
    if (!appeal) {
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Appeal not found" } });
    }

    // Cannot update already resolved appeals
    if (appeal.status === "approved" || appeal.status === "rejected") {
      return res.status(400).json({
        error: {
          code: "ALREADY_RESOLVED",
          message: "This appeal has already been resolved",
        },
      });
    }

    const { status, resolution } = req.body;
    const normalizedStatus = status
      ? normalizeAppealResolutionStatus(status)
      : null;

    if (status && !normalizedStatus) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Invalid status. Must be approved, rejected, upheld, or overturned",
        },
      });
    }

    if (normalizedStatus) {
      appeal.status = normalizedStatus;
      if (normalizedStatus === "approved" || normalizedStatus === "rejected") {
        appeal.reviewedBy = req._userId;
        appeal.resolution = resolution || "";
        appeal.resolvedAt = new Date();

        // Update application based on appeal outcome
        const businessId = appeal.businessId;
        try {
          const application = await Application.findOne(
            buildApplicationLookupQuery(businessId),
          );

          if (application) {
            // Send appeal email BEFORE clearing appealId (await to ensure emailSendStatus is updated)
            const emailType =
              normalizedStatus === "approved"
                ? "appeal_approved"
                : "appeal_denied";
            try {
              await sendAppealEmail(application, appeal._id.toString(), emailType, {
                resolution: appeal.resolution,
              });
            } catch (err) {
              console.error("Failed to send appeal email:", err);
            }

            // Now clear appealId and update status
            application.hasActiveAppeal = false;
            application.appealId = "";

            if (normalizedStatus === "approved") {
              // Preserve original rejection reason before clearing
              if (!application.originalRejectionReason) {
                application.originalRejectionReason =
                  application.rejectionReason;
              }
              application.hadAppealGranted = true;

              application.applicationStatus = "under_review";
              application.appealExhausted = false;
              application.rejectionReason = "";
              application.reviewComments = "";
              console.log(
                `[Appeal Granted] Application ${businessId} reset to under_review for re-review`,
              );
            } else {
              application.appealExhausted = true;
              application.applicationStatus = "rejected";
              console.log(
                `[Appeal Rejected] Application ${businessId} marked as appealExhausted, status set to rejected`,
              );
            }

            // Re-fetch application to get the latest emailSendStatus (in case sendAppealEmail modified it)
            const updatedApplication = await Application.findOne(
              buildApplicationLookupQuery(businessId),
            );
            if (updatedApplication) {
              // Preserve emailSendStatus from the updated application
              application.emailSendStatus = updatedApplication.emailSendStatus;
            }
            await application.save();

            // Also update BusinessProfile businesses subdoc for officer view
            const profile = await BusinessProfile.findOne(
              buildBusinessLookupQuery(businessId),
            );
            if (profile) {
              const biz = findBusinessInProfile(profile, businessId);
              if (biz) {
                if (normalizedStatus === "approved") {
                  if (!biz.originalRejectionReason) {
                    biz.originalRejectionReason = biz.rejectionReason;
                  }
                  biz.hadAppealGranted = true;
                  biz.applicationStatus = "under_review";
                  biz.appealExhausted = false;
                  biz.rejectionReason = "";
                  biz.reviewComments = "";
                } else {
                  biz.appealExhausted = true;
                  biz.applicationStatus = "rejected";
                }
                await profile.save();
              }
            }
          } else {
            console.warn(
              `[Appeal Resolution] No matching application found for appeal businessId=${businessId}`,
            );
          }
        } catch (updateErr) {
          console.error(
            "Failed to synchronize application after appeal resolution:",
            updateErr,
          );
        }
      }
    }
    await appeal.save();

    // Log appropriate audit event based on resolution
    if (normalizedStatus === "rejected") {
      logAuditEvent(
        "appeal_rejected",
        req._userId,
        "Appeal",
        appeal._id.toString(),
        {
          status: appeal.status,
          resolution: appeal.resolution,
          businessId: appeal.businessId,
        },
      );
    } else {
      logAuditEvent(
        "appeal_resolved",
        req._userId,
        "Appeal",
        appeal._id.toString(),
        { status: appeal.status },
      );
    }

    // Return appeal and application (with updated emailSendStatus)
    const application = await Application.findOne(
      buildApplicationLookupQuery(businessId),
    );
    return res.json({ data: appeal, application });
  } catch (err) {
    console.error("PUT /appeals error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to update appeal" },
    });
  }
});

// PUT /api/business/appeals/:id/claim
router.put(
  "/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const appeal = await Appeal.findById(req.params.id);
      if (!appeal) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Appeal not found" } });
      }

      if (appeal.status === "approved" || appeal.status === "rejected") {
        return res.status(400).json({
          error: {
            code: "ALREADY_RESOLVED",
            message: "Cannot claim a resolved appeal",
          },
        });
      }

      if (
        appeal.reviewedBy &&
        String(appeal.reviewedBy) !== String(req._userId)
      ) {
        return res.status(409).json({
          error: {
            code: "ALREADY_CLAIMED",
            message: "Appeal is already claimed by another officer",
          },
        });
      }

      appeal.reviewedBy = req._userId;
      await appeal.save();

      // Cross-claim all other requests for this business
      await crossClaimForBusiness(appeal.businessId, req._userId, {
        skipModel: "Appeal",
        skipId: appeal._id,
      });

      return res.json({ success: true, application: appeal });
    } catch (err) {
      console.error("PUT /appeals/:id/claim error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to claim appeal" },
      });
    }
  },
);

// PUT /api/business/appeals/:id/release
router.put(
  "/:id/release",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  async (req, res) => {
    try {
      const appeal = await Appeal.findById(req.params.id);
      if (!appeal) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Appeal not found" } });
      }

      const userRole = req._userRole;
      const isManagerOrAdmin = userRole === "admin";
      if (
        appeal.reviewedBy &&
        String(appeal.reviewedBy) !== String(req._userId) &&
        !isManagerOrAdmin
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only the claiming officer can release this appeal",
          },
        });
      }

      appeal.reviewedBy = null;
      await appeal.save();

      // Cross-release all other requests for this business
      await crossClaimForBusiness(appeal.businessId, null, {
        skipModel: "Appeal",
        skipId: appeal._id,
      });

      return res.json({
        success: true,
        application: appeal,
        message: "Appeal released",
      });
    } catch (err) {
      console.error("PUT /appeals/:id/release error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to release appeal" },
      });
    }
  },
);

// PUT /api/business/appeals/:id/transfer
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

      const appeal = await Appeal.findById(req.params.id);
      if (!appeal) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Appeal not found" } });
      }

      const userRole = req._userRole;
      const isManagerOrAdmin = userRole === "admin";
      if (
        appeal.reviewedBy &&
        String(appeal.reviewedBy) !== String(req._userId) &&
        !isManagerOrAdmin
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Only the claiming officer can transfer this appeal",
          },
        });
      }

      appeal.reviewedBy = targetOfficerId;
      await appeal.save();

      // Cross-transfer all other requests for this business
      await crossClaimForBusiness(appeal.businessId, targetOfficerId, {
        skipModel: "Appeal",
        skipId: appeal._id,
      });

      return res.json({
        success: true,
        application: appeal,
        message: "Appeal transferred",
      });
    } catch (err) {
      console.error("PUT /appeals/:id/transfer error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to transfer appeal" },
      });
    }
  },
);

/**
 * POST /api/lgu-officer/appeals/:id/resend-email
 * Resend appeal email (with step-up authentication)
 */
router.post(
  "/appeals/:id/resend-email",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId || req.user?.id;
      const { emailType } = req.body;

      if (
        !emailType ||
        !["appeal_submitted", "appeal_approved", "appeal_denied"].includes(emailType)
      ) {
        return respond.error(
          res,
          400,
          "invalid_email_type",
          "Invalid email type",
        );
      }

      const appeal = await Appeal.findById(req.params.id);
      if (!appeal) {
        return respond.error(res, 404, "not_found", "Appeal not found");
      }

      // Find the application
      const application = await Application.findOne({
        $or: [
          { applicationId: appeal.applicationId },
          { _id: appeal.applicationId },
        ],
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
          "rate_limited",
          "Please wait before retrying.",
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
        await sendAppealEmail(application, appeal._id, emailType, {
          resolution: appeal.resolution,
        });

        // Log audit event
        await logAuditEvent(
          officerId,
          "appeal_email_resent",
          "appeal",
          JSON.stringify({ appealId: appeal._id, emailType }),
          JSON.stringify({
            applicationId: application.applicationId,
            businessId: appeal.businessId,
          }),
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
          "appeal_email_failed",
          "appeal",
          JSON.stringify({ appealId: appeal._id, emailType, error: emailErr.message }),
          JSON.stringify({
            applicationId: application.applicationId,
            businessId: appeal.businessId,
          }),
        ).catch((err) => console.error("Failed to log audit event:", err));

        console.error("Failed to resend appeal email", {
          error: emailErr.message,
          appealId: appeal._id,
          emailType,
        });

        return respond.error(res, 500, "email_error", "Failed to send email");
      }
    } catch (err) {
      console.error("POST /api/lgu-officer/appeals/:id/resend-email error:", err);
      return respond.error(res, 500, "resend_error", "Failed to resend email");
    }
  },
);

module.exports = { router, sendAppealEmail };
