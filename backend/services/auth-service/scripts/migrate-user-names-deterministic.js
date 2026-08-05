/**
 * Migration script to decrypt phoneNumber (remove encryption)
 * This enables duplicate checking on phone numbers
 *
 * Usage: node backend/scripts/migrate-user-names-deterministic.js
 */

const mongoose = require("mongoose");
const { decrypt, isEncrypted } = require("/backend/shared/lib/fieldCipher");
const User = require("./src/models/User");

async function migrate() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/capstone";
    await mongoose.connect(mongoUri);
    console.log("[MIGRATION] Connected to MongoDB");

    // Get all users
    const users = await User.find({}).lean();
    console.log(`[MIGRATION] Found ${users.length} users to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if phoneNumber is encrypted and needs migration
        const updateData = {};

        if (user.phoneNumber && isEncrypted(user.phoneNumber)) {
          const phoneNumber = decrypt(user.phoneNumber);
          updateData.phoneNumber = phoneNumber;
          console.log(
            `[MIGRATION] Decrypting phone for user ${user._id}: ${user.phoneNumber.substring(0, 30)}... -> ${phoneNumber}`,
          );
        }

        if (Object.keys(updateData).length > 0) {
          await User.findByIdAndUpdate(user._id, updateData);
          migrated++;
          console.log(`[MIGRATION] Migrated user ${user._id}`);
        } else {
          console.log(
            `[MIGRATION] User ${user._id} already plaintext, skipping`,
          );
          skipped++;
        }

        if (migrated % 10 === 0) {
          console.log(`[MIGRATION] Progress: ${migrated}/${users.length}`);
        }
      } catch (err) {
        console.error(
          `[MIGRATION] Failed to migrate user ${user._id}:`,
          err.message,
        );
        skipped++;
      }
    }

    console.log(
      `[MIGRATION] Complete. Migrated: ${migrated}, Skipped: ${skipped}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("[MIGRATION] Fatal error:", err);
    process.exit(1);
  }
}

migrate();
