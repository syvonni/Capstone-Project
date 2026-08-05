/**
 * Script to change all draft applications to submitted status
 * Run: node backend/scripts/change-draft-to-submitted.js
 */

const mongoose = require("mongoose");

require("dotenv").config({ path: ".env" });

async function changeDraftToSubmitted() {
  try {
    // Connect to MongoDB with root credentials
    const mongoUri = `mongodb://${process.env.MONGO_ROOT_USER}:${process.env.MONGO_ROOT_PASSWORD}@localhost:27017/capstone_project?authSource=admin`;
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find and update all draft applications to submitted
    const result = await db
      .collection("applications")
      .updateMany(
        { applicationStatus: "draft" },
        { $set: { applicationStatus: "submitted" } }
      );

    console.log(`Updated ${result.modifiedCount} draft applications to submitted`);

    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

changeDraftToSubmitted();
