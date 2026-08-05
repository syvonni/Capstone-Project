/**
 * Backfill script for PermitForm item keys
 * 
 * This script adds stable keys to PermitForm items that don't have them.
 * Keys are generated from labels using slugification, with collision detection.
 * 
 * Usage:
 *   node scripts/backfillPermitFormKeys.js --dry-run  # Preview changes
 *   node scripts/backfillPermitFormKeys.js --apply    # Apply changes
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the slugify function from the web utils (adapted for Node.js)
function slugifyLabelToKey(label) {
  if (!label || typeof label !== 'string') return '';
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('') || '';
}

// Reserved words that should not be used as keys
const RESERVED_WORDS = new Set([
  'id', '_id', 'name', 'type', 'key', 'label', 'required', 'helpText',
  'placeholder', 'validation', 'dropdownSource', 'dropdownOptions', 'span',
  'metadataFields', 'downloadFileName', 'downloadFileSize', 'downloadFileType',
  'downloadFileUrl', 'groupFields', 'minRows', 'maxRows', 'sectionName',
  'sectionIndex', 'sectionId', 'formId', 'formType', 'formVersion', 'status',
  'isActive', 'isPublished', 'publishedAt', 'publishedBy', 'createdAt', 'updatedAt',
  'createdBy', 'updatedBy', 'version', 'effectiveDate', 'notes', 'description',
  'source', 'showWhen', 'formData', 'applicationId', 'businessId', 'userId',
  'applicationReferenceNumber', 'applicationStatus', 'submittedAt', 'reviewedBy',
  'reviewedAt', 'reviewComments', 'rejectionReason', 'fieldReviewDecisions',
  'pendingAction', 'createdByOfficer', 'isSubmitted', 'submittedToLguOfficer',
  'category', 'industryScope', 'lineOfBusiness', 'permitType', 'businessType',
  'businessClassification', 'primaryLineOfBusiness', 'declaredCapitalInvestment',
  'totalEmployees', 'employeesResidingInLgu', 'businessAreaSqm', 'houseBldgNo',
  'buildingName', 'subdivision', 'blockCode', 'pin', 'buildingRegistryNo',
  'businessPlateNo', 'yearEstablished', 'organizationType', 'ownerAddress',
  'lessorInfo', 'emergencyContact', 'presidentName', 'treasurerName',
  'registeredBusinessName', 'businessTradeName', 'businessRegistrationType',
  'businessRegistrationNumber', 'businessRegistrationDate', 'registrationAgency',
  'businessAddress', 'unitBuildingName', 'street', 'barangay', 'cityMunicipality',
  'province', 'zipCode', 'birRegistrationNumber', 'birRegistrationDate',
  'pagibigNumber', 'pagibigRegistered', 'philhealthNumber', 'philhealthRegistered',
  'sssNumber', 'sssRegistered', 'ownerFirstName', 'ownerMiddleName', 'ownerLastName',
  'ownerSuffix', 'ownerBirthDate', 'ownerGender', 'ownerCivilStatus',
  'ownerCitizenship', 'ownerContactNumber', 'ownerEmailAddress', 'ownerTin',
  'lguDocuments', 'requirementsChecklist', 'aiValidation', 'hasActiveAppeal',
  'appealId', 'appealExhausted', 'customId', 'feeId', 'checklistId', 'formIds',
  'templateHtml', 'templateImages', 'templateTexts', 'draftOf', 'isDraft',
]);

function isReservedKey(key) {
  return RESERVED_WORDS.has(key);
}

function generateUniqueKey(label, existingKeys = []) {
  let baseKey = slugifyLabelToKey(label);
  if (!baseKey) return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Avoid reserved words
  if (isReservedKey(baseKey)) {
    baseKey = `field_${baseKey}`;
  }
  
  // Avoid collisions
  let uniqueKey = baseKey;
  let counter = 1;
  while (existingKeys.includes(uniqueKey)) {
    uniqueKey = `${baseKey}${counter}`;
    counter++;
  }
  
  return uniqueKey;
}

async function backfillPermitFormKeys(dryRun = true) {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/capstone_project",
    );
    console.log("Connected to MongoDB");

    // Get PermitForm model
    const PermitForm = require('../src/models/PermitForm');
    
    // Find all permit forms
    const permitForms = await PermitForm.find({});
    console.log(`Found ${permitForms.length} permit forms`);

    let totalFormsUpdated = 0;
    let totalItemsBackfilled = 0;

    for (const form of permitForms) {
      let formUpdated = false;
      let itemsBackfilled = 0;
      const existingKeys = [];

      // First pass: collect existing keys
      for (const section of form.sections || []) {
        for (const item of section.items || []) {
          if (item.key) {
            existingKeys.push(item.key);
          }
        }
      }

      // Second pass: backfill missing keys
      for (const section of form.sections || []) {
        for (const item of section.items || []) {
          if (!item.key && item.label) {
            const newKey = generateUniqueKey(item.label, existingKeys);
            item.key = newKey;
            existingKeys.push(newKey);
            itemsBackfilled++;
            formUpdated = true;
          }
        }

        // Also backfill groupFields in repeatable_group items
        for (const item of section.items || []) {
          if (item.type === 'repeatable_group' && item.groupFields) {
            for (const groupField of item.groupFields) {
              if (!groupField.key && groupField.label) {
                const newKey = generateUniqueKey(groupField.label, existingKeys);
                groupField.key = newKey;
                existingKeys.push(newKey);
                itemsBackfilled++;
                formUpdated = true;
              }
            }
          }
        }

        // Also backfill metadataFields in category_upload items
        for (const item of section.items || []) {
          if (item.type === 'category_upload' && item.metadataFields) {
            for (const metaField of item.metadataFields) {
              if (!metaField.key) {
                const labelToUse = metaField.label || `${item.label} Metadata`;
                const newKey = generateUniqueKey(labelToUse, existingKeys);
                metaField.key = newKey;
                existingKeys.push(newKey);
                itemsBackfilled++;
                formUpdated = true;
              }
            }
          }
        }
      }

      if (formUpdated) {
        totalFormsUpdated++;
        totalItemsBackfilled += itemsBackfilled;
        
        if (dryRun) {
          console.log(`[DRY-RUN] Would update form "${form.name}" (${form._id}): ${itemsBackfilled} items backfilled`);
        } else {
          await form.save({ validateBeforeSave: false });
          console.log(`Updated form "${form.name}" (${form._id}): ${itemsBackfilled} items backfilled`);
        }
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Total forms to update: ${totalFormsUpdated}`);
    console.log(`Total items to backfill: ${totalItemsBackfilled}`);
    
    if (dryRun) {
      console.log("\nThis was a DRY RUN. No changes were applied.");
      console.log("Run with --apply to apply the changes.");
    } else {
      console.log("\nChanges applied successfully.");
    }

  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

if (args.includes('--help') || args.includes('-h')) {
  console.log("Usage:");
  console.log("  node scripts/backfillPermitFormKeys.js --dry-run  # Preview changes (default)");
  console.log("  node scripts/backfillPermitFormKeys.js --apply    # Apply changes");
  console.log("  node scripts/backfillPermitFormKeys.js --help     # Show this help");
  process.exit(0);
}

backfillPermitFormKeys(dryRun);
