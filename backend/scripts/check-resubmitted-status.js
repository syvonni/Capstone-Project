const mongoose = require("mongoose");
const Application = require("../services/business-service/src/models/Application");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://capstone_app:g95fxnwa1wPDdyfA@capstone.efa2aqu.mongodb.net/?appName=capstone";

async function checkResubmittedApplications() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
    console.log("Connected to MongoDB");

    // Find all applications with status 'resubmit'
    const applications = await Application.find({
      applicationStatus: "resubmit",
    }).maxTimeMS(60000);

    console.log(`Found ${applications.length} resubmitted applications:`);

    for (const app of applications) {
      console.log(`\nApplication ID: ${app.applicationId}`);
      console.log(`Status: ${app.applicationStatus}`);
      console.log(`Business Name: ${app.businessName}`);
      console.log(`Reference Number: ${app.applicationReferenceNumber}`);
      console.log(`Submitted At: ${app.submittedAt}`);
      console.log(`Reviewed At: ${app.reviewedAt}`);
      console.log(`Return Count: ${app.returnCount || 0}`);
      console.log(`Return Exhausted: ${app.returnExhausted || false}`);
    }
  } catch (err) {
    console.error("Error checking resubmitted applications:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

checkResubmittedApplications();
