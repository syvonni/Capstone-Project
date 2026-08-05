/**
 * Migration Script: Migrate BusinessProfile.businesses[] to Application collection
 *
 * This script migrates draft/submitted applications from the embedded
 * BusinessProfile.businesses[] array to the Application collection.
 *
 * Usage: node backend/scripts/migrate-profile-businesses-to-application.js
 */

const mongoose = require("mongoose");
const BusinessProfile = require("../services/business-service/src/models/BusinessProfile");
const Application = require("../services/business-service/src/models/Application");

require("dotenv").config({ path: ".env" });

async function migrate() {
  try {
    // Connect to MongoDB (use Docker internal MongoDB)
    const mongoUri =
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find all BusinessProfiles with businesses array
    const profiles = await BusinessProfile.find({
      businesses: { $exists: true, $ne: [] },
    });
    console.log(`Found ${profiles.length} profiles with businesses array`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      console.log(`Processing profile for user: ${profile.userId}`);

      for (const business of profile.businesses) {
        try {
          // Check if application already exists with this businessId
          const existing = await Application.findOne({
            applicationId: business.businessId,
          });
          if (existing) {
            console.log(
              `  Skipping duplicate applicationId: ${business.businessId}`,
            );
            skippedCount++;
            continue;
          }

          // Create Application document from business subdocument
          const application = await Application.create({
            applicationId: business.businessId,
            userId: profile.userId,
            applicationType: business.applicationType || "new",
            applicationStatus: business.applicationStatus || "draft",
            applicationReferenceNumber:
              business.applicationReferenceNumber || "",
            reviewedBy: business.reviewedBy || null,
            reviewedByName: business.reviewedByName || "",
            reviewedAt: business.reviewedAt || null,
            reviewComments: business.reviewComments || "",
            rejectionReason: business.rejectionReason || "",
            hasActiveAppeal: business.hasActiveAppeal || false,
            appealId: business.appealId || "",
            appealExhausted: business.appealExhausted || false,
            fieldReviewDecisions: business.fieldReviewDecisions || {},
            formType: business.formType || "",
            category: business.category || "",
            permitFormId: business.permitFormId || business.formDefinitionId || null,
            formData: business.formData || {},
            lguDocuments: business.lguDocuments || {},
            organizationType: business.organizationType || "",
            businessPlateNo: business.businessPlateNo || "",
            yearEstablished: business.yearEstablished || null,
            houseBldgNo: business.houseBldgNo || "",
            buildingName: business.buildingName || "",
            subdivision: business.subdivision || "",
            blockCode: business.blockCode || "",
            pin: business.pin || "",
            buildingRegistryNo: business.buildingRegistryNo || "",
            businessAreaSqm: business.businessAreaSqm || 0,
            totalEmployees: business.totalEmployees || 0,
            employeesResidingInLgu: business.employeesResidingInLgu || 0,
            ownerAddress: business.ownerAddress || {},
            lessorInfo: business.lessorInfo || {},
            emergencyContact: business.emergencyContact || {},
            presidentName: business.presidentName || "",
            treasurerName: business.treasurerName || "",
            businessActivities: business.businessActivities || [],
            capital: business.capital || {},
            accreditations: business.accreditations || {},
            oathOfUndertaking: business.oathOfUndertaking || false,
            birRegistration: business.birRegistration || {},
            otherAgencyRegistrations: business.otherAgencyRegistrations || {},
            submittedAt: business.submittedAt
              ? new Date(business.submittedAt)
              : null,
            submittedToLguOfficer: business.submittedToLguOfficer || false,
            isSubmitted: business.isSubmitted || false,
            createdByOfficer: business.createdByOfficer || false,
            createdAt: business.createdAt
              ? new Date(business.createdAt)
              : new Date(),
            updatedAt: business.updatedAt
              ? new Date(business.updatedAt)
              : new Date(),
          });

          console.log(
            `  Migrated application: ${business.businessId} (${business.applicationStatus})`,
          );
          migratedCount++;
        } catch (err) {
          console.error(
            `  Error migrating business ${business.businessId}:`,
            err.message,
          );
          errorCount++;
        }
      }

      // Clear businesses array from profile
      profile.businesses = [];
      await profile.save();
      console.log(`  Cleared businesses array from profile`);
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total profiles processed: ${profiles.length}`);
    console.log(`Applications migrated: ${migratedCount}`);
    console.log(`Skipped (duplicates): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log(
        "\n⚠️  Some applications failed to migrate. Check logs above.",
      );
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run migration
migrate();
