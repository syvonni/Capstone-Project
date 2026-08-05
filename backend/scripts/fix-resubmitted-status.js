const mongoose = require("mongoose");
const Application = require("../services/business-service/src/models/Application");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";

async function fixResubmittedStatus() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
    console.log("Connected to MongoDB");

    // The two application IDs that were recently resubmitted
    const applicationIds = [
      "6a4004544002fdf04b0b4bfa",
      "6a4004734002fdf04b0b4c54",
    ];

    let updatedCount = 0;
    for (const appId of applicationIds) {
      const app = await Application.findOne({ applicationId: appId });
      if (app) {
        console.log(`\nApplication ID: ${app.applicationId}`);
        console.log(`Current Status: ${app.applicationStatus}`);

        // Update to resubmit if it's under_review
        if (app.applicationStatus === "under_review") {
          app.applicationStatus = "resubmit";
          await app.save();
          console.log(`Updated to: resubmit`);
          updatedCount++;
        } else {
          console.log(`Status is not under_review, skipping`);
        }
      } else {
        console.log(`Application not found: ${appId}`);
      }
    }

    console.log(`\nTotal updated: ${updatedCount}`);
  } catch (err) {
    console.error("Error fixing resubmitted status:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

fixResubmittedStatus();
