#!/usr/bin/env node
/**
 * Migration: Decrypt excluded array subdoc fields back to plaintext.
 *
 * The encryption plugin was encrypting ALL string fields inside the
 * BusinessProfile.businesses[] array (via arrayPaths). This broke every
 * MongoDB query that filters on those fields (applicationStatus, businessId,
 * businessName, etc.). The plugin now has arrayPathsExclude support, but
 * existing data still has these fields encrypted. This script decrypts them
 * back to plaintext so queries work again.
 *
 * Also re-encrypts Appeal.businessId, EditRequest.businessId,
 * Inspection.businessId, PostRequirement.businessId from randomized to
 * deterministic encryption (moved to deterministicFields in the models).
 *
 * Usage:
 *   MONGO_URI=<uri> FIELD_ENCRYPTION_KEY=<key> node backend/scripts/migrate-decrypt-excluded-fields.js
 */

const mongoose = require("mongoose");
const {
  decrypt,
  isEncrypted,
  encryptDeterministic,
} = require("../shared/lib/fieldCipher");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/capstone";

// Fields inside businesses[] that should be plaintext (no longer encrypted)
const EXCLUDED_BUSINESS_FIELDS = [
  "businessId",
  "applicationStatus",
  "applicationReferenceNumber",
  "businessName",
  "registeredBusinessName",
  "businessPlateNo",
  "businessStatus",
  "registrationStatus",
  "retirementStatus",
  "applicationId",
  "applicationType",
  "isSubmitted",
  "submittedToLguOfficer",
  "reviewedBy",
  "claimedBy",
  "formType",
  "category",
  "businessRegistrationNumber",
  "registrationAgency",
  "formData",
  "permitFormId",
  "businessRegistration",
  "ownerIdentity",
  "location",
  "birRegistration",
  "otherAgencyRegistrations",
  "lguDocuments",
  "fieldReviewDecisions",
  "reviewedByName",
  "ownerName",
];

// Models where businessId moved from fields → deterministicFields
const DETERMINISTIC_MIGRATIONS = [
  {
    collection: "appeals",
    fields: ["businessId", "applicationId", "violationId", "inspectionId"],
  },
  { collection: "editrequests", fields: ["businessId", "fieldName"] },
  { collection: "inspections", fields: ["businessId"] },
  { collection: "postrequirements", fields: ["businessId", "permitId"] },
];

async function run() {
  console.log("Connecting to", MONGO_URI.replace(/\/\/.*@/, "//<redacted>@"));
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // ─── 1. Fix BusinessProfile.businesses[] excluded fields ───
  console.log(
    "\n=== Decrypting excluded fields in BusinessProfile.businesses[] ===",
  );
  const profilesColl = db.collection("businessprofiles");
  const profiles = await profilesColl.find({}).toArray();
  let profilesFixed = 0;
  let fieldsDecrypted = 0;

  for (const profile of profiles) {
    if (!Array.isArray(profile.businesses) || profile.businesses.length === 0)
      continue;
    let modified = false;

    for (const biz of profile.businesses) {
      for (const field of EXCLUDED_BUSINESS_FIELDS) {
        const val = biz[field];
        if (typeof val === "string" && isEncrypted(val)) {
          try {
            biz[field] = decrypt(val);
            modified = true;
            fieldsDecrypted++;
          } catch (err) {
            console.warn(
              `  Failed to decrypt ${field} in profile ${profile._id}:`,
              err.message,
            );
          }
        }
      }
    }

    if (modified) {
      await profilesColl.updateOne(
        { _id: profile._id },
        { $set: { businesses: profile.businesses } },
      );
      profilesFixed++;
    }
  }
  console.log(
    `  Profiles updated: ${profilesFixed}, fields decrypted: ${fieldsDecrypted}`,
  );

  // ─── 2. Re-encrypt fields that moved from randomized → deterministic ───
  for (const { collection, fields } of DETERMINISTIC_MIGRATIONS) {
    console.log(
      `\n=== Re-encrypting ${fields.join(", ")} in ${collection} (randomized → deterministic) ===`,
    );
    const coll = db.collection(collection);
    const docs = await coll.find({}).toArray();
    let docsFixed = 0;

    for (const doc of docs) {
      const updates = {};
      for (const field of fields) {
        const val = doc[field];
        if (typeof val !== "string" || val === "") continue;

        if (isEncrypted(val)) {
          // Decrypt first, then re-encrypt deterministically
          try {
            const plaintext = decrypt(val);
            if (val.startsWith("det:v2:")) continue; // Already deterministic
            updates[field] = encryptDeterministic(plaintext);
          } catch (err) {
            console.warn(
              `  Failed to re-encrypt ${field} in ${collection} doc ${doc._id}:`,
              err.message,
            );
          }
        } else {
          // Plaintext — encrypt deterministically
          updates[field] = encryptDeterministic(val);
        }
      }

      if (Object.keys(updates).length > 0) {
        await coll.updateOne({ _id: doc._id }, { $set: updates });
        docsFixed++;
      }
    }
    console.log(`  Documents updated: ${docsFixed} / ${docs.length}`);
  }

  console.log("\n✅ Migration complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
