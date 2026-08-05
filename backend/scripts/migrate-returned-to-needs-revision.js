/**
 * Migration script: Convert 'returned' status to 'needs_revision'
 * This standardizes the application status to use 'needs_revision' consistently
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/capstone_project";

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Update Business collection
    const businessResult = await mongoose.connection
      .collection("businesses")
      .updateMany({ applicationStatus: "returned" }, { $set: { applicationStatus: "needs_revision" } });
    console.log(`Updated ${businessResult.modifiedCount} Business records from 'returned' to 'needs_revision'`);

    // Update Application collection
    const applicationResult = await mongoose.connection
      .collection("applications")
      .updateMany({ applicationStatus: "returned" }, { $set: { applicationStatus: "needs_revision" } });
    console.log(`Updated ${applicationResult.modifiedCount} Application records from 'returned' to 'needs_revision'`);

    // Update BusinessProfile businesses subdocuments
    const profileResult = await mongoose.connection
      .collection("businessprofiles")
      .updateMany(
        { "businesses.applicationStatus": "returned" },
        { $set: { "businesses.$[].applicationStatus": "needs_revision" } }
      );
    console.log(`Updated ${profileResult.modifiedCount} BusinessProfile records from 'returned' to 'needs_revision'`);

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
