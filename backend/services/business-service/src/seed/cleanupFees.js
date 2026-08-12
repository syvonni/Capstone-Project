/**
 * Cleanup Fees Script
 *
 * Removes incorrect fees from the database:
 * 1. Deletes all fees with category "application_fee" (120+ incorrect records)
 * 2. Deletes "Application Fee" and "Plate Fee" by name (global category)
 * 3. Keeps "Environmental Protection Fee" (global category)
 * 4. Keeps other fee categories (appeal, conditional, penalty, variable_fee)
 *
 * Usage:
 *   node backend/services/business-service/src/seed/cleanupFees.js
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

  console.log("\n=== Fee Cleanup ===\n");

  // Step 1: Delete all fees with category "application_fee"
  console.log("Step 1: Deleting all fees with category 'application_fee'...");
  const applicationFeeDeleteResult = await Fee.deleteMany({
    category: "application_fee",
  });
  console.log(
    `  Deleted ${applicationFeeDeleteResult.deletedCount} application_fee records`,
  );

  // Step 2: Delete "Application Fee" and "Plate Fee" by amount (global category)
  // Names are encrypted, so we identify by amount
  console.log(
    "\nStep 2: Deleting 'Application Fee' (₱100, ₱1001) and 'Plate Fee' (₱50) (global category)...",
  );
  const applicationFeeDelete = await Fee.deleteOne({
    amount: 100,
    category: "global",
  });
  console.log(
    `  Deleted 'Application Fee' (₱100): ${applicationFeeDelete.deletedCount > 0 ? "Yes" : "Not found"}`,
  );

  const applicationFeeDelete2 = await Fee.deleteOne({
    amount: 1001,
    category: "global",
  });
  console.log(
    `  Deleted 'Application Fee' (₱1001): ${applicationFeeDelete2.deletedCount > 0 ? "Yes" : "Not found"}`,
  );

  const plateFeeDelete = await Fee.deleteOne({
    amount: 50,
    category: "global",
  });
  console.log(
    `  Deleted 'Plate Fee' (₱50): ${plateFeeDelete.deletedCount > 0 ? "Yes" : "Not found"}`,
  );

  // Step 3: Verify Environmental Protection Fee is still present
  console.log(
    "\nStep 3: Verifying 'Environmental Protection Fee' (₱200) is preserved...",
  );
  const envFee = await Fee.findOne({
    amount: 200,
    category: "global",
  });
  console.log(
    `  Environmental Protection Fee (₱200): ${envFee ? "✓ Preserved" : "✗ Missing"}`,
  );

  // Step 4: Count remaining fees by category
  console.log("\nStep 4: Counting remaining fees by category...");
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
  await mongoose.disconnect();
}

module.exports = { cleanup };

// Run cleanup if called directly
if (require.main === module) {
  cleanup().catch(console.error);
}
