/**
 * Cleanup Penalty and Claimable Document Fees Script
 *
 * Removes excessive penalty and claimable_document fees:
 * 1. Deletes all fees with category "penalty" (46,668 incorrect records)
 * 2. Deletes all fees with category "claimable_document" (6,384 incorrect records)
 * 3. Keeps other fee categories (global, application_fee, appeal, variable_fee)
 *
 * Usage:
 *   node backend/services/business-service/src/seed/cleanupPenaltyAndClaimableFees.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const Fee = require("../../../../shared/models/Fee");

async function cleanup() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  console.log("\n=== Penalty and Claimable Document Fee Cleanup ===\n");

  // Step 1: Delete all fees with category "penalty"
  console.log("Step 1: Deleting all fees with category 'penalty'...");
  const penaltyDeleteResult = await Fee.deleteMany({
    category: "penalty",
  });
  console.log(
    `  Deleted ${penaltyDeleteResult.deletedCount} penalty fee records`,
  );

  // Step 2: Delete all fees with category "claimable_document"
  console.log(
    "\nStep 2: Deleting all fees with category 'claimable_document'...",
  );
  const claimableDeleteResult = await Fee.deleteMany({
    category: "claimable_document",
  });
  console.log(
    `  Deleted ${claimableDeleteResult.deletedCount} claimable_document fee records`,
  );

  // Step 3: Count remaining fees by category
  console.log("\nStep 3: Counting remaining fees by category...");
  const feeCounts = await Fee.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  console.log("  Fee counts by category:");
  for (const { _id, count } of feeCounts) {
    console.log(`    ${_id}: ${count}`);
  }

  const totalFees = await Fee.countDocuments({});
  console.log(`\nTotal remaining fees: ${totalFees}`);

  console.log("\n=== Cleanup Complete ===\n");
  console.log("Next steps:");
  console.log(
    "1. Run seedViolations.js to reseed penalty fees (62 fees for 62 violations)",
  );
  console.log(
    "2. Claimable document fees will be created dynamically when documents are added",
  );
  await mongoose.disconnect();
}

module.exports = { cleanup };

// Run cleanup if called directly
if (require.main === module) {
  cleanup().catch(console.error);
}
