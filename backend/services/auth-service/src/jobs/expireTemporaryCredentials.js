/**
 * Expire Temporary Credentials Job
 * Marks temporary credentials as expired if they've passed their expiration time
 */

const TemporaryCredential = require("../models/TemporaryCredential");
const { logAuditEvent } = require("../lib/auditClient");
const logger = require("../lib/logger");

async function expireTemporaryCredentials() {
  try {
    const now = new Date();

    // Find temporary credentials that have expired
    const expiredCredentials = await TemporaryCredential.find({
      isExpired: false,
      expiresAt: { $lte: now },
    })
      .populate("userId")
      .populate("issuedBy")
      .lean();

    if (expiredCredentials.length === 0) {
      logger.info("No temporary credentials to expire");
      return { expired: 0 };
    }

    let expiredCount = 0;
    const errors = [];

    for (const cred of expiredCredentials) {
      try {
        // Mark as expired
        await TemporaryCredential.updateOne(
          { _id: cred._id },
          { isExpired: true },
        );

        // Log expiration
        if (cred.userId) {
          const user = cred.userId;
          const roleSlug = user.role?.slug || "staff";
          await logAuditEvent(
            user._id,
            "temporary_credentials_expired",
            "User",
            user._id,
            {
              role: roleSlug,
              fieldChanged: "password",
              oldValue: "",
              newValue: "temp_credentials_expired",
              temporaryCredentialId: String(cred._id),
              expiresAt: cred.expiresAt?.toISOString(),
              expiredAt: now.toISOString(),
            },
          );
        }

        expiredCount++;
        logger.info(`Expired temporary credential: ${cred.username}`, {
          credentialId: String(cred._id),
        });
      } catch (error) {
        logger.error(`Error expiring temporary credential ${cred.username}`, {
          error,
          credentialId: String(cred._id),
        });
        errors.push({ credentialId: String(cred._id), error: error.message });
      }
    }

    logger.info(`Expired ${expiredCount} temporary credential(s)`, {
      expiredCount,
      errors: errors.length,
    });

    return { expired: expiredCount, errors };
  } catch (error) {
    logger.error("Error in expireTemporaryCredentials job", { error });
    throw error;
  }
}

module.exports = expireTemporaryCredentials;
