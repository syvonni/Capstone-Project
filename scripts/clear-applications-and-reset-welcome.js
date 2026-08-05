#!/usr/bin/env node

/**
 * Script to clear all business applications AND reset welcomeCompleted flag for all business owners
 * This is useful for testing the welcome modal flow from scratch
 * Usage: node scripts/clear-applications-and-reset-welcome.js
 */

const path = require('path');
const fs = require('fs');

// Load .env manually since dotenv might not be available
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#].+?)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      process.env[key] = value.trim();
    }
  });
}

const mongoose = require('mongoose');

// Import models
const BusinessProfile = require('../backend/services/business-service/src/models/BusinessProfile');
const Application = require('../backend/services/business-service/src/models/Application');
const User = require('../backend/services/auth-service/src/models/User');
const Role = require('../backend/services/auth-service/src/models/Role');

async function clearApplicationsAndResetWelcome() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/capstone_project';
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear BusinessProfile businesses array
    const businessProfileCount = await BusinessProfile.countDocuments();
    console.log(`📊 Found ${businessProfileCount} business profiles`);
    
    if (businessProfileCount > 0) {
      // Clear the businesses array from all profiles
      const bpResult = await BusinessProfile.updateMany({}, { $set: { businesses: [] } });
      console.log(`🗑️  Cleared businesses array from ${bpResult.modifiedCount} business profiles`);
    }

    // Clear Application collection
    const applicationCount = await Application.countDocuments();
    console.log(`📊 Found ${applicationCount} applications`);
    
    if (applicationCount > 0) {
      const appResult = await Application.deleteMany({});
      console.log(`🗑️  Deleted ${appResult.deletedCount} applications`);
    }

    // Reset welcomeCompleted for all business owners
    const businessOwnerRole = await Role.findOne({ slug: 'business_owner' });
    if (businessOwnerRole) {
      const welcomeCompletedTrue = await User.countDocuments({
        role: businessOwnerRole._id,
        welcomeCompleted: true,
      });
      console.log(`📊 Business owners with welcomeCompleted=true: ${welcomeCompletedTrue}`);

      const userResult = await User.updateMany(
        { role: businessOwnerRole._id },
        { welcomeCompleted: false }
      );
      console.log(`🔄 Reset welcomeCompleted to false for ${userResult.modifiedCount} business owners`);
    } else {
      console.log('⚠️  Business owner role not found - skipping welcome reset');
    }

    console.log('✨ All applications cleared and welcome reset completed!');
    console.log('🔄 Refresh the app to see the welcome modal for business owners');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Ask for confirmation
console.log('⚠️  This will:');
console.log('   1. Delete ALL applications from the Application collection');
console.log('   2. Clear the businesses array from ALL BusinessProfile records');
console.log('   3. Reset welcomeCompleted to false for ALL business owners');
console.log('📝 Are you sure you want to continue? (y/N)');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', async (key) => {
  if (key === 'y' || key === 'Y') {
    console.log('\n🚀 Clearing applications and resetting welcome...');
    await clearApplicationsAndResetWelcome();
  } else if (key === '\u0003' || key === 'n' || key === 'N') {
    console.log('\n❌ Operation cancelled');
    process.exit(0);
  } else {
    console.log('\n❌ Please press "y" to confirm or "n" to cancel');
  }
});
