/**
 * Cross-Claim Service
 * When an officer claims/releases/transfers an appeal for a business,
 * all other open appeals for the same business are automatically
 * claimed/released/transferred to the same officer.
 */
const mongoose = require("mongoose");
const Appeal = require("../models/Appeal");

/**
 * Cross-claim all pending appeals for a business.
 * @param {string} businessId
 * @param {string|null} officerId - null for release
 * @param {object} options
 * @param {string} options.skipModel - 'Appeal' to skip (the caller already handled it)
 * @param {string} options.skipId - specific document _id to skip (the item that triggered cross-claim)
 */
async function crossClaimForBusiness(businessId, officerId, options = {}) {
  const { skipModel, skipId } = options;
  const results = {
    appeals: 0,
  };

  if (skipModel !== "Appeal") {
    return results;
  }

  try {
    const businessIds = [String(businessId)];
    if (mongoose.Types.ObjectId.isValid(businessId)) {
      businessIds.push(new mongoose.Types.ObjectId(businessId).toString());
    }

    const filter = {
      businessId: { $in: businessIds },
      status: { $in: ["submitted", "under_review", "pending"] },
    };
    if (skipId) {
      filter._id = { $ne: skipId };
    }

    const appealResult = await Appeal.updateMany(filter, {
      $set: { reviewedBy: officerId },
    });
    results.appeals = appealResult.modifiedCount || 0;
  } catch (err) {
    console.error("[crossClaimService] Error during cross-claim:", err);
  }

  return results;
}

module.exports = { crossClaimForBusiness };
