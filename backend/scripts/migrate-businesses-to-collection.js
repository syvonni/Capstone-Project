const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
const projectRootEnv = path.join(__dirname, "..", ".env");
dotenv.config({ path: projectRootEnv });

const MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI not set in environment variables");
  process.exit(1);
}

// Models
const BusinessProfile = require("./models/BusinessProfile");
const Business = require("./models/Business");

// Field mapping from old schema to new Business model
const FIELD_MAPPING = {
  businessId: "businessId",
  businessName: "businessName",
  registeredBusinessName: "registeredBusinessName",
  businessStatus: "businessStatus",
  registrationStatus: "registrationStatus",
  location: "location",
  businessType: "businessType",
  registrationAgency: "registrationAgency",
  businessRegistrationNumber: "businessRegistrationNumber",
  businessStartDate: "businessStartDate",
  numberOfBranches: "numberOfBranches",
  industryClassification: "industryClassification",
  taxIdentificationNumber: "taxIdentificationNumber",
  contactNumber: "contactNumber",
  riskProfile: "riskProfile",
  retirementStatus: "retirementStatus",
  retirementRequestedAt: "retirementRequestedAt",
  retirementApplicationLetter: "retirementApplicationLetter",
  swornStatementGrossSales: "swornStatementGrossSales",
  yearsActive: "yearsActive",
  inspectorVerifiedClosed: "inspectorVerifiedClosed",
  inspectorVerifiedAt: "inspectorVerifiedAt",
  retirementConfirmedAt: "retirementConfirmedAt",
  retirementRejectionReason: "retirementRejectionReason",
  permitRevoked: "permitRevoked",
  revokedAt: "revokedAt",
  revokedReason: "revokedReason",
};

async function migrateBusinesses(dryRun = false) {
  console.log(`\n${dryRun ? "DRY RUN" : "MIGRATION"} MODE`);
  console.log("=".repeat(50));

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const profiles = await BusinessProfile.find({}).lean();
    console.log(`Found ${profiles.length} BusinessProfile documents`);

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedBusinesses = [];

    for (const profile of profiles) {
      if (!profile.businesses || profile.businesses.length === 0) {
        continue;
      }

      for (const oldBusiness of profile.businesses) {
        // Only migrate approved businesses
        if (oldBusiness.applicationStatus !== "approved") {
          skippedCount++;
          continue;
        }

        // Check if Business already exists (idempotent)
        const existing = await Business.findOne({
          businessId: oldBusiness.businessId,
        });
        if (existing) {
          console.log(
            `  SKIP: Business ${oldBusiness.businessId} already exists in Business collection`,
          );
          skippedCount++;
          continue;
        }

        // Check required fields
        if (!oldBusiness.businessId) {
          console.log(`  FAIL: Business missing businessId`);
          failedCount++;
          failedBusinesses.push({
            reason: "missing businessId",
            data: oldBusiness,
          });
          continue;
        }

        if (!oldBusiness.businessRegistrationNumber) {
          console.log(
            `  FAIL: Business ${oldBusiness.businessId} missing businessRegistrationNumber`,
          );
          failedCount++;
          failedBusinesses.push({
            reason: "missing businessRegistrationNumber",
            businessId: oldBusiness.businessId,
          });
          continue;
        }

        // Build new Business document
        const newBusinessData = {
          businessId: oldBusiness.businessId,
          userId: profile.userId,
          ownerProfileId: profile._id,
          approvedApplicationId: null, // No originating Application for legacy businesses
          migratedFromLegacy: true,
        };

        // Map fields
        for (const [oldField, newField] of Object.entries(FIELD_MAPPING)) {
          if (oldBusiness[oldField] !== undefined) {
            newBusinessData[newField] = oldBusiness[oldField];
          }
        }

        // Ensure businessStatus is valid enum
        if (
          !["active", "inactive", "closed"].includes(
            newBusinessData.businessStatus,
          )
        ) {
          newBusinessData.businessStatus = "active";
        }

        // Ensure registrationStatus is valid enum
        if (
          !["not_yet_registered", "proposed"].includes(
            newBusinessData.registrationStatus,
          )
        ) {
          newBusinessData.registrationStatus = "proposed";
        }

        if (dryRun) {
          console.log(
            `  WOULD CREATE: Business ${oldBusiness.businessId} - ${oldBusiness.businessName}`,
          );
          console.log(`    Data:`, JSON.stringify(newBusinessData, null, 2));
          migratedCount++;
        } else {
          try {
            await Business.create(newBusinessData);
            console.log(
              `  CREATED: Business ${oldBusiness.businessId} - ${oldBusiness.businessName}`,
            );
            migratedCount++;
          } catch (err) {
            console.log(
              `  FAIL: Could not create Business ${oldBusiness.businessId}:`,
              err.message,
            );
            failedCount++;
            failedBusinesses.push({
              reason: err.message,
              businessId: oldBusiness.businessId,
            });
          }
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("SUMMARY:");
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Failed: ${failedCount}`);

    if (failedBusinesses.length > 0) {
      console.log("\nFailed businesses:");
      failedBusinesses.forEach((fb) => {
        console.log(`  - ${fb.businessId || "unknown"}: ${fb.reason}`);
      });
    }

    if (!dryRun) {
      console.log(
        "\nNext step: Run this script with --cleanup to delete migrated businesses from BusinessProfile.businesses array",
      );
    }
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

async function cleanupMigratedBusinesses() {
  console.log("\nCLEANUP MODE");
  console.log("=".repeat(50));
  console.log(
    "This will delete migrated businesses from BusinessProfile.businesses array",
  );
  console.log(
    "Make sure you have run the migration first and verified the data!\n",
  );

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const profiles = await BusinessProfile.find({}).lean();
    console.log(`Found ${profiles.length} BusinessProfile documents`);

    let deletedCount = 0;

    for (const profile of profiles) {
      if (!profile.businesses || profile.businesses.length === 0) {
        continue;
      }

      const businessesToDelete = [];
      for (const oldBusiness of profile.businesses) {
        // Only delete approved businesses that have been migrated
        if (oldBusiness.applicationStatus !== "approved") {
          continue;
        }

        // Check if Business exists in new collection
        const existing = await Business.findOne({
          businessId: oldBusiness.businessId,
        });
        if (existing) {
          businessesToDelete.push(oldBusiness.businessId);
        }
      }

      if (businessesToDelete.length > 0) {
        await BusinessProfile.updateOne(
          { _id: profile._id },
          {
            $pull: { businesses: { businessId: { $in: businessesToDelete } } },
          },
        );
        console.log(
          `  Deleted ${businessesToDelete.length} businesses from profile ${profile._id}`,
        );
        deletedCount += businessesToDelete.length;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(
      `Total businesses deleted from BusinessProfile.businesses: ${deletedCount}`,
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const cleanup = args.includes("--cleanup");

if (cleanup) {
  cleanupMigratedBusinesses();
} else {
  migrateBusinesses(dryRun);
}
