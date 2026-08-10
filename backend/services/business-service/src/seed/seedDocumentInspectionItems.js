const mongoose = require("mongoose");
const InspectionItem = require("../models/InspectionItem");
const Violation = require("../models/Violation");
const { DOCUMENT_VIOLATIONS } = require("./seedDocumentViolations");

/**
 * Document Inspection Items Seeder
 *
 * Seeds inspection items specific to document compliance verification.
 * These items are used to check if businesses have valid claimable documents.
 *
 * Structure:
 * - name: Display name of the inspection item
 * - question: Specific question to ask during inspection
 * - notes: Inspector guidance on what to check
 * - violationCode: Code of the violation if this check fails
 * - legalBasis: Array of legal references (url, title, description)
 */

const DOCUMENT_INSPECTION_ITEMS = [
  // Fire Safety Inspection Certificate
  {
    customId: "doc-inspection-fire-safety-presence",
    name: "Fire Safety Inspection Certificate Presence",
    question:
      "Does the establishment have a valid Fire Safety Inspection Certificate?",
    notes:
      "Check for BFP-issued fire safety inspection certificate. Verify it is on file and accessible.",
    violationCode: "doc-missing-fire-safety-certificate",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description:
          "Section 13: Fire safety inspection certificate requirement",
      },
    ],
  },
  {
    customId: "doc-inspection-fire-safety-validity",
    name: "Fire Safety Inspection Certificate Validity",
    question:
      "Is the Fire Safety Inspection Certificate valid and not expired?",
    notes: "Check the certificate validity period. Ensure it has not expired.",
    violationCode: "doc-expired-fire-safety-certificate",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description: "Section 13: Certificate validity requirements",
      },
    ],
  },
  {
    customId: "doc-inspection-fire-safety-authenticity",
    name: "Fire Safety Inspection Certificate Authenticity",
    question:
      "Is the Fire Safety Inspection Certificate authentic with proper BFP signature and seal?",
    notes:
      "Verify the certificate has proper BFP signature, official seal, and valid certificate number.",
    violationCode: "doc-invalid-fire-safety-certificate",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description: "Section 13: Valid certificate requirements",
      },
    ],
  },

  // Sanitary Permit
  {
    customId: "doc-inspection-sanitary-presence",
    name: "Sanitary Permit Presence",
    question: "Does the establishment have a valid Sanitary Permit?",
    notes:
      "Check for health department-issued sanitary permit. Verify it is on file and accessible.",
    violationCode: "doc-missing-sanitary-permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Sanitary permit requirement",
      },
    ],
  },
  {
    customId: "doc-inspection-sanitary-validity",
    name: "Sanitary Permit Validity",
    question: "Is the Sanitary Permit valid and not expired?",
    notes: "Check the permit validity period. Ensure it has not expired.",
    violationCode: "doc-expired-sanitary-permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Permit validity requirements",
      },
    ],
  },
  {
    customId: "doc-inspection-sanitary-authenticity",
    name: "Sanitary Permit Authenticity",
    question:
      "Is the Sanitary Permit authentic with proper health office signature and seal?",
    notes:
      "Verify the permit has proper health office signature, official seal, and valid permit number.",
    violationCode: "doc-invalid-sanitary-permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Valid permit requirements",
      },
    ],
  },

  // Zoning Clearance
  {
    customId: "doc-inspection-zoning-presence",
    name: "Zoning Clearance Presence",
    question: "Does the establishment have a valid Zoning Clearance?",
    notes:
      "Check for HLURB or local zoning office-issued zoning clearance. Verify it is on file and accessible.",
    violationCode: "doc-missing-zoning-clearance",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Zoning clearance requirement",
      },
    ],
  },
  {
    customId: "doc-inspection-zoning-validity",
    name: "Zoning Clearance Validity",
    question: "Is the Zoning Clearance valid and not expired?",
    notes: "Check the clearance validity period. Ensure it has not expired.",
    violationCode: "doc-expired-zoning-clearance",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Clearance validity requirements",
      },
    ],
  },
  {
    customId: "doc-inspection-zoning-authenticity",
    name: "Zoning Clearance Authenticity",
    question:
      "Is the Zoning Clearance authentic with proper zoning office signature and seal?",
    notes:
      "Verify the clearance has proper zoning office signature, official seal, and valid clearance number.",
    violationCode: "doc-invalid-zoning-clearance",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Valid clearance requirements",
      },
    ],
  },
];

async function seedDocumentInspectionItems() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";

  let didConnect = false;

  // Only connect if not already connected
  if (mongoose.connection.readyState === 0) {
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    didConnect = true;
  }

  let totalCreated = 0;
  let totalUpdated = 0;

  console.log("\nSeeding Document Inspection Items...");

  for (const itemData of DOCUMENT_INSPECTION_ITEMS) {
    const existing = await InspectionItem.findOne({
      customId: itemData.customId,
    });

    // Find violation by code
    const violation = await Violation.findOne({ code: itemData.violationCode });

    if (!violation) {
      console.warn(
        `  ! Warning: Violation not found: ${itemData.violationCode} - skipping inspection item: ${itemData.name}`,
      );
      continue;
    }

    if (!existing) {
      await InspectionItem.create({
        ...itemData,
        violationId: violation._id,
        isActive: true,
      });
      totalCreated++;
      console.log(
        `  + Created: ${itemData.name} (linked to violation: ${itemData.violationCode})`,
      );
    } else {
      await InspectionItem.updateOne(
        { customId: itemData.customId },
        {
          ...itemData,
          violationId: violation._id,
        },
      );
      totalUpdated++;
      console.log(
        `  ~ Updated: ${itemData.name} (linked to violation: ${itemData.violationCode})`,
      );
    }
  }

  console.log(
    `\nDocument Inspection Items seeded: ${totalCreated} created, ${totalUpdated} updated`,
  );

  // Only disconnect if we connected
  if (didConnect) {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDocumentInspectionItems().catch(console.error);
}

module.exports = { seedDocumentInspectionItems, DOCUMENT_INSPECTION_ITEMS };
