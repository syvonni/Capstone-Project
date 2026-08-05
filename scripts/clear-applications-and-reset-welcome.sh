#!/bin/bash

# Script to clear all business applications AND reset welcomeCompleted flag for all business owners
# This uses mongosh in the MongoDB container

echo "🔌 Connecting to MongoDB to clear applications and reset welcome..."

docker exec capstone-mongodb mongosh -u capstone_app -p g95fxnwa1wPDdyfA --authenticationDatabase admin --eval "
try {
  // Clear businesses array from all BusinessProfile documents
  const bpResult = db.businessprofiles.updateMany({}, { \$set: { businesses: [] } });
  console.log('🗑️  Cleared businesses array from ' + bpResult.modifiedCount + ' business profiles');
  
  // Delete all Application documents
  const appCount = db.applications.countDocuments();
  if (appCount > 0) {
    const appResult = db.applications.deleteMany({});
    console.log('🗑️  Deleted ' + appResult.deletedCount + ' applications');
  } else {
    console.log('📊 No applications found');
  }
  
  // Reset welcomeCompleted for all users (roles are encrypted, so we can't filter by role)
  const welcomeTrue = db.users.countDocuments({ welcomeCompleted: true });
  console.log('📊 Users with welcomeCompleted=true: ' + welcomeTrue);
  
  const userResult = db.users.updateMany(
    {},
    { \$set: { welcomeCompleted: false } }
  );
  console.log('🔄 Reset welcomeCompleted to false for ' + userResult.modifiedCount + ' users');
  
  console.log('✨ All applications cleared and welcome reset completed!');
  console.log('🔄 Refresh the app to see the welcome modal for business owners');
} catch (error) {
  console.error('❌ Error:', error.message);
}
" capstone_project

echo "🎉 Done! Refresh your app to test the welcome modal."
