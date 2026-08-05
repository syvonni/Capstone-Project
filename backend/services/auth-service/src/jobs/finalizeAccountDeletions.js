/**
 * Finalize Account Deletions Job
 * Permanently deletes accounts that have passed their grace period
 * Includes cross-service cleanup for government compliance
 */

const User = require("../models/User");
const { logAuditEvent } = require("../lib/auditClient");
const logger = require("../lib/logger");

async function finalizeAccountDeletions() {
  try {
    const now = new Date();

    // Find users whose deletion grace period has passed
    const usersToDelete = await User.find({
      deletionPending: true,
      deletionScheduledFor: { $lte: now },
    })
      .populate("role")
      .lean();

    if (usersToDelete.length === 0) {
      logger.info("No accounts to finalize deletion");
      return { deleted: 0 };
    }

    let deletedCount = 0;
    const errors = [];

    for (const user of usersToDelete) {
      try {
        // Log deletion finalization
        const roleSlug = user.role?.slug || "user";
        await logAuditEvent(
          user._id,
          "account_deletion_finalized",
          "User",
          user._id,
          {
            role: roleSlug,
            fieldChanged: "account",
            oldValue: "deletion_pending",
            newValue: "account_permanently_deleted",
            scheduledFor: user.deletionScheduledFor?.toISOString(),
            finalizedAt: now.toISOString(),
          },
        );

        // Perform cross-service cleanup
        await performCrossServiceCleanup(user._id, user.email, roleSlug);

        // Permanently delete user
        await User.deleteOne({ _id: user._id });
        deletedCount++;

        logger.info(`Finalized deletion for user: ${user.email}`, {
          userId: String(user._id),
        });
      } catch (error) {
        logger.error(`Error finalizing deletion for user ${user.email}`, {
          error,
          userId: String(user._id),
        });
        errors.push({ userId: String(user._id), error: error.message });
      }
    }

    logger.info(`Finalized ${deletedCount} account deletion(s)`, {
      deletedCount,
      errors: errors.length,
    });

    return { deleted: deletedCount, errors };
  } catch (error) {
    logger.error("Error in finalizeAccountDeletions job", { error });
    throw error;
  }
}

/**
 * Perform cross-service cleanup when user account is permanently deleted
 * @param {string} userId - User ID being deleted
 * @param {string} userEmail - User email for logging
 * @param {string} roleSlug - User role for context
 */
async function performCrossServiceCleanup(userId, userEmail, roleSlug) {
  const cleanupResults = {
    businessService: false,
    adminService: false,
    ipfsCleanup: false,
    errors: [],
  };

  try {
    // 1. Clean up Business Service data
    if (roleSlug === "business_owner") {
      try {
        // Call business service to clean up user's business profile
        const axios = require("axios");
        const businessServiceUrl =
          process.env.BUSINESS_SERVICE_URL || "http://localhost:3002";

        await axios.post(
          `${businessServiceUrl}/api/internal/cleanup-user-data`,
          {
            userId,
            reason: "account_deletion_finalized",
          },
          {
            headers: {
              "Internal-Service-Auth": process.env.INTERNAL_SERVICE_SECRET,
            },
          },
        );

        cleanupResults.businessService = true;
        logger.info(
          `Business service cleanup completed for user: ${userEmail}`,
        );
      } catch (businessError) {
        cleanupResults.errors.push(
          `Business service cleanup failed: ${businessError.message}`,
        );
        logger.error(
          `Business service cleanup failed for user ${userEmail}`,
          businessError,
        );
      }
    }

    // 2. Clean up Admin Service data
    try {
      const axios = require("axios");
      const adminServiceUrl =
        process.env.ADMIN_SERVICE_URL || "http://localhost:3003";

      await axios.post(
        `${adminServiceUrl}/api/internal/cleanup-user-data`,
        {
          userId,
          reason: "account_deletion_finalized",
        },
        {
          headers: {
            "Internal-Service-Auth": process.env.INTERNAL_SERVICE_SECRET,
          },
        },
      );

      cleanupResults.adminService = true;
      logger.info(`Admin service cleanup completed for user: ${userEmail}`);
    } catch (adminError) {
      cleanupResults.errors.push(
        `Admin service cleanup failed: ${adminError.message}`,
      );
      logger.error(
        `Admin service cleanup failed for user ${userEmail}`,
        adminError,
      );
    }

    // 3. IPFS cleanup is handled by business service when profile is deleted
    cleanupResults.ipfsCleanup = true;

    logger.info(
      `Cross-service cleanup completed for user: ${userEmail}`,
      cleanupResults,
    );
  } catch (error) {
    logger.error(`Cross-service cleanup failed for user ${userEmail}`, error);
    cleanupResults.errors.push(`General cleanup error: ${error.message}`);
  }

  return cleanupResults;
}

module.exports = finalizeAccountDeletions;
