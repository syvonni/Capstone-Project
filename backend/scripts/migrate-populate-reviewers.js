/**
 * Migration script to populate reviewers array from existing reviewedBy data
 * Run with: node backend/scripts/migrate-populate-reviewers.js
 */

const mongoose = require("mongoose");
const Application = require("../services/business-service/src/models/Application");

require("dotenv").config({ path: ".env" });

async function migrateReviewers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    let updatedCount = 0;
    let skippedCount = 0;

    // Only update applications that have reviewedBy but no reviewers array
    const result = await Application.updateMany(
      {
        reviewedBy: { $exists: true, $ne: null },
        reviewedByName: { $exists: true, $ne: null, $ne: "" },
        reviewers: { $exists: false },
      },
      [
        {
          $set: {
            reviewers: [
              {
                officerId: "$reviewedBy",
                officerName: "$reviewedByName",
              },
            ],
          },
        },
      ],
    );

    updatedCount = result.modifiedCount || 0;
    console.log(`Updated ${updatedCount} applications with reviewers array`);

    // Count applications that already have reviewers or no reviewedBy
    const totalApps = await Application.countDocuments();
    const withReviewers = await Application.countDocuments({
      reviewers: { $exists: true, $ne: [] },
    });
    skippedCount = totalApps - updatedCount;

    console.log("\nMigration complete:");
    console.log(`- Updated: ${updatedCount} applications`);
    console.log(
      `- Skipped: ${skippedCount} applications (already have reviewers or no reviewedBy)`,
    );
    console.log(`- Total applications: ${totalApps}`);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run migration
migrateReviewers();
