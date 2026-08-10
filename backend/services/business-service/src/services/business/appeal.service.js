const mongoose = require("mongoose");
const Appeal = require("../../models/Appeal");
const BusinessProfile = require("../../models/BusinessProfile");
const Application = require("../../models/Application");
const Payment = require("../../models/Payment");
const User = require("../../models/User");
const { logAuditEvent } = require("../../lib/auditClient");
const { crossClaimForBusiness } = require("../../lib/crossClaimService");

class AppealService {
  /**
   * Helper to send appeal email (fire and forget, doesn't block status change)
   */
  async sendAppealEmail(application, appealId, emailType, metadata = {}) {
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

  /**
   * Helper: build query that matches either applicationId or _id in Application collection
   */
  buildApplicationLookupQuery(identifier) {
    const target = String(identifier || "");
    const clauses = [{ applicationId: target }];
    if (mongoose.Types.ObjectId.isValid(target)) {
      clauses.push({ _id: new mongoose.Types.ObjectId(target) });
    }
    return clauses.length === 1 ? clauses[0] : { $or: clauses };
  }

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
   * Normalize appeal resolution status
   */
  normalizeAppealResolutionStatus(status) {
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

  /**
   * Helper: find business in profile by either businessId or subdoc _id
   */
  findBusinessInProfile(profile, identifier) {
    if (!profile?.businesses) return null;
    const target = String(identifier);
    return profile.businesses.find(
      (b) => b.businessId === target || String(b._id) === target,
    );
  }

  /**
   * Helper: find business index in profile
   */
  findBusinessIndexInProfile(profile, identifier) {
    if (!profile?.businesses) return -1;
    const target = String(identifier);
    return profile.businesses.findIndex(
      (b) => b.businessId === target || String(b._id) === target,
    );
  }

  /**
   * Helper: generate payment ID
   */
  async generatePaymentId() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PAY-${year}-${ts}-${rand}`;
  }

  /**
   * Find profile for appeal
   */
  async findProfileForAppeal(appeal) {
    const businessId = appeal?.businessId;
    const requestedBy = appeal?.requestedBy;

    let profile = await BusinessProfile.findOne(
      this.buildBusinessLookupQuery(businessId),
    );
    let businessIndex = this.findBusinessIndexInProfile(profile, businessId);

    if ((!profile || businessIndex === -1) && requestedBy) {
      profile = await BusinessProfile.findOne({ userId: requestedBy });
      businessIndex = this.findBusinessIndexInProfile(profile, businessId);
    }

    return { profile, businessIndex };
  }

  /**
   * Appeal deadline: 30 days from rejection
   */
  APPEAL_DEADLINE_DAYS = 30;

  /**
   * List appeals
   */
  async list(userId, userRole, query) {
    const { page = 1, limit = 20, status, businessId } = query;
    let filter = {};
    // Staff sees all; owner sees only their own
    if (userRole !== "staff" && userRole === "business_owner") {
      filter.requestedBy = userId;
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

    return {
      data: enrichedAppeals,
      meta: { page: Number(page), limit: Number(limit), total },
    };
  }

  /**
   * Get appeal by ID
   */
  async getById(id) {
    const appeal = await Appeal.findById(id);
    if (!appeal) {
      const error = new Error("Appeal not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Populate businessName
    const { profile } = await this.findProfileForAppeal(appeal);
    if (profile) {
      const business = this.findBusinessInProfile(profile, appeal.businessId);
      if (business) {
        appeal.businessName =
          business.businessName ||
          business.registeredBusinessName ||
          business.formData?.businessName;
      }
    }

    return appeal;
  }

  /**
   * Create appeal
   */
  async create(userId, appealData) {
    const {
      businessId,
      applicationId,
      appealType,
      description,
      evidence,
    } = appealData;

    if (!businessId || !appealType || !description) {
      const error = new Error("businessId, appealType, and description are required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Verify the application exists and is rejected
    const application = await Application.findOne(
      this.buildApplicationLookupQuery(businessId),
    );
    if (!application) {
      const error = new Error("Application not found");
      error.code = "APPLICATION_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Check if application is rejected (required for rejection_appeal)
    if (appealType === "rejection_appeal" && application.applicationStatus !== "rejected") {
      const error = new Error("Can only appeal rejected applications");
      error.code = "INVALID_APPLICATION_STATUS";
      error.status = 400;
      throw error;
    }

    // Check appeal deadline (30 days from rejection)
    if (application.rejectedAt) {
      const rejectedDate = new Date(application.rejectedAt);
      const currentDate = new Date();
      const daysSinceRejection = Math.floor(
        (currentDate - rejectedDate) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceRejection > this.APPEAL_DEADLINE_DAYS) {
        const error = new Error(
          `Appeal deadline exceeded. Appeals must be filed within ${this.APPEAL_DEADLINE_DAYS} days of rejection.`,
        );
        error.code = "DEADLINE_EXCEEDED";
        error.status = 400;
        throw error;
      }
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
      const error = new Error(
        "You have already used your appeal for this application. No further appeals are allowed.",
      );
      error.code = "APPEAL_EXHAUSTED";
      error.status = 400;
      throw error;
    }

    // Look up claiming officer on the business so the appeal is auto-assigned
    let claimingOfficerId = null;
    try {
      const profile = await BusinessProfile.findOne(
        this.buildBusinessLookupQuery(businessId),
      );
      if (profile) {
        const biz = this.findBusinessInProfile(profile, businessId);
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
      requestedBy: userId,
      status: "submitted",
      ...(claimingOfficerId ? { reviewedBy: claimingOfficerId } : {}),
    });

    // Create appeal fee payment record (auto-paid for demo)
    try {
      const appealFeeAmount = 500; // Default appeal fee amount
      const paymentId = await this.generatePaymentId();
      const payment = await Payment.create({
        paymentId,
        userId,
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
      await Application.updateOne(this.buildApplicationLookupQuery(businessId), {
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

    // Send appeal submitted email (fire and forget)
    this.sendAppealEmail(
      application,
      appeal._id.toString(),
      "appeal_submitted",
    ).catch((err) => {
      console.error("Failed to send appeal submitted email:", err);
    });

    // Log audit event
    await logAuditEvent(
      "appeal_submitted",
      userId,
      "Appeal",
      appeal._id.toString(),
      {
        businessId: appeal.businessId,
        businessName: appeal.businessName,
        applicationReferenceNumber: appeal.applicationReferenceNumber,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return appeal;
  }

  /**
   * Resolve appeal
   */
  async resolve(id, userId, resolutionData) {
    const { status, resolution } = resolutionData;
    const normalizedStatus = status
      ? this.normalizeAppealResolutionStatus(status)
      : null;

    if (status && !normalizedStatus) {
      const error = new Error(
        "Invalid status. Must be approved, rejected, upheld, or overturned",
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      const error = new Error("Appeal not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Cannot update already resolved appeals
    if (appeal.status === "approved" || appeal.status === "rejected") {
      const error = new Error("This appeal has already been resolved");
      error.code = "ALREADY_RESOLVED";
      error.status = 400;
      throw error;
    }

    if (normalizedStatus) {
      appeal.status = normalizedStatus;
      if (normalizedStatus === "approved" || normalizedStatus === "rejected") {
        appeal.reviewedBy = userId;
        appeal.resolution = resolution || "";
        appeal.resolvedAt = new Date();

        // Update application based on appeal outcome
        const businessId = appeal.businessId;
        try {
          const application = await Application.findOne(
            this.buildApplicationLookupQuery(businessId),
          );

          if (application) {
            // Send appeal email BEFORE clearing appealId
            const emailType =
              normalizedStatus === "approved"
                ? "appeal_approved"
                : "appeal_denied";
            this.sendAppealEmail(
              application,
              appeal._id.toString(),
              emailType,
              {
                resolution: appeal.resolution,
              },
            ).catch((err) => {
              console.error("Failed to send appeal email:", err);
            });

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

            await application.save();
          }
        } catch (appUpdateErr) {
          console.error(
            "Failed to update application after appeal resolution:",
            appUpdateErr,
          );
        }

        // Log audit event
        await logAuditEvent(
          "appeal_resolved",
          userId,
          "Appeal",
          appeal._id.toString(),
          {
            businessId: appeal.businessId,
            status: normalizedStatus,
            resolution: appeal.resolution,
          },
        ).catch((err) => console.error("Failed to log audit event:", err));
      }
    }

    await appeal.save();
    return appeal;
  }

  /**
   * Claim appeal
   */
  async claim(id, userId) {
    const appeal = await Appeal.findById(id);
    if (!appeal) {
      const error = new Error("Appeal not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (appeal.reviewedBy) {
      const error = new Error("Appeal already claimed");
      error.code = "ALREADY_CLAIMED";
      error.status = 400;
      throw error;
    }

    appeal.reviewedBy = userId;
    appeal.claimedAt = new Date();
    await appeal.save();

    // Cross-claim all other requests for this business
    await crossClaimForBusiness(appeal.businessId, userId, {
      skipModel: "Appeal",
      skipId: appeal._id,
    }).catch((err) => {
      console.error("Cross-claim failed for appeal:", err);
    });

    // Log audit event
    await logAuditEvent(
      "appeal_claimed",
      userId,
      "Appeal",
      appeal._id.toString(),
      { businessId: appeal.businessId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return appeal;
  }

  /**
   * Release appeal
   */
  async release(id, userId) {
    const appeal = await Appeal.findById(id);
    if (!appeal) {
      const error = new Error("Appeal not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!appeal.reviewedBy) {
      const error = new Error("Appeal is not claimed");
      error.code = "NOT_CLAIMED";
      error.status = 400;
      throw error;
    }

    if (String(appeal.reviewedBy) !== String(userId)) {
      const error = new Error("Only the claiming officer can release this appeal");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    appeal.reviewedBy = null;
    await appeal.save();

    // Cross-release all other requests for this business
    await crossClaimForBusiness(appeal.businessId, null, {
      skipModel: "Appeal",
      skipId: appeal._id,
    }).catch((err) => {
      console.error("Cross-release failed for appeal:", err);
    });

    // Log audit event
    await logAuditEvent(
      "appeal_released",
      userId,
      "Appeal",
      appeal._id.toString(),
      { businessId: appeal.businessId },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return appeal;
  }

  /**
   * Transfer appeal
   */
  async transfer(id, userId, targetOfficerId) {
    if (!targetOfficerId) {
      const error = new Error("targetOfficerId is required");
      error.code = "MISSING_TARGET";
      error.status = 400;
      throw error;
    }

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      const error = new Error("Appeal not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const isManagerOrAdmin = userId === "admin"; // Simplified check
    if (
      appeal.reviewedBy &&
      String(appeal.reviewedBy) !== String(userId) &&
      !isManagerOrAdmin
    ) {
      const error = new Error("Only the claiming officer can transfer this appeal");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    appeal.reviewedBy = targetOfficerId;
    await appeal.save();

    // Cross-transfer all other requests for this business
    await crossClaimForBusiness(appeal.businessId, targetOfficerId, {
      skipModel: "Appeal",
      skipId: appeal._id,
    }).catch((err) => {
      console.error("Cross-transfer failed for appeal:", err);
    });

    // Log audit event
    await logAuditEvent(
      "appeal_transferred",
      userId,
      "Appeal",
      appeal._id.toString(),
      {
        businessId: appeal.businessId,
        fromOfficerId: userId,
        toOfficerId: targetOfficerId,
      },
    ).catch((err) => console.error("Failed to log audit event:", err));

    return appeal;
  }

  /**
   * Resend appeal email
   */
  async resendEmail(id, userId, emailType) {
    if (
      !emailType ||
      !["appeal_submitted", "appeal_approved", "appeal_denied"].includes(
        emailType,
      )
    ) {
      const error = new Error("Invalid email type");
      error.code = "INVALID_EMAIL_TYPE";
      error.status = 400;
      throw error;
    }

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      const error = new Error("Appeal not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Find the application
    const application = await Application.findOne({
      $or: [
        { applicationId: appeal.applicationId },
        { _id: appeal.applicationId },
      ],
    });

    if (!application) {
      const error = new Error("Application not found");
      error.code = "APPLICATION_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Check if retry count is exhausted
    const emailStatus = application.emailSendStatus?.[emailType];
    if (emailStatus && emailStatus.retryCount >= 3) {
      const error = new Error("Maximum retry attempts reached. Please reset email status.");
      error.code = "RETRY_EXHAUSTED";
      error.status = 429;
      throw error;
    }

    // Check lock
    const now = new Date();
    const lockUntil = emailStatus?.lockUntil;
    if (lockUntil && new Date(lockUntil) > now) {
      const error = new Error("Please wait before retrying.");
      error.code = "RATE_LIMITED";
      error.status = 429;
      throw error;
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
      await this.sendAppealEmail(application, appeal._id, emailType, {
        resolution: appeal.resolution,
      });

      // Log audit event
      await logAuditEvent(
        userId,
        "appeal_email_resent",
        "appeal",
        JSON.stringify({ appealId: appeal._id, emailType }),
        JSON.stringify({
          applicationId: application.applicationId,
          businessId: appeal.businessId,
        }),
      ).catch((err) => console.error("Failed to log audit event:", err));

      return { message: "Email sent successfully" };
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
        userId,
        "appeal_email_failed",
        "appeal",
        JSON.stringify({
          appealId: appeal._id,
          emailType,
          error: emailErr.message,
        }),
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

      const error = new Error("Failed to send email");
      error.code = "EMAIL_ERROR";
      error.status = 500;
      throw error;
    }
  }
}

module.exports = new AppealService();
