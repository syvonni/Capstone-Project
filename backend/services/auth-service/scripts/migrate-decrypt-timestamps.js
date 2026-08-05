const mongoose = require("mongoose");
const User = require("../src/models/User");

async function migrateTimestamps() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://mongodb:27017/bizclear";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find users with encrypted timestamp fields (strings starting with enc:v2:)
    const users = await User.find({
      $or: [{ lastLoginAt: /^enc:v2:/ }, { passwordChangedAt: /^enc:v2:/ }],
    });

    console.log(`Found ${users.length} users with encrypted timestamps`);

    let updatedCount = 0;
    for (const user of users) {
      let needsUpdate = false;

      if (
        user.lastLoginAt &&
        typeof user.lastLoginAt === "string" &&
        user.lastLoginAt.startsWith("enc:v2:")
      ) {
        user.lastLoginAt = user.createdAt || new Date();
        needsUpdate = true;
      }

      if (
        user.passwordChangedAt &&
        typeof user.passwordChangedAt === "string" &&
        user.passwordChangedAt.startsWith("enc:v2:")
      ) {
        user.passwordChangedAt = user.createdAt || new Date();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await user.save();
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} users with encrypted timestamps`);

    await mongoose.disconnect();
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateTimestamps();
