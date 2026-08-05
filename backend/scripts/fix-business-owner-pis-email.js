/**
 * Fix script to update isEmailVerified and pisCompleted for a specific business owner
 * Run with: node backend/scripts/fix-business-owner-pis-email.js <email>
 */

const mongoose = require("mongoose");
const User = require("../services/auth-service/src/models/User");

async function fixBusinessOwner(email) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/bplo";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase() }).populate(
      "role",
    );
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log("Current state:");
    console.log(`  isEmailVerified: ${user.isEmailVerified}`);
    console.log(`  pisCompleted: ${user.pisCompleted}`);
    console.log(`  PIS fields present:`);
    console.log(`    address.street: ${user.address?.street || "MISSING"}`);
    console.log(`    address.barangay: ${user.address?.barangay || "MISSING"}`);
    console.log(`    address.city: ${user.address?.city || "MISSING"}`);
    console.log(`    address.province: ${user.address?.province || "MISSING"}`);
    console.log(`    address.zipCode: ${user.address?.zipCode || "MISSING"}`);
    console.log(`    maritalStatus: ${user.maritalStatus || "MISSING"}`);
    console.log(`    dateOfBirth: ${user.dateOfBirth || "MISSING"}`);
    console.log(`    placeOfBirth: ${user.placeOfBirth || "MISSING"}`);
    console.log(`    nationality: ${user.nationality || "MISSING"}`);
    console.log(`    fatherName: ${user.fatherName || "MISSING"}`);
    console.log(`    motherName: ${user.motherName || "MISSING"}`);
    console.log(
      `    highestEducationalAttainment: ${user.highestEducationalAttainment || "MISSING"}`,
    );

    // Check if PIS is complete
    const hasPis = !!(
      user.address?.street &&
      user.address?.barangay &&
      user.address?.city &&
      user.address?.province &&
      user.address?.zipCode &&
      user.maritalStatus &&
      user.dateOfBirth &&
      user.placeOfBirth &&
      user.nationality &&
      user.fatherName &&
      user.motherName &&
      user.highestEducationalAttainment
    );

    console.log("\nProposed changes:");
    console.log(
      `  isEmailVerified: false -> true (officer verified in person)`,
    );
    console.log(
      `  pisCompleted: ${user.pisCompleted} -> ${hasPis} (based on PIS fields)`,
    );

    // Apply changes
    user.isEmailVerified = true;
    user.pisCompleted = hasPis;
    await user.save();

    console.log("\n✓ Updated successfully");
    console.log("New state:");
    console.log(`  isEmailVerified: ${user.isEmailVerified}`);
    console.log(`  pisCompleted: ${user.pisCompleted}`);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error(
    "Usage: node backend/scripts/fix-business-owner-pis-email.js <email>",
  );
  process.exit(1);
}

fixBusinessOwner(email);
