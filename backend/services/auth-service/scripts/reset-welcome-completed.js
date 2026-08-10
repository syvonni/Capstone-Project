/**
 * Script to reset welcomeCompleted flag for all business owner accounts
 * Sets welcomeCompleted to false for all business_owner role users
 * Run with: node scripts/reset-welcome-completed.js
 */

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Role = require("../src/models/Role");

async function resetWelcomeCompleted() {
  try {
    // Connect to MongoDB - use MONGO_URI from env, fallback to localhost
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/capstone_project";
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Check if database has any data
    const totalUsers = await User.countDocuments({});
    console.log(`Total users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log("Database is empty. No users to reset.");
      console.log(
        "If you just ran ./stop.sh, you need to seed the database first with ./start.sh",
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    // Find business_owner role
    const businessOwnerRole = await Role.findOne({ slug: "business_owner" });
    if (!businessOwnerRole) {
      console.error("Business owner role not found. Listing all roles:");
      const allRoles = await Role.find({});
      console.log(
        "Available roles:",
        allRoles.map((r) => ({ _id: r._id, slug: r.slug, name: r.name })),
      );
      console.log(
        "\nDatabase may not be seeded. Run ./start.sh to seed the database.",
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log("Found business owner role:", businessOwnerRole._id);

    // Count business owners before reset
    const totalBusinessOwners = await User.countDocuments({
      role: businessOwnerRole._id,
    });
    console.log(`Total business owner accounts: ${totalBusinessOwners}`);

    if (totalBusinessOwners === 0) {
      console.log("No business owner accounts found to reset.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Count how many currently have welcomeCompleted = true
    const welcomeCompletedTrue = await User.countDocuments({
      role: businessOwnerRole._id,
      welcomeCompleted: true,
    });
    console.log(
      `Business owners with welcomeCompleted=true: ${welcomeCompletedTrue}`,
    );

    // Reset welcomeCompleted to false for all business owners
    const result = await User.updateMany(
      { role: businessOwnerRole._id },
      { welcomeCompleted: false },
    );
    console.log(
      `Reset welcomeCompleted to false for ${result.modifiedCount} business owner accounts`,
    );

    // Verify the reset
    const welcomeCompletedFalse = await User.countDocuments({
      role: businessOwnerRole._id,
      welcomeCompleted: false,
    });
    console.log(
      `Business owners with welcomeCompleted=false after reset: ${welcomeCompletedFalse}`,
    );

    await mongoose.disconnect();
    console.log("Reset completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetWelcomeCompleted();
