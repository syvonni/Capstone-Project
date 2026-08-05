const mongoose = require("mongoose");
const BusinessProfile = require("../models/BusinessProfile");
const Payment = require("../models/Payment");
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
 * Calculate compliance score for express lane eligibility
 */
async function calculateComplianceScore(businessId) {
  const score = {
    total: 100,
    deductions: [],
    eligible: true,
  };

  // Check for late payments
  const latePayments = await Payment.countDocuments({
    businessId,
    status: "paid",
    paidAt: { $gt: "$dueDate" },
  });

  if (latePayments > 0) {
    score.deductions.push({
      reason: "Late payments",
      points: latePayments * 5,
      count: latePayments,
    });
    score.total -= latePayments * 5;
  }

  // Check for pending payments
  const pendingPayments = await Payment.countDocuments({
    businessId,
    status: "pending",
    dueDate: { $lt: new Date() },
  });

  if (pendingPayments > 0) {
    score.deductions.push({
      reason: "Overdue payments",
      points: pendingPayments * 20,
      count: pendingPayments,
    });
    score.total -= pendingPayments * 20;
    score.eligible = false; // Auto-disqualify for overdue payments
  }

  // Minimum score for express lane: 80
  if (score.total < 80) {
    score.eligible = false;
  }

  return score;
}

/**
 * Check if business is eligible for express lane renewal
 */
async function checkExpressLaneEligibility(businessId) {
  const complianceScore = await calculateComplianceScore(businessId);

  // Additional checks
  const checks = {
    complianceScore,
    noOverduePayments:
      complianceScore.deductions.find((d) => d.reason === "Overdue payments")
        ?.count === 0,
  };

  const eligible =
    complianceScore.eligible &&
    checks.noOverduePayments;

  return {
    eligible,
    score: complianceScore.total,
    checks,
    reason: eligible
      ? "Qualified for express lane"
      : "Does not meet express lane criteria",
  };
}

/**
 * Process express lane renewal
 */
async function processExpressLaneRenewal(businessId, renewalData, userId) {
  // Check eligibility
  const eligibility = await checkExpressLaneEligibility(businessId);

  if (!eligibility.eligible) {
    throw new Error(`Not eligible for express lane: ${eligibility.reason}`);
  }

  // Get business profile
  const profile = await BusinessProfile.findOne(
    buildBusinessLookupQuery(businessId),
  );

  if (!profile) {
    throw new Error("Business not found");
  }

  const business = profile.businesses.find(
    (b) => b.businessId === businessId || String(b._id) === businessId,
  );
  if (!business) {
    throw new Error("Business not found");
  }

  // Auto-approve renewal
  const renewalId = renewalData.renewalId;

  await BusinessProfile.updateOne(
    {
      ...buildBusinessLookupQuery(businessId),
      "businesses.renewals.renewalId": renewalId,
    },
    {
      $set: {
        "businesses.$[business].renewals.$[renewal].renewalStatus": "approved",
        "businesses.$[business].renewals.$[renewal].approvedAt": new Date(),
        "businesses.$[business].renewals.$[renewal].approvedBy": userId,
        "businesses.$[business].renewals.$[renewal].expressLane": true,
        "businesses.$[business].renewals.$[renewal].complianceScore":
          eligibility.score,
      },
    },
    {
      arrayFilters: [
        {
          $or: [
            { "business.businessId": businessId },
            ...(mongoose.Types.ObjectId.isValid(businessId)
              ? [{ "business._id": new mongoose.Types.ObjectId(businessId) }]
              : []),
          ],
        },
        { "renewal.renewalId": renewalId },
      ],
    },
  );

  // Issue renewed permit automatically
  const permit = await permitIssuanceService.issuePermit(
    businessId,
    "renewal",
    userId,
  );

  // Log audit event
  logAuditEvent(
    "express_lane_renewal_approved",
    userId,
    "BusinessProfile",
    businessId,
    {
      renewalId,
      complianceScore: eligibility.score,
      permitNumber: permit.permitNumber,
    },
  );

  return {
    approved: true,
    expressLane: true,
    permit,
    complianceScore: eligibility.score,
  };
}

/**
 * Integrate renewal payment with main payment system
 */
async function createRenewalPayment(businessId, renewalId, assessmentData) {
  // Get renewal data
  const profile = await BusinessProfile.findOne({
    ...buildBusinessLookupQuery(businessId),
    "businesses.renewals.renewalId": renewalId,
  });

  if (!profile) {
    throw new Error("Renewal not found");
  }

  const business = profile.businesses.find(
    (b) => b.businessId === businessId || String(b._id) === businessId,
  );
  const renewal = business?.renewals?.find((r) => r.renewalId === renewalId);

  if (!renewal) {
    throw new Error("Renewal not found");
  }

  // Create payment record using main payment system
  const payment = await Payment.create({
    businessId,
    userId: profile.userId,
    paymentType: "renewal",
    description: `Business Renewal ${renewal.renewalYear}`,
    amount: renewal.assessment?.total || 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    status: "pending",
    relatedEntityType: "renewal",
    relatedEntityId: renewalId,
    metadata: {
      renewalId,
      renewalYear: renewal.renewalYear,
      assessment: renewal.assessment,
      grossReceipts: renewal.grossReceipts?.amount || 0,
    },
  });

  // Update renewal with payment reference
  await BusinessProfile.updateOne(
    {
      ...buildBusinessLookupQuery(businessId),
      "businesses.renewals.renewalId": renewalId,
    },
    {
      $set: {
        "businesses.$[business].renewals.$[renewal].paymentId": payment._id,
      },
    },
    {
      arrayFilters: [
        {
          $or: [
            { "business.businessId": businessId },
            ...(mongoose.Types.ObjectId.isValid(businessId)
              ? [{ "business._id": new mongoose.Types.ObjectId(businessId) }]
              : []),
          ],
        },
        { "renewal.renewalId": renewalId },
      ],
    },
  );

  return payment;
}

module.exports = {
  calculateComplianceScore,
  checkExpressLaneEligibility,
  processExpressLaneRenewal,
  createRenewalPayment,
};
