/**
 * Reseed fee instruction content - deletes specific fee instruction slots and re-creates them.
 * Use this to refresh fee instruction content with updated data from seedCmsContent.js.
 */

const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("../config/db");
const InstructionContent = require("../models/InstructionContent");
const logger = require("../lib/logger");
const { seedCmsContentIfEmpty } = require("./seedCmsContent");

// Load environment variables
dotenv.config();
const projectRootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
try {
  require("dotenv").config({ path: projectRootEnv });
} catch (_) {
  /* optional */
}

async function reseedFeeInstructions() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/capstone_project";
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable not set");
    }

    await connectDB(mongoUri);

    // Delete specific fee instruction slots
    const feeSlotIds = [
      "admin-global-fees",
      "admin-conditional-fees",
      "admin-classification-fees",
      "admin-appeal-fees",
      "admin-variable-fee-rules",
      "admin-tax-brackets",
      "admin-claimable-document-fees-management",
      "admin-lob",
    ];

    const deleteResult = await InstructionContent.deleteMany({
      slotId: { $in: feeSlotIds }
    });
    logger.info(`Deleted ${deleteResult.deletedCount} fee instruction slots`);

    // Force seed by setting SEED_CMS=true temporarily
    const originalSeedCms = process.env.SEED_CMS;
    process.env.SEED_CMS = "true";

    // Run the seed
    const result = await seedCmsContentIfEmpty();

    // Restore original value
    process.env.SEED_CMS = originalSeedCms;

    logger.info("Fee instructions reseed completed", result);
    console.log("Fee instructions reseed completed successfully:", result);

    process.exit(0);
  } catch (err) {
    logger.error("Fee instructions reseed failed", { error: err.message });
    console.error("Error:", err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  reseedFeeInstructions();
}

module.exports = { reseedFeeInstructions };
