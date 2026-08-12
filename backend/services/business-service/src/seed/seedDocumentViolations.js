const mongoose = require("mongoose");
const Violation = require("../models/Violation");
const Fee = require("../../../../shared/models/Fee");

/**
 * Document Violations Seeder
 *
 * Seeds violations specific to document non-compliance.
 * These violations are triggered when inspection items for documents fail.
 *
 * Structure:
 * - name: Display name of the violation
 * - description: Description of the violation
 * - notes: Inspector guidance on the violation
 * - penaltyAmount: Fine amount for the violation (in PHP)
 * - severity: Severity level (minor, major, critical)
 * - legalBasis: Array of legal references (url, title, description)
 * - correctiveAction: Required action to resolve the violation
 */

const DOCUMENT_VIOLATIONS = [
  // Fire Safety Inspection Certificate Violations
  {
    code: "doc-missing-fire-safety-certificate",
    name: "Missing Fire Safety Inspection Certificate",
    description: "Establishment lacks valid Fire Safety Inspection Certificate",
    notes: "No BFP-issued fire safety inspection certificate on file.",
    penaltyAmount: 1000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description:
          "Section 13: Fire safety inspection certificate requirement",
      },
    ],
    correctiveAction:
      "Obtain valid Fire Safety Inspection Certificate from BFP",
  },
  {
    code: "doc-expired-fire-safety-certificate",
    name: "Expired Fire Safety Inspection Certificate",
    description: "Fire Safety Inspection Certificate has expired",
    notes: "BFP certificate is past its validity period.",
    penaltyAmount: 800,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description: "Section 13: Certificate validity requirements",
      },
    ],
    correctiveAction: "Renew Fire Safety Inspection Certificate with BFP",
  },
  {
    code: "doc-invalid-fire-safety-certificate",
    name: "Invalid Fire Safety Inspection Certificate",
    description: "Fire Safety Inspection Certificate is invalid or falsified",
    notes:
      "Certificate lacks proper BFP signature, seal, or certificate number.",
    penaltyAmount: 2000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description: "Section 13: Valid certificate requirements",
      },
    ],
    correctiveAction:
      "Obtain valid Fire Safety Inspection Certificate from BFP",
  },

  // Sanitary Permit Violations
  {
    code: "doc-missing-sanitary-permit",
    name: "Missing Sanitary Permit",
    description: "Establishment lacks valid Sanitary Permit",
    notes: "No health department-issued sanitary permit on file.",
    penaltyAmount: 1000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Sanitary permit requirement",
      },
    ],
    correctiveAction: "Obtain valid Sanitary Permit from local health office",
  },
  {
    code: "doc-expired-sanitary-permit",
    name: "Expired Sanitary Permit",
    description: "Sanitary Permit has expired",
    notes: "Health department permit is past its validity period.",
    penaltyAmount: 800,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Permit validity requirements",
      },
    ],
    correctiveAction: "Renew Sanitary Permit with local health office",
  },
  {
    code: "doc-invalid-sanitary-permit",
    name: "Invalid Sanitary Permit",
    description: "Sanitary Permit is invalid or falsified",
    notes:
      "Permit lacks proper health office signature, seal, or permit number.",
    penaltyAmount: 2000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Valid permit requirements",
      },
    ],
    correctiveAction: "Obtain valid Sanitary Permit from local health office",
  },

  // Zoning Clearance Violations
  {
    code: "doc-missing-zoning-clearance",
    name: "Missing Zoning Clearance",
    description: "Establishment lacks valid Zoning Clearance",
    notes: "No HLURB or local zoning office-issued zoning clearance on file.",
    penaltyAmount: 1000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Zoning clearance requirement",
      },
    ],
    correctiveAction: "Obtain valid Zoning Clearance from local zoning office",
  },
  {
    code: "doc-expired-zoning-clearance",
    name: "Expired Zoning Clearance",
    description: "Zoning Clearance has expired",
    notes: "Zoning clearance is past its validity period.",
    penaltyAmount: 800,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Clearance validity requirements",
      },
    ],
    correctiveAction: "Renew Zoning Clearance with local zoning office",
  },
  {
    code: "doc-invalid-zoning-clearance",
    name: "Invalid Zoning Clearance",
    description: "Zoning Clearance is invalid or falsified",
    notes:
      "Clearance lacks proper zoning office signature, seal, or clearance number.",
    penaltyAmount: 2000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Valid clearance requirements",
      },
    ],
    correctiveAction: "Obtain valid Zoning Clearance from local zoning office",
  },
];

async function seedDocumentViolations() {
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

  console.log("\nSeeding Document Violations...");

  for (const violationData of DOCUMENT_VIOLATIONS) {
    const existing = await Violation.findOne({ code: violationData.code });

    // Create or find penalty fee for this violation
    const penaltyFeeName = `${violationData.name} Penalty`;
    const penaltyFeeCustomId = `document-penalty-${violationData.code}`;
    let penaltyFee = await Fee.findOne({
      customId: penaltyFeeCustomId,
      category: "penalty",
    });

    if (!penaltyFee) {
      // Create new penalty fee if it doesn't exist
      penaltyFee = await Fee.create({
        customId: penaltyFeeCustomId,
        name: penaltyFeeName,
        amount: violationData.penaltyAmount,
        category: "penalty",
        isActive: true,
        version: 1,
      });
      console.log(
        `  + Created penalty fee: ${penaltyFeeName} (₱${violationData.penaltyAmount})`,
      );
    }

    if (!existing) {
      await Violation.create({
        ...violationData,
        feeId: penaltyFee._id,
      });
      totalCreated++;
      console.log(`  + Created violation: ${violationData.name}`);
    } else {
      await Violation.updateOne(
        { code: violationData.code },
        {
          ...violationData,
          feeId: penaltyFee._id,
        },
      );
      totalUpdated++;
      console.log(`  ~ Updated violation: ${violationData.name}`);
    }
  }

  console.log(
    `\nDocument Violations seeded: ${totalCreated} created, ${totalUpdated} updated`,
  );

  // Only disconnect if we connected
  if (didConnect) {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDocumentViolations().catch(console.error);
}

module.exports = { seedDocumentViolations, DOCUMENT_VIOLATIONS };
