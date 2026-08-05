/**
 * Quick script to check application statuses in MongoDB
 * Run: node backend/scripts/check-application-statuses.js
 */

const mongoose = require("mongoose");

require("dotenv").config({ path: ".env" });

async function checkStatuses() {
  try {
    // Connect to MongoDB (use Docker internal MongoDB credentials but with localhost)
    const mongoUri =
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Check applications collection
    const applications = await db
      .collection("applications")
      .find(
        {},
        {
          applicationId: 1,
          applicationStatus: 1,
          businessName: 1,
          userId: 1,
        },
      )
      .limit(20)
      .toArray();

    console.log("\n=== Applications Collection ===");
    console.log(`Total applications checked: ${applications.length}`);

    applications.forEach((app, idx) => {
      console.log(`${idx + 1}. applicationId: ${app.applicationId}`);
      console.log(`   applicationStatus: ${app.applicationStatus}`);
      console.log(`   businessName: ${app.businessName}`);
      console.log(`   userId: ${app.userId}`);
      console.log("");
    });

    // Check BusinessProfile collection (businesses array)
    const businessProfiles = await db
      .collection("businessprofiles")
      .find(
        {},
        {
          userId: 1,
          businesses: 1,
        },
      )
      .limit(10)
      .toArray();

    console.log("\n=== BusinessProfile Collection ===");
    console.log(`Total business profiles checked: ${businessProfiles.length}`);

    let allBusinesses = [];
    businessProfiles.forEach((profile, idx) => {
      console.log(`\nProfile ${idx + 1} (userId: ${profile.userId}):`);
      if (profile.businesses && profile.businesses.length > 0) {
        profile.businesses.forEach((business, bIdx) => {
          console.log(`  Business ${bIdx + 1}:`);
          console.log(`    businessId: ${business.businessId}`);
          console.log(`    applicationStatus: ${business.applicationStatus}`);
          console.log(`    businessName: ${business.businessName}`);
          allBusinesses.push(business);
        });
      } else {
        console.log("  No businesses");
      }
    });

    // Check Business collection
    const businesses = await db
      .collection("businesses")
      .find(
        {},
        {
          businessId: 1,
          businessStatus: 1,
          businessName: 1,
          userId: 1,
        },
      )
      .limit(20)
      .toArray();

    console.log("\n=== Business Collection ===");
    console.log(`Total businesses checked: ${businesses.length}`);

    businesses.forEach((business, idx) => {
      console.log(`${idx + 1}. businessId: ${business.businessId}`);
      console.log(`   businessStatus: ${business.businessStatus}`);
      console.log(`   businessName: ${business.businessName}`);
      console.log(`   userId: ${business.userId}`);
      console.log("");
    });

    // Count by status from BusinessProfile
    const statusCounts = {};
    allBusinesses.forEach((b) => {
      const status = b.applicationStatus || "no-status";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log("\n=== Status Counts (from BusinessProfile) ===");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

    await mongoose.disconnect();
    console.log("\nDone");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkStatuses();
