/**
 * Migration script to backfill applicationReferenceNumber for existing applications
 * Run: node backend/scripts/backfill-reference-numbers.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGO_URI =
  "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";

async function backfillReferenceNumbers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const Business = mongoose.connection.collection("businesses");
    const Application = mongoose.connection.collection("applications");

    // Find businesses without applicationReferenceNumber
    const businessesWithoutRef = await Business.find({
      $or: [
        { applicationReferenceNumber: { $exists: false } },
        { applicationReferenceNumber: null },
        { applicationReferenceNumber: "" },
      ],
    }).toArray();

    console.log(
      `Found ${businessesWithoutRef.length} businesses without reference numbers`,
    );

    let updatedCount = 0;
    for (const business of businessesWithoutRef) {
      const businessId = business.businessId || String(business._id);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const referenceNumber = `APP-${dateStr}-${randomSeq}`;

      await Business.updateOne(
        { _id: business._id },
        { $set: { applicationReferenceNumber: referenceNumber } },
      );

      console.log(
        `Updated business ${businessId} with reference number: ${referenceNumber}`,
      );
      updatedCount++;
    }

    // Find applications without applicationReferenceNumber
    const applicationsWithoutRef = await Application.find({
      $or: [
        { applicationReferenceNumber: { $exists: false } },
        { applicationReferenceNumber: null },
        { applicationReferenceNumber: "" },
      ],
    }).toArray();

    console.log(
      `Found ${applicationsWithoutRef.length} applications without reference numbers`,
    );

    for (const application of applicationsWithoutRef) {
      const applicationId =
        application.applicationId ||
        application.businessId ||
        String(application._id);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const referenceNumber = `APP-${dateStr}-${randomSeq}`;

      await Application.updateOne(
        { _id: application._id },
        { $set: { applicationReferenceNumber: referenceNumber } },
      );

      console.log(
        `Updated application ${applicationId} with reference number: ${referenceNumber}`,
      );
      updatedCount++;
    }

    console.log(`Total updated: ${updatedCount} records`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

backfillReferenceNumbers();
