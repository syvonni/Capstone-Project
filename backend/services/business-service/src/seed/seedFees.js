/**
 * Seed Fees and PenaltyRules
 *
 * Populates the new simplified fee system with basic examples from the backup data.
 * This is idempotent - can be run multiple times without creating duplicates.
 *
 * Usage:
 *   node backend/services/business-service/src/seed/seedFees.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const Fee = require("../models/Fee");
const { generalApplicationFees, appealFees } = require("./comprehensiveFeeSeederReference");

// Penalty fees are now created by seedViolations.js based on violation names
// to ensure each violation has its own specific penalty fee

// Combine global application fees and appeal fees
const FEES_SEED_DATA = [
  ...generalApplicationFees.map(fee => ({
    ...fee,
    category: "global",
  })),
  ...appealFees.map(fee => ({
    ...fee,
    category: "appeal",
  })),
];


async function seed() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
  console.log(
    `Connecting to MongoDB: ${mongoUri}`,
  );
  await mongoose.connect(mongoUri);

  let totalUpserted = 0;
  let totalSkipped = 0;

  // Seed Fees
  console.log("\nSeeding Fees...");
  for (const feeData of FEES_SEED_DATA) {
    const result = await Fee.updateOne(
      { name: feeData.name },
      {
        $set: {
          ...feeData,
          isActive: true,
          version: 1,
          effectiveDate: new Date(),
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      totalUpserted++;
      console.log(`  + Seeded: ${feeData.name} (₱${feeData.amount})`);
    } else if (result.modifiedCount > 0) {
      totalSkipped++;
      console.log(`  ~ Updated: ${feeData.name} (₱${feeData.amount})`);
    } else {
      totalSkipped++;
      console.log(`  = Skipped (exists): ${feeData.name}`);
    }
  }

  console.log(
    `\nDone. Total Seeded: ${totalUpserted}, Total Updated: ${totalSkipped}`,
  );
  await mongoose.disconnect();
}

/**
 * Seed fees if the collections are empty.
 * Safe to call during startup — assumes mongoose is already connected.
 *
 * @returns {{ seeded: boolean, count?: number, error?: string }}
 */
async function seedIfEmpty() {
  try {
    const feeCount = await Fee.countDocuments({});

    if (feeCount > 0) {
      return {
        seeded: false,
        feeCount,
      };
    }

    let totalUpserted = 0;

    // Seed Fees
    for (const feeData of FEES_SEED_DATA) {
      const result = await Fee.updateOne(
        { name: feeData.name },
        {
          $setOnInsert: {
            ...feeData,
            isActive: true,
            version: 1,
            effectiveDate: new Date(),
          },
        },
        { upsert: true },
      );
      if (result.upsertedCount > 0) totalUpserted++;
    }

    return { seeded: true, count: totalUpserted };
  } catch (error) {
    return { seeded: false, error: error.message };
  }
}

module.exports = { seed, seedIfEmpty };

// Run seed if called directly
if (require.main === module) {
  seed().catch(console.error);
}
