const BusinessProfile = require("../models/BusinessProfile");
const User = require("../models/User");
const { logAuditEvent } = require("../lib/auditClient");

/**
 * OwnerProfile service
 * Manages the BusinessProfile document which now only contains owner identity
 * and legal consent data. Businesses are separate Business documents.
 */
class OwnerProfileService {
  /**
   * Get current user's business profile
   */
  async getProfile(userId) {
    let profile = await BusinessProfile.findOne({ userId }).lean();
    if (!profile) {
      return {
        userId,
        currentStep: 2,
        ownerIdentity: {},
        consent: {},
        status: "draft",
      };
    }
    return profile;
  }

  /**
   * Update business profile step
   * Step flow: 2 (Identity) → 3 (MFA) → 4 (Consent) → Complete
   */
  async updateStep(userId, step, data, metadata = {}) {
    if (!step || !data) {
      const error = new Error("Step and data are required");
      error.code = "MISSING_DATA";
      error.status = 400;
      throw error;
    }

    const stepNum = parseInt(step);
    const nextStep = stepNum + 1;
    let update = {};

    const user = await User.findById(userId).populate("role").lean();
    const roleSlug =
      user && user.role && user.role.slug ? user.role.slug : "business_owner";

    const oldProfile = await BusinessProfile.findOne({ userId }).lean();

    switch (stepNum) {
      case 2: {
        const fullName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ");
        const { idType, idNumber, idFileUrl, idFileBackUrl } = data || {};
        update["ownerIdentity"] = {
          fullName: fullName || "",
          idType: idType ?? "",
          idNumber: idNumber ?? "",
          idFileUrl: idFileUrl ?? "",
          idFileBackUrl: idFileBackUrl ?? "",
          isSubmitted: true,
        };
        break;
      }
      case 3:
        break;
      case 4:
        update["consent"] = { ...data, isSubmitted: true };
        update["status"] = "pending_review";
        break;
      default:
        throw new Error("Invalid step");
    }

    if (stepNum < 4) {
      update["currentStep"] = nextStep;
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const stepName =
      stepNum === 2
        ? "ownerIdentity"
        : stepNum === 3
          ? "mfa"
          : stepNum === 4
            ? "consent"
            : `step_${stepNum}`;

    try {
      await logAuditEvent("profile_update", userId, "BusinessProfile", userId, {
        step: stepNum,
        stepName,
        oldValue: oldProfile
          ? JSON.stringify(oldProfile[stepName] || {})
          : "",
        newValue: JSON.stringify(data),
        role: roleSlug,
        profileType: "business",
        ...metadata,
      });
    } catch (error) {
      console.error("Error creating audit log for business profile:", error);
    }

    return profile;
  }

  /**
   * Delete entire business profile
   */
  async deleteProfile(userId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    await BusinessProfile.deleteOne({ userId });

    try {
      await logAuditEvent("profile_deleted", userId, "BusinessProfile", userId, {
        userId,
      });
    } catch (error) {
      console.error("Error creating audit log for profile deletion:", error);
    }

    return { deleted: true };
  }
}

module.exports = new OwnerProfileService();
