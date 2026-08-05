/**
 * Migration script to update return flags for recently resubmitted applications
 * This sets returnCount=1 and returnExhausted=true for applications with status 'resubmit'
 * since they were returned once before being resubmitted.
 */

const mongoose = require("mongoose");
const Application = require("../services/business-service/src/models/Application");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://capstone_app:g95fxnwa1wPDdyfA@capstone.efa2aqu.mongodb.net/?appName=capstone";

async function updateResubmittedApplications() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
    console.log("Connected to MongoDB");

    // Find all applications with status 'resubmit' that don't have return flags set
    const applications = await Application.find({
      applicationStatus: "resubmit",
      returnCount: { $exists: false },
    }).maxTimeMS(60000);

    console.log(
      `Found ${applications.length} resubmitted applications to update`,
    );

    let updatedCount = 0;
    for (const app of applications) {
      await Application.updateOne(
        { _id: app._id },
        {
          $set: {
            returnCount: 1,
            returnExhausted: true,
          },
        },
      );
      updatedCount++;
      console.log(`Updated application ${app.applicationId}`);
    }

    console.log(
      `Updated ${updatedCount} resubmitted applications with return flags`,
    );
  } catch (err) {
    console.error("Error updating resubmitted applications:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

updateResubmittedApplications();
