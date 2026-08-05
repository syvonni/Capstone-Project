/**
 * Migration script to re-encrypt User name fields from randomized to deterministic encryption
 * This enables regex-based search queries on firstName, lastName, middleName, suffix
 *
 * Usage: node backend/scripts/migrate-user-names-deterministic.js
 */

const mongoose = require("mongoose");
const User = require("../services/auth-service/src/models/User");

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
        // Re-save each user to trigger re-encryption with new deterministic settings
        await User.findByIdAndUpdate(user._id, {
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          suffix: user.suffix,
        });
        migrated++;

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
