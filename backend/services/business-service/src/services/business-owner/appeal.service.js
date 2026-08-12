const mongoose = require("mongoose");
const Appeal = require("../../models/Appeal");
const Business = require("../../models/Business");
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

      // Import mailer from auth-service lib
      const mailer = require("../../../../auth-service/src/lib/mailer");

      let result;
      switch (emailType) {
        case "appeal_submitted":
          result = await mailer.sendAppealSubmittedEmail(emailData);
          break;
        case "appeal_approved":
          result = await mailer.sendAppealApprovedEmail(emailData);
          break;
        case "appeal_denied":
          result = await mailer.sendAppealDeniedEmail({
            ...emailData,
            resolution: metadata.resolution,
          });
          break;
        default:
          console.warn(`Unknown email type: ${emailType}`);
          return;
      }

      if (!result || result.success === false) {
        throw new Error(result?.error || "Provider did not confirm send");
      }

      // Update emailSendStatus to sent
      application.emailSendStatus = application.emailSendStatus || {};
      application.emailSendStatus[emailType] = {
        status: "sent",
        retryCount: 0,
        lastAttempt: new Date(),
        lockUntil: null,
        to: emailData.to,
        provider: process.env.EMAIL_API_PROVIDER || "resend",
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
        error: err.message,
        to: emailData?.to || null,
        provider: process.env.EMAIL_API_PROVIDER || "resend",
      };
      await application.save();

      // Re-throw so callers (e.g. resend) know the email failed
      throw err;
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
   * Resolve a business/application identifier to an entity.
   * The identifier may be a Business.businessId, Business._id,
   * Application.applicationId or Application._id.
   * Returns { type, id, userId, reviewedBy, name } or null.
   */
  async _resolveEntity(identifier, userId) {
    const target = String(identifier || "");
    if (!target) return null;
    const isObjectId = mongoose.Types.ObjectId.isValid(target);

    // Try Business by _id
    if (isObjectId) {
      const business = await Business.findById(target).lean();
      if (business) {
        return {
          type: "business",
          id: business._id,
          userId: business.userId,
          reviewedBy: business.reviewedBy || null,
          name:
            business.businessName ||
            business.registeredBusinessName ||
            business.formData?.businessName ||
            null,
        };
      }
    }

    // Try Business by businessId string
    const businessByString = await Business.findOne({
      businessId: target,
    }).lean();
    if (businessByString) {
      return {
        type: "business",
        id: businessByString._id,
        userId: businessByString.userId,
        reviewedBy: businessByString.reviewedBy || null,
        name:
          businessByString.businessName ||
          businessByString.registeredBusinessName ||
          businessByString.formData?.businessName ||
          null,
      };
    }

    // Try Application by _id
    if (isObjectId) {
      const application = await Application.findById(target).lean();
      if (application) {
        return {
          type: "application",
          id: application._id,
          userId: application.userId,
          reviewedBy: application.reviewedBy || null,
          name:
            application.businessName ||
            application.formData?.businessName ||
            null,
        };
      }
    }

    // Try Application by applicationId string
    const applicationByString = await Application.findOne({
      applicationId: target,
    }).lean();
    if (applicationByString) {
      return {
        type: "application",
        id: applicationByString._id,
        userId: applicationByString.userId,
        reviewedBy: applicationByString.reviewedBy || null,
        name:
          applicationByString.businessName ||
          applicationByString.formData?.businessName ||
          null,
      };
    }

    // Owner-wide fallback
    if (userId) {
      const ownerApplication = await Application.findOne({
        userId,
        $or: [{ _id: target }, { applicationId: target }],
      }).lean();
      if (ownerApplication) {
        return {
          type: "application",
          id: ownerApplication._id,
          userId: ownerApplication.userId,
          reviewedBy: ownerApplication.reviewedBy || null,
          name:
            ownerApplication.businessName ||
            ownerApplication.formData?.businessName ||
            null,
        };
      }
    }

    return null;
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
   * Helper: generate payment ID
   */
  async generatePaymentId() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PAY-${year}-${ts}-${rand}`;
  }

  /**
   * Find the entity (Business or Application) an appeal is for.
   */
  async findEntityForAppeal(appeal) {
    const businessId = appeal?.businessId;
    const requestedBy = appeal?.requestedBy;
    return this._resolveEntity(businessId, requestedBy);
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

    // Populate businessName from Business or Application records
    const businessIds = [
      ...new Set(appeals.map((a) => a.businessId).filter(Boolean)),
    ];

    const [businesses, applications] = await Promise.all([
      businessIds.length > 0
        ? Business.find({
            $or: businessIds.flatMap((id) => {
              const clauses = [{ businessId: id }];
              if (mongoose.Types.ObjectId.isValid(id)) {
                clauses.push({ _id: new mongoose.Types.ObjectId(id) });
              }
              return clauses;
            }),
          })
          .select("businessId businessName registeredBusinessName formData.businessName")
          .lean()
        : [],
      businessIds.length > 0
        ? Application.find({
            $or: businessIds.flatMap((id) => {
              const clauses = [{ applicationId: id }];
              if (mongoose.Types.ObjectId.isValid(id)) {
                clauses.push({ _id: new mongoose.Types.ObjectId(id) });
              }
              return clauses;
            }),
          })
          .select("applicationId businessName formData.businessName")
          .lean()
        : [],
    ]);

    // Build identifier -> { name, canonicalId, type } map
    const businessInfoMap = new Map();
    for (const biz of businesses) {
      const name =
        biz.businessName ||
        biz.registeredBusinessName ||
        biz.formData?.businessName ||
        null;
      const info = { name, canonicalId: String(biz.businessId || biz._id) };
      if (biz.businessId) businessInfoMap.set(biz.businessId, info);
      businessInfoMap.set(String(biz._id), info);
    }
    for (const app of applications) {
      const name = app.businessName || app.formData?.businessName || null;
      const info = { name, canonicalId: app.applicationId || String(app._id) };
      if (app.applicationId) businessInfoMap.set(app.applicationId, info);
      businessInfoMap.set(String(app._id), info);
    }

    // Attach businessName and canonical ID to each appeal
    const enrichedAppeals = appeals.map((appeal) => {
      const info =
        businessInfoMap.get(appeal.businessId) ||
        businessInfoMap.get(String(appeal.businessId));
      return {
        ...appeal,
        businessName: info?.name || null,
        _canonicalBusinessId: info?.canonicalId || null,
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
    const entity = await this.findEntityForAppeal(appeal);
    if (entity?.name) {
      appeal.businessName = entity.name;
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

    // Look up claiming officer on the business/application so the appeal is auto-assigned
    let claimingOfficerId = null;
    try {
      const entity = await this._resolveEntity(businessId);
      if (entity?.reviewedBy) {
        claimingOfficerId = entity.reviewedBy;
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
