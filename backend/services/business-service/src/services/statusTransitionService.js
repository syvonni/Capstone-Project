/**
 * Status Transition Service
 * Handles business status transition validation and logging
 */

const Application = require("../models/Application");
const logger = require("../lib/logger");

class StatusTransitionService {
  /**
   * Validate status transition for a business
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID (applicationId for draft applications)
   * @param {string} newStatus - New status to transition to
   * @param {string} reason - Reason for transition (optional)
   * @param {string} actorId - ID of user making the change
   */
  static async validateStatusTransition(
    userId,
    businessId,
    newStatus,
    reason = "",
    actorId = null,
  ) {
    try {
      // First try to find in Application collection (draft applications)
      const application = await Application.findOne({
        applicationId: businessId,
        userId,
      });

      if (application) {
        const currentStatus = application.applicationStatus;

        // Validate the transition
        const isValidTransition = this.validateTransition(
          currentStatus,
          newStatus,
        );
        if (!isValidTransition) {
          const validTransitions = this.getValidTransitions(currentStatus);

          // Log invalid transition attempt
          logger.warn("Invalid status transition attempted", {
            userId,
            businessId,
            currentStatus,
            attemptedStatus: newStatus,
            validTransitions,
            actorId,
            timestamp: new Date().toISOString(),
          });

          throw new Error(
            `Invalid status transition from "${currentStatus}" to "${newStatus}". ` +
              `Valid transitions from "${currentStatus}" are: ${validTransitions.join(", ")}`,
          );
        }

        // Log successful validation
        logger.info("Status transition validated", {
          userId,
          businessId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          reason,
          actorId,
          timestamp: new Date().toISOString(),
        });

        return {
          valid: true,
          fromStatus: currentStatus,
          toStatus: newStatus,
          businessId,
          validTransitions: this.getValidTransitions(newStatus),
        };
      }

      // If not found in Application, it might be an approved Business
      // For now, throw error - Business status transitions can be added later
      throw new Error(`Application/Business with ID ${businessId} not found`);
    } catch (error) {
      logger.error("Status transition validation error", {
        error: error.message,
        userId,
        businessId,
        newStatus,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Validate if a status transition is valid
   */
  static validateTransition(currentStatus, newStatus) {
    const validTransitions = {
      draft: ["requirements_viewed", "form_completed", "submitted"],
      requirements_viewed: ["form_completed", "submitted"],
      form_completed: ["documents_uploaded", "submitted"],
      documents_uploaded: ["bir_registered", "submitted"],
      bir_registered: ["agencies_registered", "submitted"],
      agencies_registered: ["submitted"],
      submitted: ["under_review", "rejected"],
      under_review: ["approved", "rejected", "needs_revision"],
      needs_revision: ["resubmit", "rejected"],
      resubmit: ["under_review", "rejected"],
      rejected: ["appeal_pending"],
      appeal_pending: ["approved", "rejected"],
      approved: [], // Terminal state
    };

    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Get valid transitions for a given status
   */
  static getValidTransitions(currentStatus) {
    const validTransitions = {
      draft: ["requirements_viewed", "form_completed", "submitted"],
      requirements_viewed: ["form_completed", "submitted"],
      form_completed: ["documents_uploaded", "submitted"],
      documents_uploaded: ["bir_registered", "submitted"],
      bir_registered: ["agencies_registered", "submitted"],
      agencies_registered: ["submitted"],
      submitted: ["under_review", "rejected"],
      under_review: ["approved", "rejected", "needs_revision"],
      needs_revision: ["resubmit", "rejected"],
      resubmit: ["under_review", "rejected"],
      rejected: ["appeal_pending"],
      appeal_pending: ["approved", "rejected"],
      approved: [],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Execute status transition with validation
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @param {string} newStatus - New status
   * @param {object} options - Additional options
   */
  static async executeStatusTransition(
    userId,
    businessId,
    newStatus,
    options = {},
  ) {
    const {
      reason = "",
      actorId = null,
      reviewedBy = null,
      reviewComments = "",
      rejectionReason = "",
    } = options;

    try {
      // First validate the transition
      const validation = await this.validateStatusTransition(
        userId,
        businessId,
        newStatus,
        reason,
        actorId,
      );

      // Get and update the profile
      const profile = await BusinessProfile.findOne({ userId });
      const businessIndex = profile.businesses.findIndex(
        (b) => b.businessId === businessId || String(b._id) === businessId,
      );

      if (businessIndex === -1) {
        throw new Error(`Business with ID ${businessId} not found`);
      }

      // Store previous status for audit
      const previousStatus =
        profile.businesses[businessIndex].applicationStatus;

      // Update the business status
      profile.businesses[businessIndex].applicationStatus = newStatus;
      profile.businesses[businessIndex].updatedAt = new Date();

      // Add additional fields if provided
      if (reviewedBy) {
        profile.businesses[businessIndex].reviewedBy = reviewedBy;
        profile.businesses[businessIndex].reviewedAt = new Date();
      }

      if (reviewComments) {
        profile.businesses[businessIndex].reviewComments = reviewComments;
      }

      if (rejectionReason) {
        profile.businesses[businessIndex].rejectionReason = rejectionReason;
      }

      // Save the profile (this will trigger the pre-save middleware validation again)
      await profile.save();

      // Log audit event for rejection
      if (newStatus === "rejected") {
        try {
          const { logAuditEvent } = require("../lib/auditClient");
          const User = require("mongoose").model("User");
          const officer = await User.findById(reviewedBy || userId)
            .select("firstName lastName")
            .lean();
          const officerName = officer
            ? `${officer.firstName} ${officer.lastName}`.trim()
            : "Officer";

          await logAuditEvent(
            "application_rejected",
            reviewedBy || userId,
            "BusinessProfile",
            businessId,
            {
              rejectedBy: reviewedBy || userId,
              rejectedByName: officerName,
              rejectedAt: new Date(),
              businessId,
              rejectionReason,
              reviewComments,
            },
          );
        } catch (auditError) {
          console.error(
            "Failed to log application_rejected audit event:",
            auditError,
          );
        }
      }

      // Log audit event for application returned (needs_revision)
      if (newStatus === "needs_revision") {
        try {
          const { logAuditEvent } = require("../lib/auditClient");
          const User = require("mongoose").model("User");
          const officer = await User.findById(reviewedBy || userId)
            .select("firstName lastName")
            .lean();
          const officerName = officer
            ? `${officer.firstName} ${officer.lastName}`.trim()
            : "Officer";

          await logAuditEvent(
            "application_returned",
            reviewedBy || userId,
            "BusinessProfile",
            businessId,
            {
              returnedBy: reviewedBy || userId,
              returnedByName: officerName,
              returnedAt: new Date(),
              businessId,
              reviewComments,
            },
          );
        } catch (auditError) {
          console.error(
            "Failed to log application_returned audit event:",
            auditError,
          );
        }
      }

      // Log audit event for completed review (approved)
      if (newStatus === "approved") {
        try {
          const { logAuditEvent } = require("../lib/auditClient");
          const User = require("mongoose").model("User");
          const officer = await User.findById(reviewedBy || userId)
            .select("firstName lastName")
            .lean();
          const officerName = officer
            ? `${officer.firstName} ${officer.lastName}`.trim()
            : "Officer";

          await logAuditEvent(
            "completed_review",
            reviewedBy || userId,
            "BusinessProfile",
            businessId,
            {
              reviewedBy: reviewedBy || userId,
              reviewedByName: officerName,
              reviewedAt: new Date(),
              businessId,
            },
          );
        } catch (auditError) {
          console.error(
            "Failed to log completed_review audit event:",
            auditError,
          );
        }
      }

      // Log the successful transition
      logger.info("Status transition executed successfully", {
        userId,
        businessId,
        fromStatus: previousStatus,
        toStatus: newStatus,
        reason,
        actorId,
        reviewedBy,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        businessId,
        fromStatus: previousStatus,
        toStatus: newStatus,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("Status transition execution error", {
        error: error.message,
        userId,
        businessId,
        newStatus,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get all valid transitions for a business's current status
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   */
  static async getValidTransitionsForBusiness(userId, businessId) {
    try {
      const profile = await BusinessProfile.findOne({ userId });
      if (!profile) {
        throw new Error("Business profile not found");
      }

      const business = profile.businesses.find(
        (b) => b.businessId === businessId || String(b._id) === businessId,
      );
      if (!business) {
        throw new Error(`Business with ID ${businessId} not found`);
      }

      const currentStatus = business.applicationStatus;
      const validTransitions =
        BusinessProfile.getValidTransitions(currentStatus);

      return {
        currentStatus,
        validTransitions,
        businessId,
      };
    } catch (error) {
      logger.error("Get valid transitions error", {
        error: error.message,
        userId,
        businessId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get status transition matrix for reference
   */
  static getStatusTransitionMatrix() {
    return {
      draft: ["requirements_viewed", "form_completed", "submitted"],
      requirements_viewed: ["form_completed", "draft", "submitted"],
      form_completed: [
        "documents_uploaded",
        "submitted",
        "requirements_viewed",
        "draft",
      ],
      documents_uploaded: [
        "bir_registered",
        "agencies_registered",
        "submitted",
        "form_completed",
      ],
      bir_registered: [
        "agencies_registered",
        "submitted",
        "documents_uploaded",
      ],
      agencies_registered: [
        "submitted",
        "bir_registered",
        "documents_uploaded",
      ],
      submitted: ["under_review", "resubmit"],
      resubmit: ["under_review"],
      under_review: ["approved", "rejected", "needs_revision"],
      approved: ["active", "pending_renewal"],
      rejected: ["resubmit"],
      needs_revision: ["resubmit"],
      active: ["pending_renewal", "closed"],
      pending_renewal: ["renewal_submitted"],
      renewal_submitted: ["renewal_approved", "active"],
      renewal_approved: ["active"],
      closed: [],
    };
  }
}

module.exports = StatusTransitionService;
