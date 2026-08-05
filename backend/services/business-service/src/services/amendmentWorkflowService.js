const mongoose = require("mongoose");
const BusinessProfile = require("../models/BusinessProfile");
const Permit = require("../models/Permit");
const { logAuditEvent } = require("../lib/auditClient");
const permitIssuanceService = require("./permitIssuanceService");

// Helper: build query that matches either businessId or subdoc _id
function buildBusinessLookupQuery(identifier) {
  const target = String(identifier || "");
  const clauses = [{ "businesses.businessId": target }];
  if (mongoose.Types.ObjectId.isValid(target)) {
    clauses.push({ "businesses._id": new mongoose.Types.ObjectId(target) });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/**
 * Assess impact of proposed changes
 */
function assessChangeImpact(changes) {
  const impact = {
    level: "minor", // minor, moderate, major
    requiresInspection: false,
    requiresNewPermit: false,
    requiresAgencyNotification: false,
    affectedAgencies: [],
    reasons: [],
  };

  const significantFields = [
    "primaryLineOfBusiness",
    "lineOfBusiness",
    "businessAddress",
    "businessType",
    "numberOfEmployees",
  ];

  const inspectionTriggeringFields = [
    "primaryLineOfBusiness",
    "lineOfBusiness",
    "businessAddress",
    "businessType",
  ];

  const agencyNotificationFields = {
    primaryLineOfBusiness: ["BFP", "DOH", "DENR"],
    lineOfBusiness: ["BFP", "DOH", "DENR"],
    businessAddress: ["BFP", "Barangay"],
    numberOfEmployees: ["DOLE"],
  };

  changes.forEach((change) => {
    const fieldName = change.fieldName;

    // Check if field is significant
    if (significantFields.includes(fieldName)) {
      impact.level = "moderate";
      impact.reasons.push(`Change in ${fieldName} requires review`);
    }

    // Check if inspection is required
    if (inspectionTriggeringFields.includes(fieldName)) {
      impact.requiresInspection = true;
      impact.level = "major";
      impact.reasons.push(`Change in ${fieldName} requires site inspection`);
    }

    // Check if new permit is required
    if (
      ["primaryLineOfBusiness", "lineOfBusiness", "businessType"].includes(
        fieldName,
      )
    ) {
      impact.requiresNewPermit = true;
      impact.reasons.push(
        `Change in ${fieldName} requires new permit issuance`,
      );
    }

    // Check agency notification requirements
    if (agencyNotificationFields[fieldName]) {
      impact.requiresAgencyNotification = true;
      impact.affectedAgencies.push(...agencyNotificationFields[fieldName]);
      impact.reasons.push(
        `Change in ${fieldName} requires notification to ${agencyNotificationFields[fieldName].join(", ")}`,
      );
    }
  });

  // Remove duplicate agencies
  impact.affectedAgencies = [...new Set(impact.affectedAgencies)];

  return impact;
}

/**
 * Validate amendment request
 */
async function validateAmendmentRequest(businessId, changes) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check if business exists
  const profile = await BusinessProfile.findOne(
    buildBusinessLookupQuery(businessId),
  );

  if (!profile) {
    validation.valid = false;
    validation.errors.push("Business not found");
    return validation;
  }

  const business = profile.businesses.find(
    (b) => b.businessId === businessId || String(b._id) === businessId,
  );

  // Check if business is in valid status for amendments
  if (!["approved", "active"].includes(business.applicationStatus)) {
    validation.valid = false;
    validation.errors.push(
      "Business must be approved or active to request amendments",
    );
  }

  // Check for pending amendments
  const pendingAmendments = await BusinessProfile.countDocuments({
    ...buildBusinessLookupQuery(businessId),
    "businesses.editRequests.status": "pending",
  });

  if (pendingAmendments > 0) {
    validation.warnings.push(
      "There are pending amendment requests for this business",
    );
  }

  // Validate each change
  changes.forEach((change) => {
    if (!change.fieldName || !change.proposedValue) {
      validation.errors.push(
        `Invalid change: missing fieldName or proposedValue`,
      );
    }

    // Check if current value matches
    if (change.currentValue !== business[change.fieldName]) {
      validation.warnings.push(
        `Current value for ${change.fieldName} does not match records`,
      );
    }
  });

  if (validation.errors.length > 0) {
    validation.valid = false;
  }

  return validation;
}

/**
 * Process amendment approval
 */
async function processAmendmentApproval(businessId, amendmentId, userId) {
  // Get amendment details
  const profile = await BusinessProfile.findOne({
    ...buildBusinessLookupQuery(businessId),
    "businesses.editRequests._id": amendmentId,
  });

  if (!profile) {
    throw new Error("Amendment not found");
  }

  const business = profile.businesses.find(
    (b) => b.businessId === businessId || String(b._id) === businessId,
  );
  const amendment = business?.editRequests?.find(
    (req) => req._id.toString() === amendmentId,
  );

  if (!amendment) {
    throw new Error("Amendment not found");
  }

  // Assess impact
  const impact = assessChangeImpact(amendment.fields);

  // Apply changes to business profile
  const updates = {};
  amendment.fields.forEach((field) => {
    updates[`businesses.$.${field.fieldName}`] = field.proposedValue;
  });

  await BusinessProfile.updateOne(buildBusinessLookupQuery(businessId), {
    $set: updates,
  });

  // Update amendment status
  await BusinessProfile.updateOne(
    {
      ...buildBusinessLookupQuery(businessId),
      "businesses.editRequests._id": amendmentId,
    },
    {
      $set: {
        "businesses.$[business].editRequests.$[request].status": "approved",
        "businesses.$[business].editRequests.$[request].approvedAt": new Date(),
        "businesses.$[business].editRequests.$[request].approvedBy": userId,
        "businesses.$[business].editRequests.$[request].impact": impact,
      },
    },
    {
      arrayFilters: [
        { "business.businessId": businessId },
        { "request._id": amendmentId },
      ],
    },
  );

  // Issue updated permit if required
  let updatedPermit = null;
  if (impact.requiresNewPermit) {
    // Get current permit
    const currentPermit = await Permit.findOne({
      businessId,
      status: "active",
    });

    if (currentPermit) {
      // Mark current permit as superseded
      currentPermit.status = "superseded";
      currentPermit.supersededAt = new Date();
      currentPermit.supersededReason = "Business amendment";
      await currentPermit.save();
    }

    // Issue new permit
    updatedPermit = await permitIssuanceService.issuePermit(
      businessId,
      "amendment",
      userId,
    );
  }

  // Log audit event
  logAuditEvent("amendment_approved", userId, "Business", businessId, {
    amendmentId,
    changes: amendment.fields.map((f) => f.fieldName),
    impact: impact.level,
    requiresInspection: impact.requiresInspection,
    requiresNewPermit: impact.requiresNewPermit,
  });

  return {
    approved: true,
    impact,
    updatedPermit,
    affectedAgencies: impact.affectedAgencies,
  };
}

/**
 * Notify affected agencies
 */
async function notifyAffectedAgencies(businessId, amendmentId, agencies) {
  // This would integrate with actual agency notification systems
  // For now, we'll log the notifications

  const notifications = [];

  for (const agency of agencies) {
    const notification = {
      agency,
      businessId,
      amendmentId,
      notifiedAt: new Date(),
      status: "sent",
      message: `Business amendment notification for ${businessId}`,
    };

    notifications.push(notification);

    // Log audit event
    logAuditEvent("agency_notified", null, "Business", businessId, {
      agency,
      amendmentId,
      notificationType: "amendment",
    });
  }

  return notifications;
}

/**
 * Get amendment status
 */
async function getAmendmentStatus(businessId, amendmentId) {
  const profile = await BusinessProfile.findOne({
    ...buildBusinessLookupQuery(businessId),
    "businesses.editRequests._id": amendmentId,
  });

  if (!profile) {
    throw new Error("Amendment not found");
  }

  const business = profile.businesses.find(
    (b) => b.businessId === businessId || String(b._id) === businessId,
  );
  const amendment = business?.editRequests?.find(
    (req) => req._id.toString() === amendmentId,
  );

  if (!amendment) {
    throw new Error("Amendment not found");
  }

  // Check for updated permit
  const updatedPermit = await Permit.findOne({
    businessId,
    permitType: "amendment",
    issuedDate: { $gte: amendment.createdAt },
  });

  return {
    amendment,
    status: amendment.status,
    impact: amendment.impact,
    updatedPermit: updatedPermit
      ? {
          permitNumber: updatedPermit.permitNumber,
          issuedDate: updatedPermit.issuedDate,
        }
      : null,
  };
}

module.exports = {
  assessChangeImpact,
  validateAmendmentRequest,
  processAmendmentApproval,
  notifyAffectedAgencies,
  getAmendmentStatus,
};
