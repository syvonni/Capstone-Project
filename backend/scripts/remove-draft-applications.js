/**
 * Script to remove all draft applications from MongoDB
 * Run: node backend/scripts/remove-draft-applications.js
 */

const mongoose = require("mongoose");

require("dotenv").config({ path: ".env" });

async function removeDraftApplications() {
  try {
    // Connect to MongoDB (use Docker internal MongoDB credentials but with localhost)
    const mongoUri =
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find and delete all draft applications
    const result = await db
      .collection("applications")
      .deleteMany({ applicationStatus: "draft" });

    console.log(`Deleted ${result.deletedCount} draft applications`);

    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

removeDraftApplications();
