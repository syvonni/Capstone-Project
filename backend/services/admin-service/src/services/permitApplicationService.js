const mongoose = require("mongoose");
const BusinessProfile = require("../models/BusinessProfile");
const User = require("../models/User");
const Role = require("../models/Role"); // Ensure Role model is registered
const { logAuditEvent } = require("../lib/auditClient");
const crypto = require("crypto");
const sendEmail = require("../lib/mailer").sendEmail;
const {
  buildNotificationEmailBody,
} = require("../../../../shared/lib/emailTemplateBuilder");

// Import decryption utility for aggregation results (aggregation bypasses Mongoose hooks)
let decrypt;
try {
  decrypt = require("../../../../shared/lib/fieldCipher").decrypt;
} catch (e) {
  decrypt = (v) => v; // fallback if not available
}

/**
 * Convert MongoDB Binary/Buffer to hex string (for ObjectId fields from aggregation)
 */
function bufferToHex(buf) {
  if (!buf) return null;
  if (buf.buffer && typeof buf.buffer === "object") {
    // It's a Binary type with buffer property
    const bytes = Object.values(buf.buffer);
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  if (Buffer.isBuffer(buf)) {
    return buf.toString("hex");
  }
  return buf;
}

/**
 * Decrypt string fields in an object recursively
 */
function decryptObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (Buffer.isBuffer(obj)) return obj;
  if (obj._bsontype === "ObjectId") return String(obj);
  if (Array.isArray(obj)) {
    return obj.map((item) => decryptObject(item));
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      // Preserve Date objects; recursing into Date turns them into {}
      result[key] = value;
      continue;
    }

    // Handle ObjectId fields that come as Binary/Buffer from aggregation
    if (
      key === "userId" ||
      key === "_id" ||
      key === "reviewedBy" ||
      key === "_businessId"
    ) {
      result[key] = bufferToHex(value) || value;
    } else if (typeof value === "string") {
      result[key] = decrypt(value);
    } else if (value && typeof value === "object") {
      result[key] = decryptObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Find a BusinessProfile by business subdocument ID (tries _id first, then businessId)
 * Note: _id is not encrypted, businessId may be encrypted
 */
async function findProfileByBusinessId(targetId) {
  const mongoose = require("mongoose");
  // Try _id first (not encrypted, more reliable)
  let profile = null;
  if (mongoose.Types.ObjectId.isValid(targetId)) {
    profile = await BusinessProfile.findOne({
      "businesses._id": new mongoose.Types.ObjectId(targetId),
    });
  }
  if (!profile) {
    // Fallback to businessId (may be encrypted)
    profile = await BusinessProfile.findOne({
      "businesses.businessId": targetId,
    });
  }
  return profile;
}

/**
 * Find business index within a profile by targetId (matches businessId or _id)
 */
function findBusinessIndex(profile, targetId) {
  return profile.businesses.findIndex(
    (b) =>
      String(b.businessId) === String(targetId) ||
      String(b._id) === String(targetId),
  );
}

/**
 * Verify officer role - decrypt slug if needed since .lean() returns encrypted values
 * @returns {{ officer: object, roleSlug: string }}
 */
async function verifyOfficerRole(officerId) {
  let officer;
  try {
    officer = await User.findById(officerId).populate("role").lean();
  } catch (_) {
    officer = await User.findById(officerId).lean();
    if (officer && officer.role) {
      const role = await Role.findById(officer.role).lean();
      officer.role = role;
    }
  }
  if (!officer) throw new Error("Officer not found");
  const rawSlug = officer.role?.slug || "";
  const roleSlug = decrypt(rawSlug) || rawSlug;
  if (!["lgu_officer", "staff"].includes(roleSlug)) {
    throw new Error("Unauthorized: Only LGU officers can review applications");
  }
  return { officer, roleSlug };
}

/** Build a simple application history for timeline (reverse chronological) */
function buildApplicationHistory(business) {
  const events = [];
  if (business.createdAt) {
    events.push({
      event: "created",
      at: business.createdAt,
      label: "Draft saved",
    });
  }
  if (business.submittedAt) {
    events.push({
      event: "submitted",
      at: business.submittedAt,
      label: "Submitted by applicant",
    });
  }
  if (business.reviewedAt) {
    const status = business.applicationStatus || "";
    if (status === "under_review") {
      events.push({
        event: "review_started",
        at: business.reviewedAt,
        label: "Review started",
      });
    } else if (status === "needs_revision") {
      events.push({
        event: "needs_revision",
        at: business.reviewedAt,
        label: "Marked needs revision",
      });
    } else if (status === "approved") {
      events.push({
        event: "approved",
        at: business.reviewedAt,
        label: "Approved",
      });
    } else if (status === "rejected") {
      events.push({
        event: "rejected",
        at: business.reviewedAt,
        label: "Rejected",
      });
    } else {
      events.push({
        event: "reviewed",
        at: business.reviewedAt,
        label: "Reviewed",
      });
    }
  }
  if (
    business.updatedAt &&
    !events.some(
      (e) =>
        e.at && e.at.getTime && e.at.getTime() === business.updatedAt.getTime(),
    )
  ) {
    events.push({
      event: "updated",
      at: business.updatedAt,
      label: "Last updated",
    });
  }
  events.sort((a, b) => {
    const tA = a.at ? new Date(a.at).getTime() : 0;
    const tB = b.at ? new Date(b.at).getTime() : 0;
    return tB - tA;
  });
  return events;
}

class PermitApplicationService {
  /**
   * Get permit applications with filters and pagination
   * @param {object} filters - Filter criteria
   * @param {object} pagination - Pagination options
   * @returns {Promise<object>} Applications list with pagination info
   */
  async getApplications(filters = {}, pagination = {}) {
    const {
      status,
      businessName,
      applicationType,
      dateFrom,
      dateTo,
      applicationReferenceNumber,
      ownerId,
      reviewedBy,
    } = filters;

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;
    const ownerObjectId =
      ownerId && mongoose.Types.ObjectId.isValid(ownerId)
        ? new mongoose.Types.ObjectId(ownerId)
        : null;

    // Parse status filter for post-decryption filtering
    const statusList = status ? status.split(",").map((s) => s.trim()) : null;

    // Build aggregation pipeline
    // NOTE: We cannot filter by encrypted fields (applicationStatus, businessName) in aggregation
    // because aggregation bypasses Mongoose decryption hooks. We filter after decryption instead.
    const pipeline = [
      // First match documents that have businesses array
      {
        $match: {
          businesses: { $exists: true, $ne: [] },
          ...(ownerObjectId && { userId: ownerObjectId }),
        },
      },
      // Unwind the businesses array
      { $unwind: "$businesses" },
      // Only filter by non-encrypted fields (dates)
      {
        $match: {
          "businesses.applicationStatus": { $exists: true, $ne: null },
          ...(dateFrom || dateTo
            ? {
                "businesses.submittedAt": {
                  ...(dateFrom && { $gte: new Date(dateFrom) }),
                  ...(dateTo && { $lte: new Date(dateTo) }),
                },
              }
            : {}),
        },
      },
      {
        $project: {
          userId: 1,
          _businessId: "$businesses._id", // MongoDB subdocument _id (not encrypted)
          businessId: "$businesses.businessId",
          businessName: "$businesses.businessName",
          applicationStatus: "$businesses.applicationStatus",
          applicationReferenceNumber: "$businesses.applicationReferenceNumber",
          submittedAt: "$businesses.submittedAt",
          ownerFullName: "$businesses.ownerFullName",
          applicationType: {
            $cond: [
              { $ne: ["$businesses.applicationStatus", null] },
              "new_registration",
              "renewal",
            ],
          },
          aiValidation: "$businesses.aiValidation",
          reviewedBy: "$businesses.reviewedBy",
          reviewedAt: "$businesses.reviewedAt",
          createdAt: "$businesses.createdAt",
          updatedAt: "$businesses.updatedAt",
          // Fields needed by AddBusinessForm for officer draft editing
          formType: "$businesses.formType",
          permitFormId: "$businesses.permitFormId",
          formData: "$businesses.formData",
          category: "$businesses.category",
          createdByOfficer: "$businesses.createdByOfficer",
        },
      },
      { $sort: { submittedAt: -1, createdAt: -1 } },
    ];

    const rawResults = await BusinessProfile.aggregate(pipeline);
    // Decrypt aggregation results (aggregation bypasses Mongoose decryption hooks)
    let allData = rawResults.map((doc) => decryptObject(doc));

    // Post-decryption filtering by status (encrypted fields can't be filtered in aggregation)
    if (statusList && statusList.length > 0) {
      allData = allData.filter((app) =>
        statusList.includes(app.applicationStatus),
      );
    }

    // Fallback owner filter for non-ObjectId identifiers
    if (ownerId && !ownerObjectId) {
      allData = allData.filter((app) => String(app.userId) === String(ownerId));
    }

    // Post-decryption filtering by reviewedBy (stored as string or ObjectId, compare as strings)
    if (reviewedBy) {
      allData = allData.filter(
        (app) =>
          app.reviewedBy && String(app.reviewedBy) === String(reviewedBy),
      );
    }

    // Post-decryption filtering by businessName (encrypted field)
    if (businessName) {
      const searchLower = businessName.toLowerCase();
      allData = allData.filter(
        (app) =>
          app.businessName &&
          app.businessName.toLowerCase().includes(searchLower),
      );
    }

    // Post-decryption filtering by applicationReferenceNumber (encrypted field)
    if (applicationReferenceNumber) {
      allData = allData.filter(
        (app) => app.applicationReferenceNumber === applicationReferenceNumber,
      );
    }

    // Apply pagination after filtering
    const total = allData.length;
    const data = allData.slice(skip, skip + limit);

    // Populate user information for each application
    const applications = await Promise.all(
      data.map(async (app) => {
        try {
          // Convert userId to string if it's a buffer/ObjectId
          const userIdStr =
            app.userId?._id?.toString?.() ||
            app.userId?.toString?.() ||
            String(app.userId);
          const rawUser = await User.findById(userIdStr)
            .select("email firstName lastName")
            .lean();
          // Decrypt user fields (User model may have encrypted fields)
          const user = rawUser ? decryptObject(rawUser) : null;

          // Get business owner full name with priority:
          // 1. ownerFullName from business registration (already in app data)
          // 2. User's firstName + lastName (fallback)
          // Note: For list view, we don't fetch full profile to avoid performance issues
          // Full ownerIdentity.fullName is available in getApplicationById detail view
          const ownerFullName =
            (app.ownerFullName && app.ownerFullName.trim()) ||
            (user
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
              : "") ||
            user?.email ||
            "N/A";

          // Use _businessId (subdocument _id) as primary identifier since businessId may be encrypted
          const appId = app._businessId || app.businessId;
          return {
            applicationId: appId,
            businessId: appId,
            userId: app.userId,
            businessName: app.businessName,
            applicationReferenceNumber:
              app.applicationReferenceNumber ||
              `APP-${String(appId).slice(-8)}`,
            status: app.applicationStatus || "draft",
            applicationType: app.applicationType,
            submittedAt: app.submittedAt,
            aiValidation: app.aiValidation || { completed: false },
            hasActiveAppeal: app.hasActiveAppeal || false,
            appealExhausted: app.appealExhausted || false,
            businessOwner: user
              ? {
                  email: user.email,
                  name: ownerFullName,
                  firstName: user.firstName,
                  lastName: user.lastName,
                }
              : null,
            reviewedBy: app.reviewedBy || null,
            reviewedAt: app.reviewedAt || null,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt,
            // Fields needed by AddBusinessForm for officer draft editing
            formType: app.formType || "",
            permitFormId: app.permitFormId || null,
            formData: app.formData || {},
            category: app.category || "",
            createdByOfficer: app.createdByOfficer || false,
          };
        } catch (err) {
          // Use _businessId (subdocument _id) as primary identifier since businessId may be encrypted
          const appId = app._businessId || app.businessId;
          console.error(`Error processing application ${appId}:`, err);
          // Return basic info even if user lookup fails
          return {
            applicationId: appId,
            businessId: appId,
            userId: app.userId,
            businessName: app.businessName,
            applicationReferenceNumber:
              app.applicationReferenceNumber ||
              `APP-${String(appId).slice(-8)}`,
            status: app.applicationStatus || "draft",
            applicationType: app.applicationType,
            submittedAt: app.submittedAt,
            aiValidation: app.aiValidation || { completed: false },
            hasActiveAppeal: app.hasActiveAppeal || false,
            appealExhausted: app.appealExhausted || false,
            businessOwner: null,
            reviewedBy: app.reviewedBy || null,
            reviewedAt: app.reviewedAt || null,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt,
            formType: app.formType || "",
            permitFormId: app.permitFormId || null,
            formData: app.formData || {},
            category: app.category || "",
            createdByOfficer: app.createdByOfficer || false,
          };
        }
      }),
    );

    // Populate officer names for reviewedBy field
    const officerIds = [
      ...new Set(applications.map((app) => app.reviewedBy).filter(Boolean)),
    ];
    const officersMap = new Map();
    if (officerIds.length > 0) {
      const officers = await User.find({ _id: { $in: officerIds } })
        .select("firstName lastName email")
        .lean();
      for (const officer of officers) {
        const decrypted = decryptObject(officer);
        const officerId = String(officer._id);
        officersMap.set(
          officerId,
          `${decrypted.firstName || ""} ${decrypted.lastName || ""}`.trim() ||
            decrypted.email ||
            "Unknown",
        );
      }
    }

    // Attach officer names to applications
    const applicationsWithOfficerNames = applications.map((app) => ({
      ...app,
      reviewedByName: app.reviewedBy
        ? officersMap.get(String(app.reviewedBy))
        : null,
    }));

    return {
      applications: applicationsWithOfficerNames,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single application by ID
   * @param {string} applicationId - Application/Business ID
   * @param {string} businessId - Business ID (optional, same as applicationId for new registrations)
   * @returns {Promise<object>} Application details
   */
  async getApplicationById(applicationId, businessId = null) {
    const targetBusinessId = businessId || applicationId;

    // Search by both businessId and _id since applications may use either identifier
    let profile = await BusinessProfile.findOne({
      "businesses.businessId": targetBusinessId,
    }).lean();

    // If not found by businessId, try by _id
    if (!profile) {
      profile = await BusinessProfile.findOne({
        "businesses._id": targetBusinessId,
      }).lean();
    }

    if (!profile) {
      throw new Error("Application not found");
    }

    // Decrypt profile fields (aggregation/lean bypasses Mongoose hooks)
    const decryptedProfile = decryptObject(profile);

    const business = decryptedProfile.businesses.find(
      (b) =>
        String(b.businessId) === String(targetBusinessId) ||
        String(b._id) === String(targetBusinessId),
    );
    if (!business) {
      throw new Error("Application not found");
    }

    const rawUser = await User.findById(decryptedProfile.userId)
      .select(
        "email firstName lastName phoneNumber middleName suffix sex dateOfBirth maritalStatus placeOfBirth nationality fatherName motherName distinctiveMark highestEducationalAttainment address",
      )
      .lean();
    // Decrypt user fields
    const user = rawUser ? decryptObject(rawUser) : null;

    // Get business owner full name with priority:
    // 1. ownerIdentity.fullName (from BusinessProfile - most accurate)
    // 2. businessRegistration.ownerFullName (from business registration form)
    // 3. User's firstName + lastName (fallback)
    const ownerFullName =
      (decryptedProfile.ownerIdentity?.fullName &&
        decryptedProfile.ownerIdentity.fullName.trim()) ||
      (business.ownerFullName && business.ownerFullName.trim()) ||
      (user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "") ||
      "N/A";

    // Helper function to get document URL (prioritize IPFS CID)
    const getDocumentUrl = (
      legacyUrl,
      ipfsCid,
      gatewayUrl = process.env.IPFS_GATEWAY_URL ||
        "http://localhost:8080/ipfs/",
    ) => {
      if (ipfsCid && ipfsCid.trim()) {
        const cleanGateway = gatewayUrl.endsWith("/")
          ? gatewayUrl
          : `${gatewayUrl}/`;
        return `${cleanGateway}${ipfsCid.trim()}`;
      }
      return legacyUrl || "";
    };

    const lguDocs = business.lguDocuments || {};
    const birReg = business.birRegistration || {};
    const otherAgencies = business.otherAgencyRegistrations || {};

    // Merge owner identity: use profile.ownerIdentity and fill gaps from business/user so review UI always has owner data
    const profileOwner = decryptedProfile.ownerIdentity || {};
    const idPictureUrl = getDocumentUrl(
      lguDocs.idPicture,
      lguDocs.idPictureIpfsCid,
    );
    const ownerIdentity = {
      fullName:
        (profileOwner.fullName && profileOwner.fullName.trim()) ||
        (business.ownerFullName && business.ownerFullName.trim()) ||
        ownerFullName,
      dateOfBirth: profileOwner.dateOfBirth || undefined,
      idType:
        (profileOwner.idType && profileOwner.idType.trim()) ||
        (business.governmentIdType && business.governmentIdType.trim()) ||
        "",
      idNumber:
        (profileOwner.idNumber && profileOwner.idNumber.trim()) ||
        (business.governmentIdNumber && business.governmentIdNumber.trim()) ||
        "",
      idFileUrl:
        (profileOwner.idFileUrl && profileOwner.idFileUrl.trim()) ||
        idPictureUrl ||
        "",
      isSubmitted: profileOwner.isSubmitted,
    };

    // Prefer _id (never encrypted) over businessId (may still be encrypted after decryptObject)
    const resolvedBusinessId =
      business._id && String(business._id) !== "undefined"
        ? String(business._id)
        : business.businessId || business._id;

    return {
      applicationId: resolvedBusinessId,
      businessId: resolvedBusinessId,
      userId: decryptedProfile.userId,
      businessName: business.businessName,
      ownerName: ownerFullName,
      applicationReferenceNumber:
        business.applicationReferenceNumber ||
        `APP-${String(resolvedBusinessId).slice(-8)}`,
      status: business.applicationStatus || "draft",
      applicationType: business.applicationStatus
        ? "new_registration"
        : "renewal",
      submittedAt: business.submittedAt,
      submittedToLguOfficer: business.submittedToLguOfficer || false,
      isSubmitted: business.isSubmitted || false,
      reviewedBy: business.reviewedBy,
      reviewedByName: business.reviewedByName,
      reviewedAt: business.reviewedAt,
      reviewComments: business.reviewComments,
      rejectionReason: business.rejectionReason,
      // Appeal status fields
      hasActiveAppeal: business.hasActiveAppeal || false,
      appealExhausted: business.appealExhausted || false,
      appealId: business.appealId || "",
      // Per-field review decisions (accepted/rejected with optional reason)
      fieldReviewDecisions:
        business.fieldReviewDecisions &&
        typeof business.fieldReviewDecisions === "object"
          ? business.fieldReviewDecisions
          : {},
      pendingAction: business.pendingAction || null,
      // Permit form–driven application (for review UI)
      formType: business.formType || "",
      permitFormId: business.permitFormId || null,
      formData:
        business.formData && typeof business.formData === "object"
          ? business.formData
          : {},
      // Owner Identity (merged from profile + business so review detail always has owner data)
      ownerIdentity,
      // Complete Business Registration Data
      businessRegistration: {
        registeredBusinessName:
          business.registeredBusinessName || business.businessName,
        businessTradeName: business.businessTradeName,
        businessRegistrationType: business.businessRegistrationType,
        businessRegistrationNumber: business.businessRegistrationNumber,
        businessRegistrationDate: business.businessRegistrationDate,
        registrationAgency: business.registrationAgency,
        businessType: business.businessType,
        businessClassification: business.businessClassification,
        industryCategory: business.industryCategory,
        primaryLineOfBusiness: business.primaryLineOfBusiness,
        declaredCapitalInvestment: business.declaredCapitalInvestment || 0,
        numberOfBusinessUnits: business.numberOfBusinessUnits || 0,
        ownerFullName: business.ownerFullName,
        ownerPosition: business.ownerPosition,
        ownerNationality: business.ownerNationality,
        ownerResidentialAddress: business.ownerResidentialAddress,
        ownerTin: business.ownerTin,
        governmentIdType: business.governmentIdType,
        governmentIdNumber: business.governmentIdNumber,
        emailAddress: business.emailAddress,
        mobileNumber: business.mobileNumber,
        numberOfEmployees: business.numberOfEmployees || 0,
        withFoodHandlers: business.withFoodHandlers,
        declarantName: business.declarantName,
        declarationDate: business.declarationDate,
        certificationAccepted: business.certificationAccepted || false,
        businessStartDate: business.businessStartDate,
        industryClassification: business.industryClassification,
      },
      // Complete Location Data
      location: {
        ...business.location,
        businessAddress: business.businessAddress,
        unitBuildingName: business.unitBuildingName,
        street: business.street,
        barangay: business.barangay,
        cityMunicipality: business.cityMunicipality,
        businessLocationType: business.businessLocationType,
      },
      // Risk Profile
      riskProfile: business.riskProfile || {},
      // BIR Registration (with IPFS URL resolution)
      birRegistration: {
        ...birReg,
        certificateUrl: getDocumentUrl(
          birReg.certificateUrl,
          birReg.certificateIpfsCid,
        ),
        booksOfAccountsUrl: getDocumentUrl(
          birReg.booksOfAccountsUrl,
          birReg.booksOfAccountsIpfsCid,
        ),
        authorityToPrintUrl: getDocumentUrl(
          birReg.authorityToPrintUrl,
          birReg.authorityToPrintIpfsCid,
        ),
        paymentReceiptUrl: getDocumentUrl(
          birReg.paymentReceiptUrl,
          birReg.paymentReceiptIpfsCid,
        ),
      },
      // Other Agency Registrations (with IPFS URL resolution)
      otherAgencyRegistrations: {
        ...otherAgencies,
        hasEmployees: otherAgencies.hasEmployees || false,
        sss: {
          ...otherAgencies.sss,
          proofUrl: getDocumentUrl(
            otherAgencies.sss?.proofUrl,
            otherAgencies.sss?.proofIpfsCid,
          ),
        },
        philhealth: {
          ...otherAgencies.philhealth,
          proofUrl: getDocumentUrl(
            otherAgencies.philhealth?.proofUrl,
            otherAgencies.philhealth?.proofIpfsCid,
          ),
        },
        pagibig: {
          ...otherAgencies.pagibig,
          proofUrl: getDocumentUrl(
            otherAgencies.pagibig?.proofUrl,
            otherAgencies.pagibig?.proofIpfsCid,
          ),
        },
      },
      // Requirements Checklist
      requirementsChecklist: business.requirementsChecklist || {},
      // Documents: fixed keys for backward compat + all dynamic keys from lguDocuments (*IpfsCid) so form-defined docs show in review
      documents: (() => {
        const fixed = {
          idPicture: getDocumentUrl(
            lguDocs.idPicture,
            lguDocs.idPictureIpfsCid,
          ),
          ctc: getDocumentUrl(lguDocs.ctc, lguDocs.ctcIpfsCid),
          barangayClearance: getDocumentUrl(
            lguDocs.barangayClearance,
            lguDocs.barangayClearanceIpfsCid,
          ),
          dtiSecCda: getDocumentUrl(
            lguDocs.dtiSecCda,
            lguDocs.dtiSecCdaIpfsCid,
          ),
          leaseOrLandTitle: getDocumentUrl(
            lguDocs.leaseOrLandTitle,
            lguDocs.leaseOrLandTitleIpfsCid,
          ),
          occupancyPermit: getDocumentUrl(
            lguDocs.occupancyPermit,
            lguDocs.occupancyPermitIpfsCid,
          ),
          healthCertificate: getDocumentUrl(
            lguDocs.healthCertificate,
            lguDocs.healthCertificateIpfsCid,
          ),
        };
        const dynamic = {};
        Object.keys(lguDocs || {}).forEach((k) => {
          if (k.endsWith("IpfsCid")) {
            const baseKey = k.slice(0, -7); // 'IpfsCid' is 7 chars
            dynamic[baseKey] = getDocumentUrl(null, lguDocs[k]);
          }
        });
        return { ...fixed, ...dynamic };
      })(),
      // AI Validation
      aiValidation: business.aiValidation || { completed: false },
      // Business Owner (with correct full name priority + PIS fields for Owner tab)
      businessOwner: user
        ? {
            email: user.email,
            name: ownerFullName,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            suffix: user.suffix,
            sex: user.sex,
            dateOfBirth: user.dateOfBirth,
            maritalStatus: user.maritalStatus,
            placeOfBirth: user.placeOfBirth,
            nationality: user.nationality,
            fatherName: user.fatherName,
            motherName: user.motherName,
            distinctiveMark: user.distinctiveMark,
            highestEducationalAttainment: user.highestEducationalAttainment,
            address: user.address
              ? {
                  street: user.address.street,
                  streetAddress: user.address.street,
                  barangay: user.address.barangay,
                  barangayName: user.address.barangay,
                  city: user.address.city,
                  cityName: user.address.city,
                  province: user.address.province,
                  provinceName: user.address.province,
                  zipCode: user.address.zipCode,
                  postalCode: user.address.zipCode,
                }
              : null,
          }
        : null,
      // Legacy businessDetails for backward compatibility
      businessDetails: {
        businessName: business.businessName,
        registeredBusinessName:
          business.registeredBusinessName || business.businessName,
        businessTradeName: business.businessTradeName,
        businessRegistrationType: business.businessRegistrationType,
        businessRegistrationNumber: business.businessRegistrationNumber,
        taxIdentificationNumber: business.taxIdentificationNumber,
        location: business.location,
        businessType: business.businessType,
        numberOfEmployees: business.numberOfEmployees,
        withFoodHandlers: business.withFoodHandlers,
      },
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      // Application history for timeline (built from existing fields)
      applicationHistory: buildApplicationHistory(business),
    };
  }

  /**
   * Start reviewing an application (set status to under_review)
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @param {string} officerId - LGU Officer user ID
   * @returns {Promise<object>} Updated application
   */
  async startReview(applicationId, businessId, officerId) {
    const { officer, roleSlug } = await verifyOfficerRole(officerId);

    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");

    const businessIndex = findBusinessIndex(profile, targetId);
    if (businessIndex === -1) throw new Error("Application not found");

    const business = profile.businesses[businessIndex];
    const oldStatus = business.applicationStatus || "draft";

    // Only allow starting review if status is 'submitted', 'resubmit' or 'needs_revision'
    if (!["submitted", "resubmit", "needs_revision"].includes(oldStatus)) {
      const result = await this.getApplicationById(applicationId, businessId);
      if (
        oldStatus === "under_review" &&
        business.reviewedBy &&
        String(business.reviewedBy) !== String(officerId)
      ) {
        try {
          const reviewer = await User.findById(business.reviewedBy).lean();
          if (reviewer) {
            result.lockedByOfficer =
              `${reviewer.firstName || ""} ${reviewer.lastName || ""}`.trim() ||
              "Another officer";
          }
        } catch {
          /* ignore */
        }
      }
      return result;
    }

    // Use officer from verifyOfficerRole to get name for reviewedByName
    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`.trim()
      : "Officer";

    // Update status to under_review using findOneAndUpdate to bypass enum validation on encrypted fields
    const updateQuery = {
      $set: {
        [`businesses.${businessIndex}.applicationStatus`]: "under_review",
        [`businesses.${businessIndex}.reviewedBy`]: officerId,
        [`businesses.${businessIndex}.reviewedByName`]: officerName,
        [`businesses.${businessIndex}.reviewedAt`]: new Date(),
        [`businesses.${businessIndex}.updatedAt`]: new Date(),
      },
    };

    console.log(
      `[startReview] Updating status from '${oldStatus}' to 'under_review' for business ${targetId}, userId: ${profile.userId}`,
    );

    // Save the profile using updateOne to bypass Mongoose validation (encrypted enum fields fail validation)
    try {
      await BusinessProfile.updateOne({ _id: profile._id }, updateQuery);
      console.log(`[startReview] Profile updated successfully`);

      // Log audit event for claim
      await logAuditEvent(
        "application_claimed",
        officerId,
        "BusinessProfile",
        businessId || applicationId,
        {
          applicationId: businessId || applicationId,
          businessName: business.businessName,
          applicationStatus: oldStatus,
          applicationReferenceNumber: business.applicationReferenceNumber,
          officerName,
          role: roleSlug,
        },
      );

      // Create notification for business owner
      try {
        const notificationService = require("./notificationService");
        await notificationService.createNotification(
          profile.userId,
          "application_review_started",
          "Application Review Started",
          `Your application "${business.businessName}" is now being reviewed by an LGU Officer.`,
          "business_application",
          businessId || applicationId,
        );
      } catch (notifError) {
        console.error(
          `[startReview] Failed to create notification:`,
          notifError,
        );
        // Don't throw - notification failure shouldn't break the review process
      }
    } catch (saveError) {
      console.error(`[startReview] Failed to save profile:`, saveError);
      throw new Error(`Failed to save status update: ${saveError.message}`);
    }

    // Re-fetch to verify status was saved correctly - search by _id since businessId is encrypted
    let verifyProfile = await BusinessProfile.findOne({
      "businesses._id": targetId,
    }).lean();
    if (!verifyProfile) {
      verifyProfile = await BusinessProfile.findOne({
        "businesses.businessId": targetId,
      }).lean();
    }

    if (!verifyProfile) {
      console.error(
        `[startReview] Verification failed: Profile not found after save`,
      );
      throw new Error("Failed to verify status update: Profile not found");
    }

    const verifyBusiness = verifyProfile.businesses?.find(
      (b) =>
        String(b._id) === String(targetId) ||
        String(b.businessId) === String(targetId),
    );
    if (!verifyBusiness) {
      console.error(
        `[startReview] Verification failed: Business not found after save`,
      );
      throw new Error("Failed to verify status update: Business not found");
    }

    // Decrypt status for comparison
    const verifyStatus =
      decrypt(verifyBusiness.applicationStatus) ||
      verifyBusiness.applicationStatus;
    if (verifyStatus !== "under_review") {
      console.error(
        `[startReview] Status verification failed: expected 'under_review', got '${verifyStatus}'`,
      );
      throw new Error(
        `Failed to verify status update: Expected 'under_review', got '${verifyStatus}'`,
      );
    }

    console.log(
      `[startReview] Status verified successfully: 'under_review' saved for business ${businessId || applicationId}, userId: ${profile.userId}`,
    );

    // Create audit log via centralized audit-service
    logAuditEvent(
      "permit_review_started",
      profile.userId,
      "BusinessProfile",
      businessId || applicationId,
      {
        applicationId: businessId || applicationId,
        businessId: businessId || applicationId,
        businessName: business.businessName,
        officerId,
        officerName: `${officer.firstName} ${officer.lastName}`,
        applicationReferenceNumber:
          business.applicationReferenceNumber ||
          `APP-${(businessId || applicationId).slice(-8)}`,
        role: roleSlug,
      },
    ).catch((err) => {
      console.error("[startReview] Failed to create audit log:", err);
    });

    // Return updated application
    return this.getApplicationById(applicationId, businessId);
  }

  /**
   * Review permit application
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @param {string} officerId - LGU Officer user ID
   * @param {string} decision - Decision: 'approve', 'reject', 'request_changes'
   * @param {string} comments - Review comments
   * @param {string} rejectionReason - Rejection reason (required if reject)
   * @returns {Promise<object>} Updated application
   */
  async reviewApplication(
    applicationId,
    businessId,
    officerId,
    decision,
    comments,
    rejectionReason = null,
  ) {
    // Validate decision
    const validDecisions = ["approve", "reject", "request_changes"];
    if (!validDecisions.includes(decision)) {
      throw new Error(
        `Invalid decision. Must be one of: ${validDecisions.join(", ")}`,
      );
    }

    // Validate rejection reason if rejecting
    if (decision === "reject" && !rejectionReason) {
      throw new Error(
        "Rejection reason is required when rejecting an application",
      );
    }

    const { officer, roleSlug } = await verifyOfficerRole(officerId);

    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");

    const businessIndex = findBusinessIndex(profile, targetId);
    if (businessIndex === -1) throw new Error("Application not found");

    const business = profile.businesses[businessIndex];
    const oldStatus = business.applicationStatus || "draft";

    // Prevent reviewing already finalized applications
    if (oldStatus === "approved" || oldStatus === "rejected") {
      throw new Error(
        `Cannot review application that is already ${oldStatus}. Application has reached a final decision.`,
      );
    }

    // Validate status transition
    const validTransitions = {
      submitted: ["under_review"],
      resubmit: ["under_review"],
      under_review: ["approved", "rejected", "needs_revision"],
      appeal_pending: [
        "approved",
        "rejected",
        "needs_revision",
        "under_review",
        "appeal_rejected",
      ],
      needs_revision: ["resubmit", "under_review"],
    };

    const targetStatus =
      decision === "approve"
        ? "approved"
        : decision === "reject"
          ? "rejected"
          : "needs_revision";

    if (
      !validTransitions[oldStatus] ||
      !validTransitions[oldStatus].includes(targetStatus)
    ) {
      throw new Error(
        `Invalid status transition from ${oldStatus} to ${targetStatus}. Allowed transitions from ${oldStatus}: ${validTransitions[oldStatus]?.join(", ") || "none"}`,
      );
    }

    // Determine new status
    let newStatus;
    if (decision === "approve") {
      newStatus = "approved";
    } else if (decision === "reject") {
      newStatus = "rejected";
    } else {
      newStatus = "needs_revision";
    }

    // Use officer from verifyOfficerRole to get name for reviewedByName
    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`.trim()
      : "Officer";

    // Update application status
    profile.businesses[businessIndex].applicationStatus = newStatus;
    profile.businesses[businessIndex].reviewedBy = officerId;
    profile.businesses[businessIndex].reviewedByName = officerName;
    profile.businesses[businessIndex].reviewedAt = new Date();
    // Save comments only if explicitly provided; preserve empty string if provided
    if (comments !== undefined && comments !== null) {
      const normalizedComments =
        typeof comments === "string"
          ? comments.trim()
          : String(comments).trim();
      profile.businesses[businessIndex].reviewComments = normalizedComments;
    }
    // Save rejection reason only if explicitly provided; preserve empty string if provided
    if (rejectionReason !== undefined && rejectionReason !== null) {
      const normalizedReason =
        typeof rejectionReason === "string"
          ? rejectionReason.trim()
          : String(rejectionReason).trim();
      profile.businesses[businessIndex].rejectionReason = normalizedReason;
    }

    console.log(
      `[reviewApplication] Saved reviewComments for businessId=${businessId || applicationId}:`,
      {
        comments: profile.businesses[businessIndex].reviewComments,
        rejectionReason: profile.businesses[businessIndex].rejectionReason,
        newStatus,
        decision,
      },
    );

    // Mark the businesses array as modified so Mongoose knows to save it
    profile.markModified("businesses");

    // Determine notification type and message based on new status
    let notificationType = "application_status_update";
    let notificationTitle = "Application Status Updated";
    let notificationMessage = `Your application "${business.businessName}" has been ${newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "marked as needing revision"}`;

    if (newStatus === "approved") {
      notificationType = "application_approved";
      notificationTitle = "Application Approved";
      notificationMessage = `Congratulations! Your application "${business.businessName}" has been approved.`;
    } else if (newStatus === "rejected") {
      notificationType = "application_rejected";
      notificationTitle = "Application Rejected";
      notificationMessage = `Your application "${business.businessName}" has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`;
    } else if (newStatus === "needs_revision") {
      notificationType = "application_needs_revision";
      notificationTitle = "Application Needs Revision";
      notificationMessage = `Your application "${business.businessName}" needs revision.${comments ? ` Comments: ${comments}` : ""}`;
    }

    // If transitioning to under_review, set it
    if (oldStatus === "submitted" && newStatus !== "submitted") {
      // Status will be set to the decision status
    }

    // Use updateOne to bypass Mongoose validation on encrypted enum fields
    const updateFields = {
      [`businesses.${businessIndex}.applicationStatus`]: newStatus,
      [`businesses.${businessIndex}.reviewedBy`]: officerId,
      [`businesses.${businessIndex}.reviewedByName`]: officerName,
      [`businesses.${businessIndex}.reviewedAt`]: new Date(),
      [`businesses.${businessIndex}.updatedAt`]: new Date(),
    };
    if (comments !== undefined && comments !== null) {
      updateFields[`businesses.${businessIndex}.reviewComments`] =
        typeof comments === "string"
          ? comments.trim()
          : String(comments).trim();
    }
    if (rejectionReason !== undefined && rejectionReason !== null) {
      updateFields[`businesses.${businessIndex}.rejectionReason`] =
        typeof rejectionReason === "string"
          ? rejectionReason.trim()
          : String(rejectionReason).trim();
    }
    await BusinessProfile.updateOne(
      { _id: profile._id },
      { $set: updateFields },
    );

    // Log audit event for application rejection
    if (newStatus === "rejected") {
      await logAuditEvent(
        "application_rejected",
        officerId,
        "BusinessProfile",
        businessId || applicationId,
        {
          rejectedByName: officerName,
          rejectionReason: rejectionReason || null,
          oldStatus,
          newStatus,
          businessName: business.businessName,
          applicationReferenceNumber: business.applicationReferenceNumber,
          role: roleSlug,
        },
      );
    }

    // Create notification for business owner
    try {
      const notificationService = require("./notificationService");
      await notificationService.createNotification(
        profile.userId,
        notificationType,
        notificationTitle,
        notificationMessage,
        "business_application",
        businessId || applicationId,
        {
          oldStatus,
          newStatus,
          comments: comments || null,
          rejectionReason: rejectionReason || null,
        },
      );
    } catch (notifError) {
      console.error(
        `[reviewApplication] Failed to create notification:`,
        notifError,
      );
      // Don't throw - notification failure shouldn't break the review process
    }

    // Auto-issue permit when application is approved
    if (newStatus === "approved") {
      try {
        const mongoose = require("mongoose");
        // Register Permit model if not already registered (shared MongoDB)
        let Permit;
        try {
          Permit = mongoose.model("Permit");
        } catch (_) {
          const permitSchema = new mongoose.Schema(
            {
              permitNumber: {
                type: String,
                required: true,
                unique: true,
                index: true,
              },
              businessId: { type: String, required: true, index: true },
              businessName: { type: String, required: true },
              ownerName: { type: String, required: true },
              address: { type: String, required: true },
              lineOfBusiness: { type: String, required: true },
              permitType: {
                type: String,
                enum: ["initial", "renewal"],
                default: "initial",
              },
              issuedDate: { type: Date, required: true, default: Date.now },
              expiryDate: { type: Date, required: true },
              status: {
                type: String,
                enum: ["active", "expired", "suspended", "revoked"],
                default: "active",
                index: true,
              },
              qrCode: { type: String },
              issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
              suspendedAt: Date,
              suspensionReason: String,
              suspendedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
              },
              revokedAt: Date,
              revocationReason: String,
              revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
              metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
            },
            { timestamps: true },
          );
          Permit = mongoose.model("Permit", permitSchema);
        }

        const bId = businessId || applicationId;
        const year = new Date().getFullYear();
        const ts = Date.now().toString().slice(-5);
        const rnd = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
        const permitNumber = `MP-${year}-${ts}${rnd}`;
        const issuedDate = new Date();
        const expiryDate = new Date(issuedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const permit = await Permit.create({
          permitNumber,
          businessId: bId,
          businessName:
            business.businessName || business.registeredBusinessName || "N/A",
          ownerName:
            profile.ownerName ||
            `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
            "N/A",
          address:
            typeof business.businessAddress === "string"
              ? business.businessAddress
              : business.businessAddress?.full ||
                [
                  business.businessAddress?.streetAddress,
                  business.businessAddress?.barangayName,
                  business.businessAddress?.cityName,
                ]
                  .filter(Boolean)
                  .join(", ") ||
                "N/A",
          lineOfBusiness:
            business.primaryLineOfBusiness || business.lineOfBusiness || "N/A",
          permitType: "initial",
          issuedDate,
          expiryDate,
          status: "active",
          issuedBy: officerId,
        });

        // Update business profile with permit reference using updateOne
        await BusinessProfile.updateOne(
          { _id: profile._id },
          {
            $set: {
              [`businesses.${businessIndex}.permitNumber`]: permitNumber,
              [`businesses.${businessIndex}.permitIssuedDate`]: issuedDate,
              [`businesses.${businessIndex}.permitExpiryDate`]: expiryDate,
              [`businesses.${businessIndex}.permitStatus`]: "active",
            },
          },
        );

        console.log(
          `[reviewApplication] Auto-issued permit ${permitNumber} for business ${bId}`,
        );
      } catch (permitError) {
        console.error(
          `[reviewApplication] Permit auto-issuance error:`,
          permitError,
        );
        // Don't throw - permit issuance failure shouldn't break the review process
      }
    }

    // Create audit log
    const auditData = {
      userId: profile.userId,
      eventType: "permit_review",
      fieldChanged: "applicationStatus",
      oldValue: oldStatus,
      newValue: newStatus,
      role: roleSlug,
      metadata: {
        applicationId: businessId || applicationId,
        businessId: businessId || applicationId,
        officerId,
        officerName: `${officer.firstName} ${officer.lastName}`,
        decision,
        comments,
        rejectionReason: rejectionReason || null,
        applicationReferenceNumber:
          business.applicationReferenceNumber ||
          `APP-${(businessId || applicationId).slice(-8)}`,
      },
    };

    // Generate hash
    const hashableData = {
      userId: String(auditData.userId),
      eventType: auditData.eventType,
      fieldChanged: auditData.fieldChanged || "",
      oldValue: auditData.oldValue || "",
      newValue: auditData.newValue || "",
      role: auditData.role,
      metadata: JSON.stringify(auditData.metadata || {}),
      timestamp: new Date().toISOString(),
    };
    const dataString = JSON.stringify(hashableData);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");

    auditData.hash = hash;

    // Send to central audit-service for blockchain anchoring
    const auditEventType =
      newStatus === "approved"
        ? "business_approved"
        : newStatus === "rejected"
          ? "business_rejected"
          : "permit_review";
    logAuditEvent(
      auditEventType,
      officerId,
      "BusinessProfile",
      profile._id.toString(),
      {
        applicationId: businessId || applicationId,
        businessId: businessId || applicationId,
        businessName: business.businessName,
        applicationReferenceNumber: business.applicationReferenceNumber,
        oldStatus,
        newStatus,
        decision,
        officerName: `${officer.firstName} ${officer.lastName}`,
      },
    );

    // Send notification email
    try {
      await this.sendPermitDecisionNotification(
        profile.userId,
        {
          applicationReferenceNumber:
            business.applicationReferenceNumber ||
            `APP-${(businessId || applicationId).slice(-8)}`,
          businessName: business.businessName,
          status: newStatus,
          decision,
          comments,
          rejectionReason,
        },
        decision,
      );
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the review if email fails
    }

    // Return updated application
    return this.getApplicationById(applicationId, businessId);
  }

  /**
   * Reject an appeal
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @param {string} officerId - Officer ID
   * @param {string} appealId - Appeal ID
   * @param {string} rejectionReason - Rejection reason
   * @returns {Promise<object>} Updated application
   */
  async rejectAppeal(
    applicationId,
    businessId,
    officerId,
    appealId,
    rejectionReason,
  ) {
    if (!appealId) {
      throw new Error("Appeal ID is required");
    }
    if (!rejectionReason) {
      throw new Error("Rejection reason is required when rejecting an appeal");
    }

    const { officer, roleSlug } = await verifyOfficerRole(officerId);

    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");

    const businessIndex = findBusinessIndex(profile, targetId);
    if (businessIndex === -1) throw new Error("Application not found");

    const business = profile.businesses[businessIndex];

    // Reject the appeal via the appeals endpoint
    const Appeal = require("../../business-service/src/models/Appeal");
    const appeal = await Appeal.findById(appealId);
    if (!appeal) {
      throw new Error("Appeal not found");
    }

    // Update appeal status to rejected
    appeal.status = "rejected";
    appeal.resolution = rejectionReason;
    appeal.reviewedBy = officerId;
    appeal.reviewedAt = new Date();
    await appeal.save();

    // Update application status to appeal_rejected
    const updateFields = {
      [`businesses.${businessIndex}.applicationStatus`]: "appeal_rejected",
      [`businesses.${businessIndex}.updatedAt`]: new Date(),
    };
    await BusinessProfile.updateOne(
      { _id: profile._id },
      { $set: updateFields },
    );

    // Log audit event for appeal rejection
    await logAuditEvent("appeal_rejected", officerId, "Appeal", appealId, {
      rejectedByName: officer.name,
      rejectionReason: rejectionReason,
      oldStatus: appeal.status,
      newStatus: "rejected",
      businessName: business.businessName,
      applicationReferenceNumber: business.applicationReferenceNumber,
      role: roleSlug,
    });

    // Create notification for business owner
    try {
      const notificationService = require("./notificationService");
      await notificationService.createNotification(
        profile.userId,
        "appeal_rejected",
        "Appeal Rejected",
        `Your appeal for "${business.businessName}" has been rejected. Reason: ${rejectionReason}`,
        "appeal",
        appealId,
        {
          rejectionReason: rejectionReason,
        },
      );
    } catch (notifError) {
      console.error(
        `[rejectAppeal] Failed to create notification:`,
        notifError,
      );
    }

    return {
      _id: business._id,
      businessId: business.businessId,
      applicationStatus: "appeal_rejected",
    };
  }

  /**
   * Send permit decision notification email
   * @param {string} userId - Business owner user ID
   * @param {object} application - Application details
   * @param {string} decision - Decision made
   */
  async sendPermitDecisionNotification(userId, application, decision) {
    const user = await User.findById(userId).lean();
    if (!user || !user.email) {
      throw new Error("User email not found");
    }

    const brandName = process.env.APP_BRAND_NAME || "BizClear";
    const supportEmail =
      process.env.SUPPORT_EMAIL ||
      process.env.EMAIL_HOST_USER ||
      "support@bizclear.com";
    const appUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      "http://localhost:5173";
    const from =
      process.env.DEFAULT_FROM_EMAIL ||
      process.env.EMAIL_HOST_USER ||
      "noreply@bizclear.com";

    let subject, text, html;

    if (decision === "approve") {
      subject = `Permit Application ${application.applicationReferenceNumber} - Approved`;
      text = [
        `Hello ${user.firstName || "Business Owner"},`,
        "",
        `We are pleased to inform you that your permit application ${application.applicationReferenceNumber} for ${application.businessName} has been APPROVED.`,
        "",
        "Your application has been reviewed and meets all requirements. You can now proceed with the next steps.",
        "",
        `View your application: ${appUrl}/owner/permits`,
        "",
        "Thank you for using BizClear.",
        "",
        "Best regards,",
        "LGU Office",
      ].join("\n");

      html = buildNotificationEmailBody({
        greeting: `Hello ${user.firstName || "Business Owner"}`,
        intro: `We are pleased to inform you that your permit application <strong>${application.applicationReferenceNumber}</strong> for <strong>${application.businessName}</strong> has been <strong style="color:#52C41A;">APPROVED</strong>. Your application has been reviewed and meets all requirements. You can now proceed with the next steps in your business registration process.`,
        fields: {
          fields: [
            {
              label: "Reference Number",
              value: application.applicationReferenceNumber,
              color: "#0039AF",
              fontSize: "14px",
              fontWeight: "700",
            },
            {
              label: "Business Name",
              value: application.businessName,
              fontSize: "14px",
            },
            {
              label: "Status",
              value: "Approved",
              color: "#52C41A",
              fontSize: "14px",
              fontWeight: "700",
            },
          ],
        },
        appUrl,
      });
    } else if (decision === "reject") {
      subject = `Permit Application ${application.applicationReferenceNumber} - Action Required`;
      text = [
        `Hello ${user.firstName || "Business Owner"},`,
        "",
        `Your permit application ${application.applicationReferenceNumber} for ${application.businessName} has been REJECTED.`,
        "",
        `Reason: ${application.rejectionReason || "Not specified"}`,
        "",
        application.comments
          ? `Additional comments: ${application.comments}`
          : "",
        "",
        "Please review the requirements and submit a new application if needed.",
        "",
        `View your application: ${appUrl}/owner/permits`,
        "",
        "Thank you for using BizClear.",
        "",
        "Best regards,",
        "LGU Office",
      ].join("\n");

      html = buildNotificationEmailBody({
        greeting: `Hello ${user.firstName || "Business Owner"}`,
        intro: `Your permit application <strong>${application.applicationReferenceNumber}</strong> for <strong>${application.businessName}</strong> has been <strong style="color:#FF4D4F;">REJECTED</strong>. Please review the requirements and submit a new application if needed. You may also file an appeal if you believe this decision was made in error.`,
        fields: {
          fields: [
            {
              label: "Reference Number",
              value: application.applicationReferenceNumber,
              color: "#0039AF",
              fontSize: "14px",
              fontWeight: "700",
            },
            {
              label: "Business Name",
              value: application.businessName,
              fontSize: "14px",
            },
            {
              label: "Status",
              value: "Rejected",
              color: "#FF4D4F",
              fontSize: "14px",
              fontWeight: "700",
            },
            {
              label: "Rejection Reason",
              value: application.rejectionReason || "Not specified",
              fontSize: "14px",
            },
            ...(application.comments
              ? [
                  {
                    label: "Additional Comments",
                    value: application.comments,
                    fontSize: "14px",
                  },
                ]
              : []),
          ],
        },
        appUrl,
      });
    } else {
      // request_changes
      subject = `Permit Application ${application.applicationReferenceNumber} - Corrections Required`;
      text = [
        `Hello ${user.firstName || "Business Owner"},`,
        "",
        `Your permit application ${application.applicationReferenceNumber} for ${application.businessName} requires corrections.`,
        "",
        `Comments: ${application.comments || "Please review and correct the indicated items."}`,
        "",
        "Please make the necessary corrections and resubmit your application.",
        "",
        `View your application: ${appUrl}/owner/permits`,
        "",
        "Thank you for using BizClear.",
        "",
        "Best regards,",
        "LGU Office",
      ].join("\n");

      html = buildNotificationEmailBody({
        greeting: `Hello ${user.firstName || "Business Owner"}`,
        intro: `Your permit application <strong>${application.applicationReferenceNumber}</strong> for <strong>${application.businessName}</strong> requires corrections before it can be approved. Please make the necessary corrections and resubmit your application for review.`,
        fields: {
          fields: [
            {
              label: "Reference Number",
              value: application.applicationReferenceNumber,
              color: "#0039AF",
              fontSize: "14px",
              fontWeight: "700",
            },
            {
              label: "Business Name",
              value: application.businessName,
              fontSize: "14px",
            },
            {
              label: "Status",
              value: "Corrections Required",
              color: "#FAAD14",
              fontSize: "14px",
              fontWeight: "700",
            },
            {
              label: "Required Corrections",
              value:
                application.comments ||
                "Please review and correct the indicated items.",
              fontSize: "14px",
            },
          ],
        },
        appUrl,
      });
    }

    await sendEmail({
      to: user.email,
      from,
      subject,
      text,
      html,
    });
  }

  /**
   * Update field-level review decision(s) for an application
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @param {string} officerId - LGU Officer user ID
   * @param {object|object[]} payload - Single { fieldKey, status, reasonCode?, reasonOther? } or array of same
   * @returns {Promise<object>} Updated application with fieldReviewDecisions
   */
  async updateFieldDecisions(applicationId, businessId, officerId, payload) {
    // Fetch officer name for audit trail
    const officer = await User.findById(officerId)
      .select("firstName lastName")
      .lean();
    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`.trim()
      : "Officer";
    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");
    const idx = findBusinessIndex(profile, targetId);
    if (idx === -1) throw new Error("Application not found");
    const business = profile.businesses[idx];
    const status = business.applicationStatus || "draft";
    const reviewableStatuses = [
      "submitted",
      "resubmit",
      "under_review",
      "pending_review",
      "appeal_pending",
    ];
    if (!reviewableStatuses.includes(status)) {
      throw new Error("Application is not in a reviewable status");
    }
    const decisions =
      business.fieldReviewDecisions &&
      typeof business.fieldReviewDecisions === "object"
        ? { ...business.fieldReviewDecisions }
        : {};
    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const {
        fieldKey,
        status: decisionStatus,
        requestCode,
        requestOther,
        reasonCode,
        reasonOther,
      } = item;
      if (!fieldKey) continue;

      // Clear decision if status is null
      if (decisionStatus === null || decisionStatus === undefined) {
        delete decisions[fieldKey];
        continue;
      }

      if (!["accepted", "request_changes"].includes(decisionStatus)) continue;
      decisions[fieldKey] = {
        status: decisionStatus,
        requestCode:
          decisionStatus === "request_changes"
            ? reasonCode || requestCode || null
            : undefined,
        requestOther:
          decisionStatus === "request_changes"
            ? reasonOther || requestOther || null
            : undefined,
        decidedAt: new Date(),
        decidedBy: officerId,
        decidedByName: officerName,
      };
    }

    // Use updateOne to bypass Mongoose validation on encrypted enum fields
    const updateOperation = {
      $set: {
        [`businesses.${idx}.updatedAt`]: new Date(),
        [`businesses.${idx}.fieldReviewDecisions`]: decisions,
      },
    };

    // Preserve reviewedBy and reviewedByName to prevent them from being cleared
    if (business.reviewedBy) {
      updateOperation.$set[`businesses.${idx}.reviewedBy`] =
        business.reviewedBy;
    }
    if (business.reviewedByName) {
      updateOperation.$set[`businesses.${idx}.reviewedByName`] =
        business.reviewedByName;
    }

    await BusinessProfile.updateOne({ _id: profile._id }, updateOperation);
    return this.getApplicationById(applicationId, businessId);
  }

  /**
   * Update LOB-related formData (businessDescriptionText, businessActivities) for officer edit
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @param {string} officerId - LGU Officer user ID
   * @param {object} payload - { businessDescriptionText?: string, businessActivities?: array }
   * @returns {Promise<object>} Updated application
   */
  async updateLobFormData(applicationId, businessId, officerId, payload) {
    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");
    const idx = findBusinessIndex(profile, targetId);
    if (idx === -1) throw new Error("Application not found");
    const business = profile.businesses[idx];
    const status = business.applicationStatus || "draft";
    if (status !== "under_review") {
      throw new Error("Application is not in an active review state");
    }
    const formData =
      business.formData && typeof business.formData === "object"
        ? { ...business.formData }
        : {};
    if (payload.businessDescriptionText !== undefined) {
      formData.businessDescriptionText = payload.businessDescriptionText;
    }
    if (
      payload.businessActivities !== undefined &&
      Array.isArray(payload.businessActivities)
    ) {
      formData.businessActivities = payload.businessActivities;
    }
    // Use updateOne to bypass Mongoose validation on encrypted enum fields
    const updateFields = {
      [`businesses.${idx}.formData`]: formData,
      [`businesses.${idx}.updatedAt`]: new Date(),
    };

    // Preserve reviewedBy and reviewedByName to prevent them from being cleared
    if (business.reviewedBy) {
      updateFields[`businesses.${idx}.reviewedBy`] = business.reviewedBy;
    }
    if (business.reviewedByName) {
      updateFields[`businesses.${idx}.reviewedByName`] =
        business.reviewedByName;
    }

    await BusinessProfile.updateOne(
      { _id: profile._id },
      { $set: updateFields },
    );
    return this.getApplicationById(applicationId, businessId);
  }

  /**
   * Create a pending action with undo window
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @param {string} actionType - 'complete_review' | 'reject' | 'return'
   * @param {object} payload - Action payload (reason, comments, requestType, etc.)
   * @param {number} delayMinutes - Delay before execution (default: 10)
   * @returns {Promise<object>} Updated application
   */
  async createPendingAction(
    applicationId,
    businessId,
    actionType,
    payload,
    delayMinutes = 10,
  ) {
    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");
    const idx = findBusinessIndex(profile, targetId);
    if (idx === -1) throw new Error("Application not found");
    const business = profile.businesses[idx];

    // Check if there's already a pending action
    if (business.pendingAction?.actionType) {
      throw new Error("A pending action already exists. Cancel it first.");
    }

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + delayMinutes * 60 * 1000);

    await BusinessProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          [`businesses.${idx}.pendingAction`]: {
            actionType,
            scheduledAt,
            payload,
            expiresAt: scheduledAt,
            createdAt: now,
          },
          [`businesses.${idx}.updatedAt`]: new Date(),
        },
      },
    );

    return this.getApplicationById(applicationId, businessId);
  }

  /**
   * Cancel a pending action (undo)
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Updated application
   */
  async cancelPendingAction(applicationId, businessId) {
    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");
    const idx = findBusinessIndex(profile, targetId);
    if (idx === -1) throw new Error("Application not found");

    await BusinessProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          [`businesses.${idx}.pendingAction`]: null,
          [`businesses.${idx}.updatedAt`]: new Date(),
        },
      },
    );

    return this.getApplicationById(applicationId, businessId);
  }

  /**
   * Execute a pending action (called by scheduled job)
   * @param {string} applicationId - Application ID
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} Updated application
   */
  async executePendingAction(applicationId, businessId) {
    const targetId = businessId || applicationId;
    const profile = await findProfileByBusinessId(targetId);
    if (!profile) throw new Error("Application not found");
    const idx = findBusinessIndex(profile, targetId);
    if (idx === -1) throw new Error("Application not found");
    const business = profile.businesses[idx];
    const pendingAction = business.pendingAction;

    if (!pendingAction || !pendingAction.actionType) {
      throw new Error("No pending action to execute");
    }

    const { actionType, payload } = pendingAction;
    const officerId = business.reviewedBy;

    // Execute the appropriate action based on type
    let updated;
    switch (actionType) {
      case "complete_review":
        updated = await this.reviewApplication(
          applicationId,
          businessId,
          officerId,
          "approve",
          payload.comments || "",
        );
        break;
      case "reject":
        updated = await this.reviewApplication(
          applicationId,
          businessId,
          officerId,
          "reject",
          payload.comments || "",
          payload.rejectionReason || payload.decision || "",
        );
        break;
      case "return":
        updated = await this.reviewApplication(
          applicationId,
          businessId,
          officerId,
          "request_changes",
          payload.requestOther || payload.requestType || "",
        );
        break;
      case "reject_appeal":
        updated = await this.rejectAppeal(
          applicationId,
          businessId,
          officerId,
          payload.appealId,
          payload.rejectionReason || "",
        );
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // Clear pending action after execution
    await BusinessProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          [`businesses.${idx}.pendingAction`]: null,
          [`businesses.${idx}.updatedAt`]: new Date(),
        },
      },
    );

    return updated;
  }
}

const permitApplicationService = new PermitApplicationService();
permitApplicationService.__testables = {
  decryptObject,
  bufferToHex,
};

module.exports = permitApplicationService;
