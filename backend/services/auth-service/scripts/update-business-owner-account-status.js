/**
 * Migration script to set accountStatus for existing business owner accounts
 * - Sets "active" for accounts that have logged in (have lastLoginAt)
 * - Sets "pending_setup" for accounts that haven't logged in yet
 * Run with: node scripts/update-business-owner-account-status.js
 */

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Role = require("../src/models/Role");

async function updateBusinessOwnerAccountStatus() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://mongodb:27017/bizclear";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find business_owner role
    const businessOwnerRole = await Role.findOne({ slug: "business_owner" });
    if (!businessOwnerRole) {
      console.error("Business owner role not found");
      process.exit(1);
    }
    console.log("Found business owner role:", businessOwnerRole._id);

    // Set "active" for business owners who have logged in
    const activeResult = await User.updateMany(
      {
        role: businessOwnerRole._id,
        lastLoginAt: { $exists: true, $ne: null },
      },
      { accountStatus: "active" },
    );
    console.log(
      `Set ${activeResult.modifiedCount} business owner accounts to "active" (have logged in)`,
    );

    // Set "pending_setup" for business owners who haven't logged in
    const pendingResult = await User.updateMany(
      {
        role: businessOwnerRole._id,
        $or: [{ lastLoginAt: { $exists: false } }, { lastLoginAt: null }],
      },
      { accountStatus: "pending_setup" },
    );
    console.log(
      `Set ${pendingResult.modifiedCount} business owner accounts to "pending_setup" (haven't logged in)`,
    );

    // Count total business owners
    const totalBusinessOwners = await User.countDocuments({
      role: businessOwnerRole._id,
    });
    console.log(`Total business owner accounts: ${totalBusinessOwners}`);

    // Show breakdown by account status
    const statusBreakdown = await User.aggregate([
      { $match: { role: businessOwnerRole._id } },
      { $group: { _id: "$accountStatus", count: { $sum: 1 } } },
    ]);
    console.log("Account status breakdown:");
    statusBreakdown.forEach((item) => {
      console.log(`  ${item._id || "undefined"}: ${item.count}`);
    });

    await mongoose.disconnect();
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateBusinessOwnerAccountStatus();
