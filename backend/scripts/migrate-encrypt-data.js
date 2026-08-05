#!/usr/bin/env node
/**
 * Migration Script: Encrypt existing plaintext data in MongoDB
 *
 * Usage:
 *   MONGO_URI=mongodb://... FIELD_ENCRYPTION_KEY=... node backend/scripts/migrate-encrypt-data.js
 *
 * What it does:
 *   1. Connects to MongoDB
 *   2. Reads every document in every collection
 *   3. Encrypts all string fields that are NOT already encrypted
 *   4. Saves the encrypted documents back
 *
 * Safe to run multiple times — already-encrypted fields are skipped.
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const mongoose = require("mongoose");
const {
  encrypt,
  encryptDeterministic,
  isEncrypted,
} = require("../shared/lib/fieldCipher");

// ── Configuration: which fields to encrypt per collection ──
// Format: { collectionName: { fields: [], deterministicFields: [], nestedPaths: [], arrayPaths: [], mixedPaths: [] } }
const ENCRYPTION_MAP = {
  users: {
    fields: [
      "firstName",
      "lastName",
      "middleName",
      "suffix",
      "phoneNumber",
      "office",
      "passwordHash",
      "mfaSecret",
      "authProvider",
      "providerId",
      "tokenFprint",
      "placeOfBirth",
      "nationality",
      "fatherName",
      "motherName",
      "distinctiveMark",
      "profileHash",
      "profileIpfsCid",
      "userEthereumAddress",
      "avatarUrl",
      "avatarIpfsCid",
      "deletionUndoToken",
    ],
    deterministicFields: ["email", "username"],
    nestedPaths: ["address"],
    arrayPaths: ["passwordHistory", "recentLoginIPs", "webauthnCredentials"],
    mixedPaths: [],
  },
  auditlogs: {
    fields: ["oldValue", "newValue", "role", "blockchainError"],
    deterministicFields: ["hash"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["metadata"],
  },
  sessions: {
    fields: ["ipAddress", "userAgent", "deviceInfo", "invalidationReason"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  notifications: {
    fields: ["title", "message", "relatedEntityId"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["metadata"],
  },
  recoveryrequests: {
    fields: ["office", "role", "reviewNotes", "denialReason"],
    deterministicFields: [],
    nestedPaths: ["metadata"],
    arrayPaths: [],
    mixedPaths: [],
  },
  emailchangerequests: {
    fields: [],
    deterministicFields: ["oldEmail", "newEmail"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["metadata"],
  },
  adminapprovals: {
    fields: ["txHash"],
    deterministicFields: ["approvalId"],
    nestedPaths: [],
    arrayPaths: ["approvals"],
    mixedPaths: ["requestDetails", "metadata"],
  },
  admindeletionrequests: {
    fields: ["highPrivilegeTasksDetails", "denialReason"],
    deterministicFields: [],
    nestedPaths: ["metadata"],
    arrayPaths: [],
    mixedPaths: [],
  },
  auditviewlogs: {
    fields: ["ip", "userAgent"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["metadata"],
  },
  changeemailotprequests: {
    fields: ["code"],
    deterministicFields: ["currentEmail", "newEmail"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  deleterequests: {
    fields: ["code", "deleteToken"],
    deterministicFields: ["email"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  loginrequests: {
    fields: ["code", "loginToken", "userId"],
    deterministicFields: ["email"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  maintenancewindows: {
    fields: ["message"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["metadata"],
  },
  mfabootstraptokens: {
    fields: ["secretHash", "reason"],
    deterministicFields: [],
    nestedPaths: ["metadata"],
    arrayPaths: [],
    mixedPaths: [],
  },
  offices: {
    fields: ["name", "group"],
    deterministicFields: ["code"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  officehours: {
    fields: ["timezone"],
    deterministicFields: ["office"],
    nestedPaths: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    arrayPaths: ["exceptions"],
    mixedPaths: [],
  },
  resetrequests: {
    fields: ["code", "resetToken"],
    deterministicFields: ["email"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  roles: {
    fields: ["name", "description", "displayName"],
    deterministicFields: ["slug"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  signuprequests: {
    fields: ["code"],
    deterministicFields: ["email"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["payload"],
  },
  temporarycredentials: {
    fields: ["username", "tempPasswordHash"],
    deterministicFields: [],
    nestedPaths: ["metadata"],
    arrayPaths: [],
    mixedPaths: [],
  },
  businessprofiles: {
    fields: [],
    deterministicFields: [],
    nestedPaths: ["ownerIdentity", "consent"],
    arrayPaths: ["businesses"],
    mixedPaths: [
      "businessRegistration",
      "location",
      "compliance",
      "profileDetails",
      "notifications",
    ],
  },
  appeals: {
    fields: [
      "businessId",
      "applicationId",
      "description",
      "resolution",
      "violationId",
      "inspectionId",
    ],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  clearances: {
    fields: ["referenceNumber"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: ["clearances", "stageHistory", "notificationsSent"],
    mixedPaths: [],
  },
  editrequests: {
    fields: ["businessId", "fieldName", "reason", "reviewNotes", "comment"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: ["fieldsToChange", "supportingDocuments"],
    mixedPaths: ["currentValue", "requestedValue"],
  },
  // feeconfigurations removed - old FeeConfiguration model deleted
  generalpermits: {
    fields: ["businessPlateNo"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: ["requirements"],
    mixedPaths: [],
  },
  inspectionslots: {
    fields: ["startTime", "endTime"],
    deterministicFields: [],
    nestedPaths: ["booking", "location", "completion", "cancellation"],
    arrayPaths: ["remindersSent"],
    mixedPaths: [],
  },
  payments: {
    fields: [
      "description",
      "currency",
      "transactionId",
      "referenceNumber",
      "receiptNumber",
      "relatedEntityId",
      "notes",
      "failureReason",
      "verificationNotes",
      "officialReceiptNumber",
      "rejectionReason",
      "proofOfPayment",
    ],
    deterministicFields: ["paymentId", "businessId"],
    nestedPaths: ["breakdown"],
    arrayPaths: [],
    mixedPaths: ["metadata", "webhookData"],
  },
  permits: {
    fields: [
      "businessName",
      "ownerName",
      "address",
      "lineOfBusiness",
      "qrCode",
      "suspensionReason",
      "revocationReason",
    ],
    deterministicFields: ["permitNumber", "businessId"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: ["metadata"],
  },
  postrequirements: {
    fields: [
      "businessId",
      "permitId",
      "description",
      "documentUrl",
      "verificationNotes",
    ],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: ["submittedDocuments", "extensionHistory"],
    mixedPaths: [],
  },
  violations: {
    fields: ["violationType", "description", "legalBasis", "blockchainHash"],
    deterministicFields: ["violationId"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
  occupationalpermits: {
    fields: [
      "firstName",
      "lastName",
      "education",
      "businessPlateNo",
      "employer",
      "company",
      "position",
      "rejectionReason",
    ],
    deterministicFields: [],
    nestedPaths: ["address", "preRequirements"],
    arrayPaths: [],
    mixedPaths: [],
  },
  lobrecommendationfeedbacks: {
    fields: ["businessDescription"],
    deterministicFields: [],
    nestedPaths: [],
    arrayPaths: ["recommendations"],
    mixedPaths: [],
  },
  lobtrainingexamples: {
    fields: [
      "businessDescription",
      "lineOfBusiness",
      "detailedLine",
      "psicCode",
    ],
    deterministicFields: ["taxCode"],
    nestedPaths: [],
    arrayPaths: [],
    mixedPaths: [],
  },
};

// ── Encryption helpers ──
function encryptField(doc, field, deterministic) {
  const val = doc[field];
  if (val == null || val === "" || typeof val !== "string") return false;
  if (isEncrypted(val)) return false;
  doc[field] = deterministic ? encryptDeterministic(val) : encrypt(val);
  return true;
}

function encryptNested(doc, path) {
  const obj = doc[path];
  if (!obj || typeof obj !== "object") return false;
  let changed = false;
  for (const key of Object.keys(obj)) {
    if (
      typeof obj[key] === "string" &&
      obj[key] !== "" &&
      !isEncrypted(obj[key])
    ) {
      obj[key] = encrypt(obj[key]);
      changed = true;
    } else if (
      obj[key] &&
      typeof obj[key] === "object" &&
      !Array.isArray(obj[key])
    ) {
      for (const sub of Object.keys(obj[key])) {
        if (
          typeof obj[key][sub] === "string" &&
          obj[key][sub] !== "" &&
          !isEncrypted(obj[key][sub])
        ) {
          obj[key][sub] = encrypt(obj[key][sub]);
          changed = true;
        }
      }
    }
  }
  return changed;
}

function encryptArraySubdocs(doc, path) {
  const arr = doc[path];
  if (!Array.isArray(arr)) return false;
  let changed = false;
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    for (const key of Object.keys(item)) {
      const val = item[key];
      if (typeof val === "string" && val !== "" && !isEncrypted(val)) {
        item[key] = encrypt(val);
        changed = true;
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        for (const sub of Object.keys(val)) {
          if (
            typeof val[sub] === "string" &&
            val[sub] !== "" &&
            !isEncrypted(val[sub])
          ) {
            val[sub] = encrypt(val[sub]);
            changed = true;
          }
        }
      }
    }
  }
  return changed;
}

function encryptObjectDeep(obj) {
  if (!obj || typeof obj !== "object") return false;
  let changed = false;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === "string" && obj[i] !== "" && !isEncrypted(obj[i])) {
        obj[i] = encrypt(obj[i]);
        changed = true;
      } else if (typeof obj[i] === "object") {
        if (encryptObjectDeep(obj[i])) changed = true;
      }
    }
    return changed;
  }
  for (const key of Object.keys(obj)) {
    if (
      typeof obj[key] === "string" &&
      obj[key] !== "" &&
      !isEncrypted(obj[key])
    ) {
      obj[key] = encrypt(obj[key]);
      changed = true;
    } else if (typeof obj[key] === "object") {
      if (encryptObjectDeep(obj[key])) changed = true;
    }
  }
  return changed;
}

function encryptMixed(doc, path) {
  const val = doc[path];
  if (val == null) return false;
  if (typeof val === "string" && val !== "" && !isEncrypted(val)) {
    doc[path] = encrypt(val);
    return true;
  }
  if (typeof val === "object") return encryptObjectDeep(val);
  return false;
}

async function migrateCollection(db, collectionName, config) {
  const coll = db.collection(collectionName);
  const count = await coll.countDocuments();
  if (count === 0) {
    console.log(`  ⏭  ${collectionName}: 0 documents, skipping`);
    return 0;
  }

  console.log(`  🔄 ${collectionName}: processing ${count} documents...`);
  let updated = 0;
  const cursor = coll.find({});

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    let changed = false;

    for (const f of config.fields || []) {
      if (encryptField(doc, f, false)) changed = true;
    }
    for (const f of config.deterministicFields || []) {
      if (encryptField(doc, f, true)) changed = true;
    }
    for (const p of config.nestedPaths || []) {
      if (encryptNested(doc, p)) changed = true;
    }
    for (const p of config.arrayPaths || []) {
      if (encryptArraySubdocs(doc, p)) changed = true;
    }
    for (const p of config.mixedPaths || []) {
      if (encryptMixed(doc, p)) changed = true;
    }

    if (changed) {
      await coll.replaceOne({ _id: doc._id }, doc);
      updated++;
    }
  }

  console.log(
    `  ✅ ${collectionName}: encrypted ${updated}/${count} documents`,
  );
  return updated;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI environment variable is not set");
    process.exit(1);
  }
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    console.error("❌ FIELD_ENCRYPTION_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("🔐 MongoDB Field Encryption Migration");
  console.log("======================================");
  console.log(`Connecting to: ${uri.replace(/\/\/[^@]+@/, "//***:***@")}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  let totalUpdated = 0;
  const collections = await db.listCollections().toArray();
  const collNames = collections.map((c) => c.name);

  for (const [name, config] of Object.entries(ENCRYPTION_MAP)) {
    if (collNames.includes(name)) {
      totalUpdated += await migrateCollection(db, name, config);
    } else {
      console.log(`  ⏭  ${name}: collection not found, skipping`);
    }
  }

  console.log("======================================");
  console.log(
    `✅ Migration complete. Total documents encrypted: ${totalUpdated}`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
