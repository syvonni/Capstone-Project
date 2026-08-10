#!/usr/bin/env node

/**
 * Check for regular users in database
 */

const mongoose = require("mongoose");

// Load models
const User = require("../services/auth-service/src/models/User");

async function checkRegularUsers() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
  if (!mongoUri) {
    console.error("❌ MONGO_URI environment variable is required");
    process.exit(1);
  }

  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database:", mongoose.connection.name);

    console.log("\n=== CHECKING FOR REGULAR USERS ===");

    // Check for users with 'user' role
    const regularUsers = await User.find({ "role.slug": "user" })
      .select("firstName lastName email role createdAt")
      .lean();

    console.log(`📊 Regular users found: ${regularUsers.length}`);

    if (regularUsers.length > 0) {
      console.log("\n👥 Regular users:");
      regularUsers.forEach((user, i) => {
        console.log(`  ${i + 1}. ${user.firstName} ${user.lastName} - ${user.email} - Created: ${user.createdAt?.toISOString()}`);
      });
    } else {
      console.log("✅ No regular users found in database");
    }

    console.log("\n=== CHECK COMPLETE ===");
  } catch (error) {
    console.error("❌ Error checking database:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
}

if (require.main === module) {
  checkRegularUsers();
}

module.exports = { checkRegularUsers };
