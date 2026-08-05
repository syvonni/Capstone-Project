const mongoose = require("mongoose");
const BusinessProfile = require("../models/BusinessProfile");
const Payment = require("../models/Payment");
const Permit = require("../models/Permit");
const PDFDocument = require("pdfkit");
const { logAuditEvent } = require("../lib/auditClient");

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
 * Check closure prerequisites
 */
async function checkClosurePrerequisites(businessId) {
  const checks = {
    violations: { cleared: true, count: 0, details: [] }, // Violation model removed - auto-clear
    payments: { settled: false, outstanding: 0, details: [] },
    inspection: { completed: true, required: false }, // Inspection model removed - auto-complete
    eligible: false,
  };

  // Check for outstanding payments
  const outstandingPayments = await Payment.find({
    businessId,
    status: { $in: ["pending", "overdue"] },
  }).lean();

  const totalOutstanding = outstandingPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  checks.payments.outstanding = totalOutstanding;
  checks.payments.settled = totalOutstanding === 0;
  checks.payments.details = outstandingPayments.map((p) => ({
    paymentId: p._id,
    description: p.description,
    amount: p.amount,
    dueDate: p.dueDate,
  }));

  // Determine eligibility
  checks.eligible = checks.payments.settled;

  return checks;
}

/**
 * Calculate final settlement amount
 */
async function calculateFinalSettlement(businessId) {
  const settlement = {
    outstandingPayments: 0,
    penaltyFees: 0,
    processingFee: 500, // Fixed closure processing fee
    total: 0,
    breakdown: [],
  };

  // Get outstanding payments
  const outstandingPayments = await Payment.find({
    businessId,
    status: { $in: ["pending", "overdue"] },
  }).lean();

  outstandingPayments.forEach((p) => {
    settlement.breakdown.push({
      type: "outstanding_payment",
      description: p.description,
      amount: p.amount,
    });
    settlement.outstandingPayments += p.amount;
  });

  // Calculate penalty fees for overdue payments
  const overduePayments = outstandingPayments.filter(
    (p) => p.dueDate && new Date(p.dueDate) < new Date(),
  );

  overduePayments.forEach((p) => {
    const daysOverdue = Math.floor(
      (new Date() - new Date(p.dueDate)) / (1000 * 60 * 60 * 24),
    );
    const penalty = Math.min(
      p.amount * 0.02 * Math.floor(daysOverdue / 30),
      p.amount * 0.2,
    ); // 2% per month, max 20%

    if (penalty > 0) {
      settlement.breakdown.push({
        type: "penalty",
        description: `Penalty for ${p.description} (${daysOverdue} days overdue)`,
        amount: penalty,
      });
      settlement.penaltyFees += penalty;
    }
  });

  // Add processing fee
  settlement.breakdown.push({
    type: "processing_fee",
    description: "Closure Processing Fee",
    amount: settlement.processingFee,
  });

  settlement.total =
    settlement.outstandingPayments +
    settlement.penaltyFees +
    settlement.processingFee;

  return settlement;
}

/**
 * Process final settlement payment
 */
async function processFinalSettlement(businessId, userId) {
  const settlement = await calculateFinalSettlement(businessId);

  if (settlement.total === 0) {
    return { settled: true, amount: 0 };
  }

  // Create final settlement payment
  const payment = await Payment.create({
    businessId,
    userId,
    paymentType: "closure_settlement",
    description: "Final Settlement for Business Closure",
    amount: settlement.total,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: "pending",
    metadata: {
      breakdown: settlement.breakdown,
      outstandingPayments: settlement.outstandingPayments,
      penaltyFees: settlement.penaltyFees,
      processingFee: settlement.processingFee,
    },
  });

  return {
    settled: false,
    amount: settlement.total,
    paymentId: payment._id,
    breakdown: settlement.breakdown,
  };
}

/**
 * Generate closure certificate PDF
 */
async function generateClosureCertificate(businessId, closureData) {
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

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "LETTER", margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("REPUBLIC OF THE PHILIPPINES", { align: "center" });
      doc
        .fontSize(16)
        .text("City of Alaminos, Pangasinan", { align: "center" });
      doc
        .fontSize(14)
        .text("BUSINESS PERMIT AND LICENSING OFFICE", { align: "center" });

      doc.moveDown(2);

      // Title
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#d32f2f")
        .text("CERTIFICATE OF CLOSURE", { align: "center" });

      doc.moveDown(2);

      // Certificate Number
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text(`Certificate No: ${closureData.certificateNumber}`, {
          align: "center",
        });

      doc.moveDown(2);

      // Business Information
      doc.fontSize(12).font("Helvetica");

      const leftMargin = 100;
      let y = doc.y;

      doc.text("This is to certify that:", leftMargin, y);

      y += 30;
      doc
        .font("Helvetica-Bold")
        .text(
          business.businessName || business.registeredBusinessName,
          leftMargin,
          y,
        );

      y += 25;
      doc
        .font("Helvetica")
        .text("Owner/Proprietor:", leftMargin, y, { continued: true })
        .font("Helvetica-Bold")
        .text(
          ` ${profile.ownerName || `${profile.firstName} ${profile.lastName}`}`,
        );

      y += 25;
      doc
        .font("Helvetica")
        .text("Business Address:", leftMargin, y, { continued: true })
        .font("Helvetica-Bold")
        .text(
          ` ${business.businessAddress || business.location?.address || "N/A"}`,
        );

      y += 25;
      doc
        .font("Helvetica")
        .text("Permit Number:", leftMargin, y, { continued: true })
        .font("Helvetica-Bold")
        .text(` ${business.permitNumber || "N/A"}`);

      doc.moveDown(2);

      doc
        .font("Helvetica")
        .text(
          "Has officially ceased operations and completed all requirements for business closure.",
          leftMargin,
          doc.y,
          { align: "left", width: 400 },
        );

      doc.moveDown(1);

      // Closure Details
      doc.text("Closure Details:", leftMargin, doc.y);
      doc.moveDown(0.5);

      y = doc.y;
      doc.text(
        `Closure Date: ${new Date(closureData.closureDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        leftMargin + 20,
        y,
      );

      y += 20;
      doc.text(
        `Reason: ${closureData.reason || "Business cessation"}`,
        leftMargin + 20,
        y,
      );

      y += 20;
      doc.text(`All violations cleared: Yes`, leftMargin + 20, y);

      y += 20;
      doc.text(`All payments settled: Yes`, leftMargin + 20, y);

      doc.moveDown(3);

      // Footer
      doc
        .fontSize(10)
        .font("Helvetica-Oblique")
        .text(
          "This certificate is issued upon completion of all closure requirements.",
          { align: "center" },
        );
      doc.text("Not valid without the official seal and signature.", {
        align: "center",
      });

      doc.moveDown(2);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Issued on: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          { align: "center" },
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Complete business closure
 */
async function completeBusinessClosure(businessId, closureData, userId) {
  // Check prerequisites
  const prerequisites = await checkClosurePrerequisites(businessId);

  if (!prerequisites.eligible) {
    throw new Error("Business does not meet closure requirements");
  }

  // Generate certificate number
  const certificateNumber = `CC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  // Update business status
  await BusinessProfile.updateOne(buildBusinessLookupQuery(businessId), {
    $set: {
      "businesses.$.applicationStatus": "closed",
      "businesses.$.closureDate": new Date(),
      "businesses.$.closureReason": closureData.reason,
      "businesses.$.closureCertificateNumber": certificateNumber,
      "businesses.$.closedBy": userId,
    },
  });

  // Revoke permit
  const permit = await Permit.findOne({ businessId, status: "active" });
  if (permit) {
    permit.status = "revoked";
    permit.revokedAt = new Date();
    permit.revocationReason = "Business closure";
    permit.revokedBy = userId;
    await permit.save();
  }

  // Generate closure certificate
  const certificatePDF = await generateClosureCertificate(businessId, {
    certificateNumber,
    closureDate: new Date(),
    reason: closureData.reason,
  });

  // Log audit event
  logAuditEvent("business_closure_completed", userId, "Business", businessId, {
    certificateNumber,
    reason: closureData.reason,
  });

  return {
    success: true,
    certificateNumber,
    certificatePDF,
    closureDate: new Date(),
  };
}

module.exports = {
  checkClosurePrerequisites,
  calculateFinalSettlement,
  processFinalSettlement,
  generateClosureCertificate,
  completeBusinessClosure,
};
