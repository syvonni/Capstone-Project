#!/usr/bin/env node

/**
 * Migration script to backfill feeBreakdown for existing payments
 *
 * Usage:
 *   MONGO_URI=mongodb://capstone_app:devapppass@localhost:27017/capstone_project?authSource=admin node backend/services/business-service/scripts/migratePaymentFeeBreakdown.js
 *
 * This script finds payments without feeBreakdown and populates it
 * using the existing breakdown field or creates a simple fallback.
 */

const mongoose = require("mongoose");
const Payment = require("../src/models/Payment");

async function migratePaymentFeeBreakdown() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
  if (!mongoUri) {
    console.error("❌ MONGO_URI environment variable is required");
    process.exit(1);
  }

  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database:", mongoose.connection.name);

    // Find payments without feeBreakdown or with empty feeBreakdown
    const paymentsWithoutBreakdown = await Payment.find({
      $or: [
        { feeBreakdown: { $exists: false } },
        { feeBreakdown: { $size: 0 } },
        { feeBreakdown: null },
      ],
    });

    console.log(
      `Found ${paymentsWithoutBreakdown.length} payments without feeBreakdown`,
    );

    let updated = 0;
    let skipped = 0;

    for (const payment of paymentsWithoutBreakdown) {
      let feeBreakdown = [];

      // Try to construct feeBreakdown from the breakdown field
      if (payment.breakdown) {
        const { baseFee, surcharge, penalty, discount, tax } =
          payment.breakdown;

        if (baseFee > 0) {
          feeBreakdown.push({
            label: "Base Fee",
            amount: baseFee,
            type: "base",
          });
        }
        if (surcharge > 0) {
          feeBreakdown.push({
            label: "Surcharge",
            amount: surcharge,
            type: "surcharge",
          });
        }
        if (penalty > 0) {
          feeBreakdown.push({
            label: "Penalty",
            amount: penalty,
            type: "penalty",
          });
        }
        if (tax > 0) {
          feeBreakdown.push({ label: "Tax", amount: tax, type: "tax" });
        }
        if (discount > 0) {
          feeBreakdown.push({
            label: "Discount",
            amount: -discount,
            type: "discount",
          });
        }
      }

      // If breakdown is empty or doesn't match total, create a single entry
      if (feeBreakdown.length === 0) {
        const label = getPaymentTypeLabel(payment.paymentType);
        feeBreakdown.push({
          label: label || "Payment",
          amount: payment.amount,
          type: payment.paymentType,
        });
      }

      // Update the payment
      await Payment.updateOne({ _id: payment._id }, { feeBreakdown });

      updated++;
      console.log(
        `Updated payment ${payment.paymentId}: ${feeBreakdown.length} fee items`,
      );
    }

    console.log(
      `\nMigration complete: ${updated} payments updated, ${skipped} skipped`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

function getPaymentTypeLabel(paymentType) {
  const labels = {
    registration_fee: "Application Fee",
    renewal_fee: "Renewal Fee",
    penalty: "Penalty",
    violation_fine: "Violation Fine",
    general_permit_fee: "General Permit Fee",
    occupational_permit_fee: "Occupational Permit Fee",
    cessation_tax: "Cessation Tax",
    permit_application: "Permit Application Fee",
    appeal_fee: "Appeal Fee",
    other: "Other Fee",
  };
  return labels[paymentType] || "Payment";
}

migratePaymentFeeBreakdown();
