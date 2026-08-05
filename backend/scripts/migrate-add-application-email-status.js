/**
 * Migration script to add emailSendStatus field to existing Application and GeneralPermit documents
 * Run this script after updating the models to add the new field
 *
 * Usage: node backend/scripts/migrate-add-application-email-status.js
 */

const { MongoClient } = require("mongodb");

// MongoDB connection string from environment
// Use local MongoDB for development (Docker container)
const MONGO_URI = "mongodb://localhost:27017/bizclear";

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully");

    const db = client.db();

    // Migrate Application documents
    console.log("\nMigrating Application documents...");
    const applicationsCollection = db.collection("applications");
    const applicationCount = await applicationsCollection.countDocuments({
      emailSendStatus: { $exists: false },
    });
    console.log(
      `Found ${applicationCount} Application documents without emailSendStatus`,
    );

    if (applicationCount > 0) {
      const appResult = await applicationsCollection.updateMany(
        { emailSendStatus: { $exists: false } },
        {
          $set: {
            emailSendStatus: {
              submitted: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              approved: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              rejected: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              returned: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              appeal_denied: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              appeal_approved: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
            },
          },
        },
      );
      console.log(`Updated ${appResult.modifiedCount} Application documents`);
    } else {
      console.log("No Application documents need migration");
    }

    // Migrate GeneralPermit documents
    console.log("\nMigrating GeneralPermit documents...");
    const generalPermitsCollection = db.collection("generalpermits");
    const permitCount = await generalPermitsCollection.countDocuments({
      emailSendStatus: { $exists: false },
    });
    console.log(
      `Found ${permitCount} GeneralPermit documents without emailSendStatus`,
    );

    if (permitCount > 0) {
      const permitResult = await generalPermitsCollection.updateMany(
        { emailSendStatus: { $exists: false } },
        {
          $set: {
            emailSendStatus: {
              submitted: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              approved: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              rejected: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
              returned: {
                status: "pending",
                retryCount: 0,
                lastAttempt: null,
                lockUntil: null,
              },
            },
          },
        },
      );
      console.log(
        `Updated ${permitResult.modifiedCount} GeneralPermit documents`,
      );
    } else {
      console.log("No GeneralPermit documents need migration");
    }

    console.log("\n✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

migrate();
