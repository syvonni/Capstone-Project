#!/usr/bin/env node

/**
 * Delete regular users from database
 */

const mongoose = require("mongoose");

async function deleteRegularUsers() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";
  
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
    const regularUsers = await mongoose.connection.db.collection('users').aggregate([
      { $lookup: { from: 'roles', localField: 'role', foreignField: '_id', as: 'roleData' } },
      { $match: { 'roleData.slug': 'user' } },
      { $project: { firstName: 1, lastName: 1, email: 1, createdAt: 1 } }
    ]).toArray();

    console.log(`📊 Regular users found: ${regularUsers.length}`);

    if (regularUsers.length > 0) {
      console.log("\n👥 Regular users to be deleted:");
      regularUsers.forEach((user, i) => {
        console.log(`  ${i + 1}. ${user.firstName} ${user.lastName} - ${user.email} - Created: ${user.createdAt?.toISOString()}`);
      });

      console.log("\n⚠️  DELETING REGULAR USERS...");
      const result = await mongoose.connection.db.collection('users').deleteMany({ 'roleData.slug': 'user' });
      console.log(`✅ Deleted ${result.deletedCount} regular users`);
    } else {
      console.log("✅ No regular users found in database - nothing to delete");
    }

    console.log("\n=== DELETION COMPLETE ===");
  } catch (error) {
    console.error("❌ Error deleting regular users:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
}

if (require.main === module) {
  deleteRegularUsers();
}

module.exports = { deleteRegularUsers };
