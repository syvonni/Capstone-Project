/**
 * Reseed FAQ content - deletes existing FAQ sections and re-creates them.
 * Use this to refresh FAQ content with updated data from seedCmsContent.js.
 */

const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("../config/db");
const FaqSection = require("../models/FaqSection");
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

async function reseedFaq() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable not set");
    }

    await connectDB(mongoUri);

    // Delete all existing FAQ sections
    const deleteResult = await FaqSection.deleteMany({});
    logger.info(`Deleted ${deleteResult.deletedCount} existing FAQ sections`);

    // Force seed by setting SEED_CMS=true temporarily
    const originalSeedCms = process.env.SEED_CMS;
    process.env.SEED_CMS = "true";

    // Run the seed
    const result = await seedCmsContentIfEmpty();

    // Restore original value
    process.env.SEED_CMS = originalSeedCms;

    logger.info("FAQ reseed completed", result);
    console.log("FAQ reseed completed successfully:", result);

    process.exit(0);
  } catch (err) {
    logger.error("FAQ reseed failed", { error: err.message });
    console.error("Error:", err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  reseedFaq();
}

module.exports = { reseedFaq };
