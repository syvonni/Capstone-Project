/**
 * Migration script to set emailSendStatus for existing users
 * - Sets all email types to "sent" for existing users (assume success)
 * - Run with: node scripts/migrate-email-send-status.js
 */

const mongoose = require("mongoose");
const User = require("../src/models/User");

async function migrateEmailSendStatus() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://mongodb:27017/bizclear";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Set emailSendStatus to "sent" for all users who don't have it set
    const result = await User.updateMany(
      { emailSendStatus: { $exists: false } },
      {
        $set: {
          "emailSendStatus.credentials.status": "sent",
          "emailSendStatus.credentials.retryCount": 0,
          "emailSendStatus.editInfo.status": "sent",
          "emailSendStatus.editInfo.retryCount": 0,
          "emailSendStatus.emailChange.status": "sent",
          "emailSendStatus.emailChange.retryCount": 0,
        },
      },
    );
    console.log(
      `Set emailSendStatus for ${result.modifiedCount} users to "sent"`,
    );

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log(`Total users: ${totalUsers}`);

    // Show breakdown by emailSendStatus
    const statusBreakdown = await User.aggregate([
      {
        $group: {
          _id: "$emailSendStatus.credentials.status",
          count: { $sum: 1 },
        },
      },
    ]);
    console.log("Email send status breakdown (credentials):");
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

migrateEmailSendStatus();
