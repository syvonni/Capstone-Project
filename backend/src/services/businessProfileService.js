const BusinessProfile = require("../models/BusinessProfile");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  validateBusinessRegistrationNumber,
  validateGeolocation,
  calculateRiskLevel,
} = require("../lib/businessValidation");
const mongoose = require("mongoose");

class BusinessProfileService {
  async getProfile(userId) {
    let profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      // Create default structure if not exists
      return {
        userId,
        currentStep: 2,
        ownerIdentity: {},
        businessRegistration: {},
        location: {},
        compliance: {},
        profileDetails: {},
        notifications: {},
        consent: {},
        status: "draft",
      };
    }
    return profile;
  }

  // --- Business Logic / System Actions ---

  validateRegistration(data) {
    // System Action: Validate format of registration number
    const regNum = data.registrationNumber || "";
    const isValid = /^[A-Z0-9-]+$/i.test(regNum);
    if (!isValid) {
      throw new Error("Invalid registration number format");
    }
    // In a real system, we might call an external API (DTI/SEC) here
    return true;
  }

  determineJurisdiction(location) {
    // System Action: Auto-assign LGU
    // Logic: Map lat/lng or City/Barangay to LGU ID
    // For now, return a placeholder LGU assignment
    return {
      lguId: "LGU-001",
      lguName: `${location.city} LGU`,
      inspectorPoolId: "POOL-A",
    };
  }

  determineInspections(nature, risk) {
    // System Action: Auto-determine required inspections
    const inspections = ["Business Permit"];
    if (risk === "high")
      inspections.push("Fire Safety", "Sanitary", "Environmental");
    if (risk === "medium") inspections.push("Fire Safety", "Sanitary");
    return inspections;
  }

  assessRisk(details) {
    // Use the comprehensive risk calculation from businessValidation
    return calculateRiskLevel(details);
  }

  async updateStep(userId, step, data, metadata = {}) {
    let update = {};
    // Step flow: 2 (Identity) → 3 (MFA) → 4 (Consent) → Complete
    let nextStep = step + 1;

    // Get user role for audit logging
    const user = await User.findById(userId).populate("role").lean();
    const roleSlug =
      user && user.role && user.role.slug ? user.role.slug : "business_owner";

    // Get old profile for comparison
    const oldProfile = await BusinessProfile.findOne({ userId }).lean();

    switch (step) {
      case 2: // Owner Identity
        // Derive fullName from User (sign-up); persist only ID fields. No DOB/personal info from form.
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

      case 3: // MFA Setup (no data saved to BusinessProfile, MFA is stored in User model)
        // Just mark step as complete - MFA setup is handled separately via User model
        // No data to save here, just progression
        break;

      case 4: // Legal Consent (Final Step)
        update["consent"] = { ...data, isSubmitted: true };
        // System Action: Lock submitted data is implied by status change
        update["status"] = "pending_review";
        break;

      case 5: // Business Registration (Step 3)
        // This is now handled by addBusiness/updateBusiness methods
        // Keep for backward compatibility but redirect to addBusiness
        throw new Error("Use addBusiness or updateBusiness methods for step 5");

      case 6: // Risk Profile (Step 4)
        // This is now handled by updateBusinessRiskProfile method
        throw new Error("Use updateBusinessRiskProfile method for step 6");

      default:
        throw new Error("Invalid step");
    }

    // Only advance step if not the final step
    if (step < 4) {
      update["currentStep"] = nextStep;
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Create audit log for business profile update
    try {
      const stepName =
        step === 2
          ? "ownerIdentity"
          : step === 3
            ? "mfa"
            : step === 4
              ? "consent"
              : `step_${step}`;
      const oldValue = oldProfile
        ? JSON.stringify(oldProfile[stepName] || {})
        : "";
      const newValue = JSON.stringify(data);

      await AuditLog.create({
        userId,
        eventType: "profile_update",
        fieldChanged: stepName,
        oldValue,
        newValue,
        role: roleSlug,
        metadata: {
          ...metadata,
          step,
          profileType: "business",
        },
      });
    } catch (error) {
      // Don't throw - audit logging failure shouldn't break profile updates
      console.error("Error creating audit log for business profile:", error);
    }

    return profile;
  }

  // --- Multiple Business Management Methods ---

  /**
   * Add new business to businesses array
   * @param {string} userId - User ID
   * @param {object} businessData - Business registration data
   * @returns {Promise<object>} Updated profile
   */
  async addBusiness(userId, businessData) {
    let profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      profile = await BusinessProfile.create({ userId, businesses: [] });
    }

    const hasRegNum =
      businessData.businessRegistrationNumber &&
      String(businessData.businessRegistrationNumber).trim();
    const isMinimalAdd = businessData.businessName && !hasRegNum;

    if (!isMinimalAdd) {
      const legacyFieldsPresent =
        businessData.registrationAgency ||
        businessData.location ||
        businessData.businessName;
      if (legacyFieldsPresent) {
        const regValidation = validateBusinessRegistrationNumber(
          businessData.registrationAgency,
          businessData.businessRegistrationNumber,
        );
        if (!regValidation.valid) {
          throw new Error(regValidation.error);
        }

        const geoValidation = validateGeolocation(
          businessData.location?.geolocation?.lat,
          businessData.location?.geolocation?.lng,
        );
        if (!geoValidation.valid) {
          throw new Error(geoValidation.error);
        }

        const existingBusiness = profile.businesses?.find(
          (b) =>
            b.businessRegistrationNumber ===
              businessData.businessRegistrationNumber &&
            b.registrationAgency === businessData.registrationAgency,
        );
        if (existingBusiness) {
          throw new Error(
            "Business registration number already exists for this agency",
          );
        }
      }
    }

    const businessId = new mongoose.Types.ObjectId().toString();
    const isFirstBusiness =
      !profile.businesses || profile.businesses.length === 0;
    const isPrimary = isFirstBusiness;

    if (isPrimary && profile.businesses && profile.businesses.length > 0) {
      profile.businesses.forEach((b) => {
        b.isPrimary = false;
      });
    }

    const riskLevel = isMinimalAdd ? "low" : calculateRiskLevel(businessData);
    const placeholderRegNum = `PENDING-${businessId}`;
    const regAgency = isMinimalAdd ? "LGU" : businessData.registrationAgency;
    const regNum = isMinimalAdd
      ? placeholderRegNum
      : businessData.businessRegistrationNumber;

    const hasExistingPermit = !!businessData.hasExistingPermit;
    const locationFromPayload =
      businessData.location &&
      typeof businessData.location === "object" &&
      Object.keys(businessData.location).length > 0
        ? businessData.location
        : isMinimalAdd
          ? {}
          : businessData.location || {};
    const validStatuses = ["active", "inactive", "closed"];
    const businessStatus =
      businessData.businessStatus &&
      validStatuses.includes(businessData.businessStatus)
        ? businessData.businessStatus
        : "active";
    const existingPermitRef = hasExistingPermit
      ? String(businessData.applicationReferenceNumber || "").trim() ||
        `EXISTING-${businessId}`
      : "";

    const newBusiness = {
      businessId,
      isPrimary,
      businessName:
        businessData.businessName || businessData.registeredBusinessName,
      registrationStatus:
        businessData.registrationStatus || "not_yet_registered",
      businessStatus,
      location: locationFromPayload,
      businessType: businessData.businessType,
      registrationAgency: regAgency,
      businessRegistrationNumber: regNum,
      businessStartDate: businessData.businessStartDate
        ? new Date(businessData.businessStartDate)
        : null,
      numberOfBranches: businessData.numberOfBranches || 0,
      industryClassification: businessData.industryClassification || "",
      taxIdentificationNumber: businessData.taxIdentificationNumber || "",
      contactNumber:
        businessData.contactNumber || businessData.mobileNumber || "",
      riskProfile: {
        businessSize: businessData.riskProfile?.businessSize || null,
        annualRevenue: businessData.riskProfile?.annualRevenue || null,
        businessActivitiesDescription:
          businessData.riskProfile?.businessActivitiesDescription || "",
        riskLevel,
      },
      applicationStatus: hasExistingPermit ? "submitted" : "draft",
      applicationReferenceNumber: hasExistingPermit ? existingPermitRef : "",
      submittedAt: hasExistingPermit ? new Date() : null,
      submittedToLguOfficer: hasExistingPermit,
      isSubmitted: hasExistingPermit,
      requirementsChecklist: {
        confirmed: false,
        confirmedAt: null,
        pdfDownloaded: false,
        pdfDownloadedAt: null,
      },
      registeredBusinessName: businessData.registeredBusinessName || "",
      businessTradeName: businessData.businessTradeName || "",
      businessRegistrationType: businessData.businessRegistrationType || "",
      businessRegistrationDate: businessData.businessRegistrationDate
        ? new Date(businessData.businessRegistrationDate)
        : null,
      businessAddress: businessData.businessAddress || "",
      unitBuildingName: businessData.unitBuildingName || "",
      street:
        (locationFromPayload && locationFromPayload.street) ||
        businessData.street ||
        "",
      barangay:
        (locationFromPayload && locationFromPayload.barangay) ||
        businessData.barangay ||
        "",
      cityMunicipality:
        (locationFromPayload &&
          (locationFromPayload.city || locationFromPayload.municipality)) ||
        businessData.cityMunicipality ||
        "",
      businessLocationType: businessData.businessLocationType || "",
      primaryLineOfBusiness: businessData.primaryLineOfBusiness || "",
      businessClassification: businessData.businessClassification || "",
      industryCategory: businessData.industryCategory || "",
      declaredCapitalInvestment: businessData.declaredCapitalInvestment || 0,
      numberOfBusinessUnits: businessData.numberOfBusinessUnits || 0,
      ownerFullName: businessData.ownerFullName || "",
      ownerPosition: businessData.ownerPosition || "",
      ownerNationality: businessData.ownerNationality || "",
      ownerResidentialAddress: businessData.ownerResidentialAddress || "",
      ownerTin: businessData.ownerTin || "",
      governmentIdType: businessData.governmentIdType || "",
      governmentIdNumber: businessData.governmentIdNumber || "",
      emailAddress: businessData.emailAddress || "",
      mobileNumber: businessData.mobileNumber || "",
      numberOfEmployees: businessData.numberOfEmployees || 0,
      withFoodHandlers: businessData.withFoodHandlers || "",
      certificationAccepted: businessData.certificationAccepted || false,
      declarantName: businessData.declarantName || "",
      declarationDate: businessData.declarationDate
        ? new Date(businessData.declarationDate)
        : null,
      lguDocuments: {
        idPicture: "",
        ctc: "",
        barangayClearance: "",
        dtiSecCda: "",
        leaseOrLandTitle: "",
        occupancyPermit: "",
        healthCertificate: "",
      },
      birRegistration: {
        registrationNumber: "",
        certificateUrl: "",
        registrationFee: 500,
        documentaryStampTax: 0,
        businessCapital: 0,
        booksOfAccountsUrl: "",
        authorityToPrintUrl: "",
        paymentReceiptUrl: "",
      },
      otherAgencyRegistrations: {
        hasEmployees: false,
        sss: {
          registered: false,
          proofUrl: "",
        },
        philhealth: {
          registered: false,
          proofUrl: "",
        },
        pagibig: {
          registered: false,
          proofUrl: "",
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to businesses array
    if (!profile.businesses) {
      profile.businesses = [];
    }
    profile.businesses.push(newBusiness);

    // Mark the array as modified for Mongoose
    profile.markModified("businesses");
    await profile.save();

    // Create notifications for LGU Officers when owner adds business with "already has permit"
    if (hasExistingPermit) {
      try {
        const notificationService = require("../services/notificationService");
        const UserModel = require("../models/User");
        const RoleModel = require("../models/Role");
        const referenceNumber =
          newBusiness.applicationReferenceNumber || placeholderRegNum;

        const lguOfficerRole = await RoleModel.findOne({
          slug: "lgu_officer",
        }).lean();
        if (lguOfficerRole) {
          const lguOfficers = await UserModel.find({
            role: lguOfficerRole._id,
            isActive: true,
          }).lean();

          const notificationPromises = lguOfficers.map((officer) =>
            notificationService
              .createNotification(
                officer._id,
                "application_status_update",
                "New Application Submitted",
                `A new business "${newBusiness.businessName}" (Reference: ${referenceNumber}) has been submitted with an existing permit claim and is ready for verification.`,
                "business_application",
                businessId,
                {
                  businessName: newBusiness.businessName,
                  referenceNumber,
                  businessId,
                  submittedAt: newBusiness.submittedAt,
                },
              )
              .catch((err) => {
                console.error(
                  `Failed to create notification for LGU Officer ${officer._id}:`,
                  err,
                );
                return null;
              }),
          );
          await Promise.all(notificationPromises);
          console.log(
            `[addBusiness] Created notifications for ${lguOfficers.length} LGU Officer(s) (existing permit claim)`,
          );
        }
      } catch (notifError) {
        console.error(
          "[addBusiness] Failed to create LGU Officer notifications:",
          notifError,
        );
      }
    }

    // Audit log
    try {
      const user = await User.findById(userId).populate("role").lean();
      const roleSlug =
        user && user.role && user.role.slug ? user.role.slug : "business_owner";

      await AuditLog.create({
        userId,
        eventType: "business_added",
        fieldChanged: "businesses",
        oldValue: "",
        newValue: JSON.stringify(newBusiness),
        role: roleSlug,
        metadata: {
          businessId,
          businessName: businessData.businessName,
          isPrimary,
        },
      });
    } catch (error) {
      console.error("Error creating audit log for business add:", error);
    }

    return { profile, businessId };
  }

  /**
   * Update existing business
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @param {object} businessData - Updated business data
   * @returns {Promise<object>} Updated profile
   */
  async updateBusiness(userId, businessId, businessData) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const businessIndex = profile.businesses?.findIndex(
      (b) => b.businessId === businessId,
    );
    if (businessIndex === -1 || businessIndex === undefined) {
      throw new Error("Business not found");
    }

    const existingBusiness = profile.businesses[businessIndex];

    const legacyFieldsPresent =
      businessData.registrationAgency ||
      businessData.location ||
      businessData.businessName;
    if (legacyFieldsPresent) {
      // Validate registration number if changed
      if (
        businessData.businessRegistrationNumber &&
        businessData.businessRegistrationNumber !==
          existingBusiness.businessRegistrationNumber
      ) {
        const regValidation = validateBusinessRegistrationNumber(
          businessData.registrationAgency ||
            existingBusiness.registrationAgency,
          businessData.businessRegistrationNumber,
        );
        if (!regValidation.valid) {
          throw new Error(regValidation.error);
        }

        // Check for duplicate (excluding current business)
        const duplicate = profile.businesses.find(
          (b, idx) =>
            b.businessId !== businessId &&
            b.businessRegistrationNumber ===
              businessData.businessRegistrationNumber &&
            b.registrationAgency ===
              (businessData.registrationAgency ||
                existingBusiness.registrationAgency),
        );
        if (duplicate) {
          throw new Error(
            "Business registration number already exists for this agency",
          );
        }
      }

      // Validate geolocation if changed
      if (businessData.location?.geolocation) {
        const geoValidation = validateGeolocation(
          businessData.location.geolocation.lat,
          businessData.location.geolocation.lng,
        );
        if (!geoValidation.valid) {
          throw new Error(geoValidation.error);
        }
      }
    }

    // Check if risk-relevant fields changed
    const riskFieldsChanged =
      businessData.businessSize !== undefined ||
      businessData.annualRevenue !== undefined ||
      businessData.businessType !== undefined ||
      businessData.registrationStatus !== undefined ||
      businessData.numberOfBranches !== undefined ||
      businessData.riskProfile?.businessSize !== undefined ||
      businessData.riskProfile?.annualRevenue !== undefined;

    // Update business fields
    // Convert mongoose document to plain object if needed
    const existingBusinessObj = existingBusiness.toObject
      ? existingBusiness.toObject()
      : existingBusiness;

    const updatedBusiness = {
      ...existingBusinessObj,
      ...businessData,
      businessId: existingBusinessObj.businessId, // Don't allow changing ID
      isPrimary: existingBusinessObj.isPrimary, // Don't allow changing primary here (use setPrimaryBusiness)
      updatedAt: new Date(),
    };

    // Handle nested location update properly
    if (businessData.location) {
      updatedBusiness.location = {
        ...existingBusinessObj.location,
        ...businessData.location,
      };
    }

    // Handle nested riskProfile update properly
    if (businessData.riskProfile) {
      updatedBusiness.riskProfile = {
        ...existingBusinessObj.riskProfile,
        ...businessData.riskProfile,
      };
    }

    // Recalculate risk level if relevant fields changed
    if (riskFieldsChanged) {
      const combinedData = {
        ...updatedBusiness,
        businessSize:
          businessData.businessSize ??
          businessData.riskProfile?.businessSize ??
          updatedBusiness.riskProfile?.businessSize ??
          null,
        annualRevenue:
          businessData.annualRevenue ??
          businessData.riskProfile?.annualRevenue ??
          updatedBusiness.riskProfile?.annualRevenue ??
          null,
        businessType: businessData.businessType ?? updatedBusiness.businessType,
        registrationStatus:
          businessData.registrationStatus ?? updatedBusiness.registrationStatus,
        numberOfBranches:
          businessData.numberOfBranches ??
          updatedBusiness.numberOfBranches ??
          0,
      };
      const newRiskLevel = calculateRiskLevel(combinedData);
      updatedBusiness.riskProfile = {
        ...updatedBusiness.riskProfile,
        ...(businessData.riskProfile || {}),
        riskLevel: newRiskLevel,
      };
    } else if (businessData.riskProfile) {
      // If risk profile is updated but risk fields didn't change, just merge the risk profile
      updatedBusiness.riskProfile = {
        ...updatedBusiness.riskProfile,
        ...businessData.riskProfile,
      };
    }

    const wasResubmit = existingBusinessObj?.applicationStatus === "resubmit";
    if (updatedBusiness.applicationStatus === "resubmit") {
      updatedBusiness.submittedAt = new Date();
      updatedBusiness.submittedToLguOfficer = true;
      updatedBusiness.isSubmitted = true;
    }

    // Update the business in the array
    profile.businesses[businessIndex] = updatedBusiness;

    // Mark the array as modified for Mongoose
    profile.markModified("businesses");
    await profile.save();

    if (updatedBusiness.applicationStatus === "resubmit" && !wasResubmit) {
      try {
        const notificationService = require("../services/notificationService");
        const UserModel = require("../models/User");
        const RoleModel = require("../models/Role");
        const referenceNumber =
          updatedBusiness.applicationReferenceNumber ||
          `APP-${String(businessId).slice(-8)}`;

        const lguOfficerRole = await RoleModel.findOne({
          slug: "lgu_officer",
        }).lean();
        if (lguOfficerRole) {
          const lguOfficers = await UserModel.find({
            role: lguOfficerRole._id,
            isActive: true,
          }).lean();

          const notificationPromises = lguOfficers.map((officer) =>
            notificationService
              .createNotification(
                officer._id,
                "application_status_update",
                "Application Resubmitted",
                `A business application "${updatedBusiness.businessName}" (Reference: ${referenceNumber}) has been resubmitted and is ready for review.`,
                "business_application",
                businessId,
                {
                  businessName: updatedBusiness.businessName,
                  referenceNumber,
                  businessId,
                  submittedAt: updatedBusiness.submittedAt,
                },
              )
              .catch((err) => {
                console.error(
                  `Failed to create notification for LGU Officer ${officer._id}:`,
                  err,
                );
                return null;
              }),
          );

          await Promise.all(notificationPromises);
          console.log(
            `[updateBusiness] Created resubmission notifications for ${lguOfficers.length} LGU Officer(s)`,
          );
        }
      } catch (notifError) {
        console.error(
          "[updateBusiness] Failed to create LGU Officer resubmission notifications:",
          notifError,
        );
      }
    }

    // Audit log
    try {
      const user = await User.findById(userId).populate("role").lean();
      const roleSlug =
        user && user.role && user.role.slug ? user.role.slug : "business_owner";

      await AuditLog.create({
        userId,
        eventType: "business_updated",
        fieldChanged: "businesses",
        oldValue: JSON.stringify(existingBusiness),
        newValue: JSON.stringify(updatedBusiness),
        role: roleSlug,
        metadata: {
          businessId,
          businessName: updatedBusiness.businessName,
        },
      });
    } catch (error) {
      console.error("Error creating audit log for business update:", error);
    }

    return profile;
  }

  /**
   * Delete business
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Updated profile
   */
  async deleteBusiness(userId, businessId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    if (!profile.businesses || profile.businesses.length === 0) {
      throw new Error("No businesses found");
    }

    const businessIndex = profile.businesses.findIndex(
      (b) => b.businessId === businessId,
    );
    if (businessIndex === -1) {
      throw new Error("Business not found");
    }

    const businessToDelete = profile.businesses[businessIndex];
    const wasPrimary = businessToDelete.isPrimary;

    // Remove business
    profile.businesses.splice(businessIndex, 1);

    // If deleted business was primary, set first remaining business as primary
    if (wasPrimary && profile.businesses.length > 0) {
      profile.businesses[0].isPrimary = true;
    }

    // Mark the array as modified for Mongoose
    profile.markModified("businesses");
    await profile.save();

    // Audit log
    try {
      const user = await User.findById(userId).populate("role").lean();
      const roleSlug =
        user && user.role && user.role.slug ? user.role.slug : "business_owner";

      await AuditLog.create({
        userId,
        eventType: "business_deleted",
        fieldChanged: "businesses",
        oldValue: JSON.stringify(businessToDelete),
        newValue: "",
        role: roleSlug,
        metadata: {
          businessId,
          businessName: businessToDelete.businessName,
          wasPrimary,
          newPrimaryBusinessId:
            wasPrimary && profile.businesses.length > 0
              ? profile.businesses[0].businessId
              : null,
        },
      });
    } catch (error) {
      console.error("Error creating audit log for business delete:", error);
    }

    return profile;
  }

  /**
   * Set business as primary
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID to set as primary
   * @returns {Promise<object>} Updated profile
   */
  async setPrimaryBusiness(userId, businessId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    if (business.isPrimary) {
      return profile; // Already primary
    }

    // Unset current primary
    if (profile.businesses) {
      profile.businesses.forEach((b) => {
        b.isPrimary = false;
      });
    }

    // Set new primary
    business.isPrimary = true;
    business.updatedAt = new Date();

    // Mark the array as modified for Mongoose
    profile.markModified("businesses");
    await profile.save();

    // Audit log
    try {
      const user = await User.findById(userId).populate("role").lean();
      const roleSlug =
        user && user.role && user.role.slug ? user.role.slug : "business_owner";

      await AuditLog.create({
        userId,
        eventType: "primary_business_changed",
        fieldChanged: "businesses",
        oldValue: "",
        newValue: JSON.stringify(business),
        role: roleSlug,
        metadata: {
          businessId,
          businessName: business.businessName,
        },
      });
    } catch (error) {
      console.error(
        "Error creating audit log for primary business change:",
        error,
      );
    }

    return profile;
  }

  /**
   * Update risk profile for specific business
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @param {object} riskProfileData - Risk profile data
   * @returns {Promise<object>} Updated profile
   */
  async updateBusinessRiskProfile(userId, businessId, riskProfileData) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    // Combine business data with risk profile for calculation
    const combinedData = {
      ...business.toObject(),
      riskProfile: {
        ...business.riskProfile,
        ...riskProfileData,
      },
      businessSize:
        riskProfileData.businessSize ?? business.riskProfile?.businessSize,
      annualRevenue:
        riskProfileData.annualRevenue ?? business.riskProfile?.annualRevenue,
    };

    // Recalculate risk level
    const riskLevel = calculateRiskLevel(combinedData);

    // Update risk profile
    business.riskProfile = {
      ...business.riskProfile,
      ...riskProfileData,
      riskLevel,
    };
    business.updatedAt = new Date();

    // Mark the array as modified for Mongoose
    profile.markModified("businesses");
    await profile.save();

    // Audit log
    try {
      const user = await User.findById(userId).populate("role").lean();
      const roleSlug =
        user && user.role && user.role.slug ? user.role.slug : "business_owner";

      await AuditLog.create({
        userId,
        eventType: "risk_profile_updated",
        fieldChanged: "riskProfile",
        oldValue: JSON.stringify(business.riskProfile),
        newValue: JSON.stringify(business.riskProfile),
        role: roleSlug,
        metadata: {
          businessId,
          businessName: business.businessName,
          riskLevel,
        },
      });
    } catch (error) {
      console.error("Error creating audit log for risk profile update:", error);
    }

    return profile;
  }

  /**
   * Get businesses array from profile
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of businesses
   */
  async getBusinesses(userId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return [];
    }
    return profile.businesses || [];
  }

  /**
   * Get single business by ID
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object|null>} Business object or null
   */
  async getBusiness(userId, businessId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }
    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    return business || null;
  }

  async updateBusinessStatus(userId, businessId, data) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }
    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }
    const valid = ["active", "inactive", "closed"];
    if (data.businessStatus && valid.includes(data.businessStatus)) {
      business.businessStatus = data.businessStatus;
    }
    business.updatedAt = new Date();
    profile.markModified("businesses");
    await profile.save();
    return profile;
  }

  /**
   * Confirm requirements checklist viewed
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Updated profile
   */
  async confirmRequirementsChecklist(userId, businessId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    if (!business.requirementsChecklist.viewedAt) {
      business.requirementsChecklist.viewedAt = new Date();
    }
    if (!business.requirementsChecklist.confirmed) {
      business.requirementsChecklist.confirmed = true;
      business.requirementsChecklist.confirmedAt = new Date();
    }
    if (business.applicationStatus === "draft") {
      business.applicationStatus = "requirements_viewed";
    }
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    return profile;
  }

  /**
   * Mark requirements PDF as downloaded
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Updated profile
   */
  async markRequirementsPdfDownloaded(userId, businessId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    business.requirementsChecklist.pdfDownloaded = true;
    business.requirementsChecklist.pdfDownloadedAt = new Date();
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    return profile;
  }

  /**
   * Update LGU documents
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @param {object} documents - Document URLs
   * @returns {Promise<object>} Updated profile
   */
  async updateLGUDocuments(userId, businessId, documents) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    business.lguDocuments = {
      ...business.lguDocuments,
      ...documents,
    };
    const lguProgressStatuses = [
      "draft",
      "requirements_viewed",
      "form_completed",
      "documents_uploaded",
    ];
    if (lguProgressStatuses.includes(business.applicationStatus)) {
      business.applicationStatus = "documents_uploaded";
    }
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    return profile;
  }

  /**
   * Update BIR registration information
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @param {object} birData - BIR registration data
   * @returns {Promise<object>} Updated profile
   */
  async updateBIRRegistration(userId, businessId, birData) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    business.birRegistration = {
      ...business.birRegistration,
      ...birData,
    };
    const hasBirData = Boolean(
      birData?.paymentReceiptUrl ||
      birData?.registrationNumber ||
      birData?.certificateUrl ||
      birData?.booksOfAccountsUrl ||
      birData?.authorityToPrintUrl,
    );
    const birProgressStatuses = [
      "draft",
      "requirements_viewed",
      "form_completed",
      "documents_uploaded",
      "bir_registered",
    ];
    if (
      hasBirData &&
      birProgressStatuses.includes(business.applicationStatus)
    ) {
      business.applicationStatus = "bir_registered";
    }
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    return profile;
  }

  /**
   * Update other agency registrations
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @param {object} agencyData - Agency registration data
   * @returns {Promise<object>} Updated profile
   */
  async updateOtherAgencyRegistrations(userId, businessId, agencyData) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    business.otherAgencyRegistrations = {
      ...business.otherAgencyRegistrations,
      ...agencyData,
    };
    if (
      business.applicationStatus === "bir_registered" &&
      agencyData.hasEmployees
    ) {
      business.applicationStatus = "agencies_registered";
    } else if (
      business.applicationStatus === "bir_registered" &&
      !agencyData.hasEmployees
    ) {
      // If no employees, skip to ready for submission
      business.applicationStatus = "agencies_registered";
    }
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    return profile;
  }

  /**
   * Submit business application to LGU
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Updated profile with reference number
   */
  async submitBusinessApplication(userId, businessId) {
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      throw new Error("Business not found");
    }

    // Validate that all required steps are completed
    if (
      business.applicationStatus !== "agencies_registered" &&
      business.applicationStatus !== "bir_registered"
    ) {
      throw new Error(
        "Cannot submit: application is not complete. Please complete all required steps.",
      );
    }

    // Generate reference number: BR-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSeq = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const referenceNumber = `BR-${dateStr}-${randomSeq}`;

    business.applicationReferenceNumber = referenceNumber;
    business.applicationStatus = "submitted";
    business.submittedAt = new Date();
    business.submittedToLguOfficer = true;
    business.isSubmitted = true;
    business.updatedAt = new Date();

    profile.markModified("businesses");
    await profile.save();

    // Create notifications for LGU Officers when business owner submits documents
    try {
      const notificationService = require("../services/notificationService");
      const User = require("../models/User");
      const Role = require("../models/Role");

      // Get LGU Officer role
      const lguOfficerRole = await Role.findOne({ slug: "lgu_officer" }).lean();
      if (lguOfficerRole) {
        // Get all active LGU Officers
        const lguOfficers = await User.find({
          role: lguOfficerRole._id,
          isActive: true,
        }).lean();

        // Create notification for each LGU Officer
        const notificationPromises = lguOfficers.map((officer) =>
          notificationService
            .createNotification(
              officer._id,
              "application_status_update",
              "New Application Submitted",
              `A new business application "${business.businessName}" (Reference: ${referenceNumber}) has been submitted and is ready for review.`,
              "business_application",
              businessId,
              {
                businessName: business.businessName,
                referenceNumber,
                businessId,
                submittedAt: business.submittedAt,
              },
            )
            .catch((err) => {
              console.error(
                `Failed to create notification for LGU Officer ${officer._id}:`,
                err,
              );
              return null;
            }),
        );

        await Promise.all(notificationPromises);
        console.log(
          `[submitBusinessApplication] Created notifications for ${lguOfficers.length} LGU Officer(s)`,
        );
      }
    } catch (notifError) {
      console.error(
        `[submitBusinessApplication] Failed to create LGU Officer notifications:`,
        notifError,
      );
      // Don't throw - notification failure shouldn't break the submission process
    }

    // Audit log
    try {
      const user = await User.findById(userId).populate("role").lean();
      const roleSlug =
        user && user.role && user.role.slug ? user.role.slug : "business_owner";

      await AuditLog.create({
        userId,
        eventType: "business_application_submitted",
        fieldChanged: "applicationStatus",
        oldValue: business.applicationStatus,
        newValue: "submitted",
        role: roleSlug,
        metadata: {
          businessId,
          businessName: business.businessName,
          referenceNumber,
        },
      });
    } catch (error) {
      console.error(
        "Error creating audit log for application submission:",
        error,
      );
    }

    return profile;
  }

  /**
   * Get business application status
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Application status information
   */
  async getBusinessApplicationStatus(userId, businessId) {
    // Use lean() to bypass Mongoose caching and get fresh data directly from database
    // This ensures we always get the latest status, including updates from LGU officers
    const profile = await BusinessProfile.findOne({ userId }).lean();
    if (!profile) {
      console.log(
        `[getBusinessApplicationStatus] Profile not found for userId: ${userId}`,
      );
      throw new Error("Business profile not found");
    }

    const business = profile.businesses?.find(
      (b) => b.businessId === businessId,
    );
    if (!business) {
      console.log(
        `[getBusinessApplicationStatus] Business not found: businessId=${businessId}, userId=${userId}`,
      );
      throw new Error("Business not found");
    }

    // Fetch officer details if reviewedBy exists
    let reviewingOfficer = null;
    if (business.reviewedBy) {
      try {
        const mongoose = require("mongoose");
        const User = mongoose.model("User");
        reviewingOfficer = await User.findById(business.reviewedBy)
          .select("name email phone")
          .lean();
      } catch (err) {
        console.log("Error fetching officer details:", err.message);
      }
    }

    const applicationStatus = business.applicationStatus || "draft";
    console.log(
      `[getBusinessApplicationStatus] Retrieved status '${applicationStatus}' for businessId=${businessId}, userId=${userId}`,
    );

    // Return the current applicationStatus from the database
    // This will reflect any updates made by LGU officers (e.g., under_review, approved, rejected)
    return {
      businessId: business.businessId,
      businessName: business.businessName,
      applicationStatus: applicationStatus,
      applicationReferenceNumber: business.applicationReferenceNumber,
      submittedAt: business.submittedAt,
      submittedToLguOfficer: business.submittedToLguOfficer,
      reviewedBy: reviewingOfficer || business.reviewedBy, // Use populated officer details if available
      reviewedAt: business.reviewedAt,
      reviewComments: business.reviewComments,
      rejectionReason: business.rejectionReason,
      requirementsConfirmed: business.requirementsChecklist?.confirmed || false,
      documentsUploaded: !!business.lguDocuments,
      birRegistered: !!business.birRegistration?.certificateUrl,
      agenciesRegistered: business.otherAgencyRegistrations?.hasEmployees
        ? business.otherAgencyRegistrations.sss?.registered ||
          business.otherAgencyRegistrations.philhealth?.registered ||
          business.otherAgencyRegistrations.pagibig?.registered
        : true, // If no employees, considered registered
    };
  }
}

module.exports = new BusinessProfileService();
