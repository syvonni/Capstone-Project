const mongoose = require('mongoose');
const mongoUri = 'mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin';

mongoose.connect(mongoUri).then(async () => {
  const ClaimableDocument = mongoose.model('ClaimableDocument', new mongoose.Schema({}, { strict: false }), 'claimabledocuments');
  const Checklist = mongoose.model('Checklist', new mongoose.Schema({}, { strict: false }), 'checklists');
  const Violation = mongoose.model('Violation', new mongoose.Schema({}, { strict: false }), 'violations');
  const InspectionItem = mongoose.model('InspectionItem', new mongoose.Schema({}, { strict: false }), 'inspectionitems');

  console.log('=== Claimable Documents with checklistId ===');
  const docs = await ClaimableDocument.find({ checklistId: { $exists: true } }).select('name customId checklistId').limit(10);
  console.log(JSON.stringify(docs, null, 2));

  console.log('\n=== Checklists with documentId ===');
  const checklists = await Checklist.find({ documentId: { $exists: true } }).select('name documentId').limit(10);
  console.log(JSON.stringify(checklists, null, 2));

  console.log('\n=== Document Violations (code prefix: doc-) ===');
  const violations = await Violation.find({ code: /^doc-/ }).select('code name').limit(10);
  console.log(JSON.stringify(violations, null, 2));

  console.log('\n=== Document Inspection Items (customId prefix: doc-inspection-) ===');
  const items = await InspectionItem.find({ customId: /^doc-inspection-/ }).select('customId name').limit(10);
  console.log(JSON.stringify(items, null, 2));

  console.log('\n=== Total Counts ===');
  const docCount = await ClaimableDocument.countDocuments({ checklistId: { $exists: true } });
  const checklistCount = await Checklist.countDocuments({ documentId: { $exists: true } });
  const violationCount = await Violation.countDocuments({ code: /^doc-/ });
  const itemCount = await InspectionItem.countDocuments({ customId: /^doc-inspection-/ });
  console.log(`Documents with checklistId: ${docCount}`);
  console.log(`Checklists with documentId: ${checklistCount}`);
  console.log(`Document violations: ${violationCount}`);
  console.log(`Document inspection items: ${itemCount}`);

  await mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
