/**
 * Migration script to decrypt applicationStatus field in Application collection
 * This is needed because applicationStatus was removed from encryption to fix filtering queries
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables (only if MONGO_URI is not already set by Docker)
if (!process.env.MONGO_URI) {
  dotenv.config();
  const projectRootEnv = path.join(__dirname, "..", ".env");
  try {
    require("dotenv").config({ path: projectRootEnv });
  } catch (_) {
    /* optional */
  }

  // If MONGO_URI is still not set, construct it from individual variables (for Docker local MongoDB)
  if (
    !process.env.MONGO_URI &&
    process.env.MONGO_APP_USER &&
    process.env.MONGO_APP_PASSWORD
  ) {
    const host = process.env.MONGO_HOST || "localhost";
    process.env.MONGO_URI = `mongodb://${process.env.MONGO_APP_USER}:${process.env.MONGO_APP_PASSWORD}@${host}:27017/capstone_project?authSource=admin`;
  }
}

const { fieldCipher } = require("../shared/lib/fieldCipher");

async function migrateDecryptApplicationStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const Application = require("../services/business-service/src/models/Application");

    // Find all applications with encrypted applicationStatus
    const applications = await Application.find({
      applicationStatus: { $regex: /^det:v2:/ },
    });
    console.log(
      `Found ${applications.length} applications with encrypted applicationStatus`,
    );

    let updated = 0;
    for (const app of applications) {
      try {
        const encryptedStatus = app.applicationStatus;
        const decryptedStatus = fieldCipher.decrypt(encryptedStatus);

        if (decryptedStatus && decryptedStatus !== encryptedStatus) {
          // Use updateOne to bypass encryption plugin
          await Application.updateOne(
            { _id: app._id },
            { $set: { applicationStatus: decryptedStatus } },
          );
          updated++;
          console.log(
            `Decrypted application ${app.applicationId}: ${encryptedStatus.substring(0, 50)}... -> ${decryptedStatus}`,
          );
        }
      } catch (err) {
        console.error(
          `Failed to decrypt application ${app.applicationId}:`,
          err.message,
        );
      }
    }

    console.log(`Successfully decrypted ${updated} applicationStatus fields`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateDecryptApplicationStatus();
}

module.exports = { migrateDecryptApplicationStatus };
