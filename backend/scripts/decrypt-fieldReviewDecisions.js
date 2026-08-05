/**
 * Migration script to decrypt fieldReviewDecisions in applications collection
 * This script removes encryption from fieldReviewDecisions.status and other string fields
 * so the frontend can read them for status checks (e.g., status === 'request_changes')
 */

const mongoose = require("mongoose");
const { decrypt, isEncrypted } = require("../shared/lib/fieldCipher");

// MongoDB connection
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";

async function migrate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const Application = mongoose.connection.collection("applications");

    // Find all applications with fieldReviewDecisions
    const cursor = Application.find({
      fieldReviewDecisions: { $exists: true },
    });
    let count = 0;
    let updated = 0;

    for await (const app of cursor) {
      count++;
      const fieldReviewDecisions = app.fieldReviewDecisions;
      let needsUpdate = false;

      // Decrypt each field decision
      for (const [fieldKey, decision] of Object.entries(fieldReviewDecisions)) {
        if (decision && typeof decision === "object") {
          // Decrypt status
          if (
            decision.status &&
            typeof decision.status === "string" &&
            isEncrypted(decision.status)
          ) {
            try {
              decision.status = decrypt(decision.status);
              needsUpdate = true;
            } catch (err) {
              console.error(
                `Failed to decrypt status for ${fieldKey}:`,
                err.message,
              );
            }
          }

          // Decrypt requestCode
          if (
            decision.requestCode &&
            typeof decision.requestCode === "string" &&
            isEncrypted(decision.requestCode)
          ) {
            try {
              decision.requestCode = decrypt(decision.requestCode);
              needsUpdate = true;
            } catch (err) {
              console.error(
                `Failed to decrypt requestCode for ${fieldKey}:`,
                err.message,
              );
            }
          }

          // Decrypt requestOther
          if (
            decision.requestOther &&
            typeof decision.requestOther === "string" &&
            isEncrypted(decision.requestOther)
          ) {
            try {
              decision.requestOther = decrypt(decision.requestOther);
              needsUpdate = true;
            } catch (err) {
              console.error(
                `Failed to decrypt requestOther for ${fieldKey}:`,
                err.message,
              );
            }
          }

          // Decrypt decidedBy
          if (
            decision.decidedBy &&
            typeof decision.decidedBy === "string" &&
            isEncrypted(decision.decidedBy)
          ) {
            try {
              decision.decidedBy = decrypt(decision.decidedBy);
              needsUpdate = true;
            } catch (err) {
              console.error(
                `Failed to decrypt decidedBy for ${fieldKey}:`,
                err.message,
              );
            }
          }

          // Decrypt decidedByName
          if (
            decision.decidedByName &&
            typeof decision.decidedByName === "string" &&
            isEncrypted(decision.decidedByName)
          ) {
            try {
              decision.decidedByName = decrypt(decision.decidedByName);
              needsUpdate = true;
            } catch (err) {
              console.error(
                `Failed to decrypt decidedByName for ${fieldKey}:`,
                err.message,
              );
            }
          }
        }
      }

      if (needsUpdate) {
        await Application.updateOne(
          { _id: app._id },
          { $set: { fieldReviewDecisions } },
        );
        updated++;
        console.log(
          `Updated application ${app._id} (${app.businessName || "Unknown"})`,
        );
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Processed ${count} applications with fieldReviewDecisions`);
    console.log(`Updated ${updated} applications`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

migrate();
