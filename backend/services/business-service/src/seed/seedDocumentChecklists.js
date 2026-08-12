const mongoose = require("mongoose");
const Checklist = require("../models/Checklist");
const InspectionItem = require("../models/InspectionItem");
const ClaimableDocument = require("../../../../shared/models/ClaimableDocument");
const { DOCUMENT_INSPECTION_ITEMS } = require("./seedDocumentInspectionItems");

/**
 * Document Checklists Seeder
 *
 * Seeds checklists specific to document compliance verification.
 * Each checklist corresponds to one document and contains inspection items.
 *
 * Structure:
 * - name: Display name of the checklist
 * - description: Description of the checklist
 * - notes: Inspector guidance
 * - legalBasis: Array of legal references (url, title, description)
 * - items: Array of inspection items with inspectionItemCustomId and order
 */

const DOCUMENT_CHECKLISTS = [
  // Unified Business Permit
  {
    documentCustomId: "unified-business-permit",
    name: "Unified Business Permit Compliance",
    description:
      "Checklist for verifying Unified Business Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for BPLO-issued business permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code",
        description: "Section 152: Business permit requirements",
      },
    ],
    items: [
      { inspectionItemCustomId: "doc-inspection-permit-presence", order: 1 },
      { inspectionItemCustomId: "doc-inspection-permit-validity", order: 2 },
      {
        inspectionItemCustomId: "doc-inspection-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Real Property Tax Clearance
  {
    documentCustomId: "real-property-tax-clearance",
    name: "Real Property Tax Clearance Compliance",
    description:
      "Checklist for verifying Real Property Tax Clearance presence and validity",
    notes:
      "Covers clearance presence, validity period, and authenticity verification for treasury-issued tax clearances",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1997/06/11/republic-act-no-8424/",
        title: "RA 8424 - Local Government Tax Code",
        description: "Section 193: Real property tax clearance requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-tax-clearance-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-tax-clearance-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-tax-clearance-authenticity",
        order: 3,
      },
    ],
  },

  // Account Clearance
  {
    documentCustomId: "account-clearance",
    name: "Account Clearance Compliance",
    description:
      "Checklist for verifying Account Clearance presence and validity",
    notes:
      "Covers clearance presence, validity period, and authenticity verification for accounting office-issued clearances",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1992/12/23/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code",
        description: "Section 444: Accounting office functions",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-account-clearance-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-account-clearance-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-account-clearance-authenticity",
        order: 3,
      },
    ],
  },

  // Cooperative Permit
  {
    documentCustomId: "cooperative-permit",
    name: "Cooperative Permit Compliance",
    description:
      "Checklist for verifying Cooperative Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for cooperative permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/02/20/republic-act-no-9520/",
        title: "RA 9520 - Philippine Cooperative Code",
        description: "Section 13: Cooperative registration requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-cooperative-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-cooperative-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId:
          "doc-inspection-cooperative-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Association/Foundation Permit
  {
    documentCustomId: "association-foundation-permit",
    name: "Association/Foundation Permit Compliance",
    description:
      "Checklist for verifying Association/Foundation Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for association/foundation permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1980/06/10/presidential-decree-no-1586/",
        title: "PD 1586 - Revised Corporation Code",
        description: "Section 36: Non-profit corporation requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-association-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-association-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId:
          "doc-inspection-association-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Chainsaw Permit
  {
    documentCustomId: "chainsaw-permit",
    name: "Chainsaw Permit Compliance",
    description:
      "Checklist for verifying Chainsaw Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for chainsaw permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/06/12/republic-act-no-7586/",
        title: "RA 7586 - Chainsaw Act",
        description: "Section 6: Chainsaw permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-chainsaw-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-chainsaw-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-chainsaw-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Firecrackers Stallholders Permit
  {
    documentCustomId: "firecrackers-stallholders-permit",
    name: "Firecrackers Stallholders Permit Compliance",
    description:
      "Checklist for verifying Firecrackers Stallholders Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for firecrackers stallholders permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2007/12/24/republic-act-no-7183/",
        title: "RA 7183 - Firecrackers Law",
        description: "Section 5: Firecrackers permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-firecrackers-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-firecrackers-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId:
          "doc-inspection-firecrackers-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Bazaar/Festival Vendors Permit
  {
    documentCustomId: "bazaar-festival-vendors-permit",
    name: "Bazaar/Festival Vendors Permit Compliance",
    description:
      "Checklist for verifying Bazaar/Festival Vendors Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for bazaar/festival vendor permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code",
        description: "Section 152: Temporary permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-bazaar-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-bazaar-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-bazaar-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Peddlers Permit
  {
    documentCustomId: "peddlers-permit",
    name: "Peddlers Permit Compliance",
    description:
      "Checklist for verifying Peddlers Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for peddlers permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code",
        description: "Section 152: Peddlers permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-peddlers-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-peddlers-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-peddlers-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Promotions/Exhibitors Permit
  {
    documentCustomId: "promotions-exhibitors-permit",
    name: "Promotions/Exhibitors Permit Compliance",
    description:
      "Checklist for verifying Promotions/Exhibitors Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for promotions/exhibitors permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code",
        description: "Section 152: Promotional activity permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-promotions-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-promotions-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-promotions-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Cemetery Stallholders Permit
  {
    documentCustomId: "cemetery-stallholders-permit",
    name: "Cemetery Stallholders Permit Compliance",
    description:
      "Checklist for verifying Cemetery Stallholders Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for cemetery stallholders permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code",
        description: "Section 152: Cemetery stall permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-cemetery-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-cemetery-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-cemetery-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Fish Trap/Fish Pen Permit
  {
    documentCustomId: "fish-trap-fish-pen-permit",
    name: "Fish Trap/Fish Pen Permit Compliance",
    description:
      "Checklist for verifying Fish Trap/Fish Pen Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for fish trap/fish pen permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1998/02/04/republic-act-no-8550/",
        title: "RA 8550 - Philippine Fisheries Code",
        description: "Section 29: Fishery permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-fish-trap-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-fish-trap-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-fish-trap-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Fish Pond Permit
  {
    documentCustomId: "fish-pond-permit",
    name: "Fish Pond Permit Compliance",
    description:
      "Checklist for verifying Fish Pond Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for fish pond permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1998/02/04/republic-act-no-8550/",
        title: "RA 8550 - Philippine Fisheries Code",
        description: "Section 29: Fishery permit requirements",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-fish-pond-permit-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-fish-pond-permit-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-fish-pond-permit-authenticity",
        order: 3,
      },
    ],
  },

  // Fire Safety Inspection Certificate
  {
    documentCustomId: "fire-safety-inspection-certificate",
    name: "Fire Safety Inspection Certificate Compliance",
    description:
      "Checklist for verifying Fire Safety Inspection Certificate presence and validity",
    notes:
      "Covers certificate presence, validity period, and authenticity verification for BFP-issued fire safety certificates",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description:
          "Section 13: Fire safety inspection certificate requirement",
      },
    ],
    items: [
      {
        inspectionItemCustomId: "doc-inspection-fire-safety-presence",
        order: 1,
      },
      {
        inspectionItemCustomId: "doc-inspection-fire-safety-validity",
        order: 2,
      },
      {
        inspectionItemCustomId: "doc-inspection-fire-safety-authenticity",
        order: 3,
      },
    ],
  },

  // Sanitary Permit
  {
    documentCustomId: "sanitary-permit",
    name: "Sanitary Permit Compliance",
    description:
      "Checklist for verifying Sanitary Permit presence and validity",
    notes:
      "Covers permit presence, validity period, and authenticity verification for health department-issued sanitary permits",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Sanitation Code of the Philippines",
        description: "Section 7: Sanitary permit requirement",
      },
    ],
    items: [
      { inspectionItemCustomId: "doc-inspection-sanitary-presence", order: 1 },
      { inspectionItemCustomId: "doc-inspection-sanitary-validity", order: 2 },
      {
        inspectionItemCustomId: "doc-inspection-sanitary-authenticity",
        order: 3,
      },
    ],
  },

  // Zoning Clearance
  {
    documentCustomId: "zoning-clearance",
    name: "Zoning Clearance Compliance",
    description:
      "Checklist for verifying Zoning Clearance presence and validity",
    notes:
      "Covers clearance presence, validity period, and authenticity verification for HLURB or local zoning office-issued zoning clearances",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1185/",
        title: "PD 1185 - Local Government Code",
        description: "Section 44: Zoning clearance requirement",
      },
    ],
    items: [
      { inspectionItemCustomId: "doc-inspection-zoning-presence", order: 1 },
      { inspectionItemCustomId: "doc-inspection-zoning-validity", order: 2 },
      {
        inspectionItemCustomId: "doc-inspection-zoning-authenticity",
        order: 3,
      },
    ],
  },
];

async function seedDocumentChecklists() {
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

  console.log("\nSeeding Document Checklists...");

  for (const checklistData of DOCUMENT_CHECKLISTS) {
    const { documentCustomId, items, ...checklistFields } = checklistData;

    // Find inspection items by customId
    const inspectionItems = [];
    for (const item of items) {
      const inspectionItem = await InspectionItem.findOne({
        customId: item.inspectionItemCustomId,
      });
      if (inspectionItem) {
        inspectionItems.push({
          inspectionItemId: inspectionItem._id,
          order: item.order,
        });
      } else {
        console.warn(
          `  ! Warning: Inspection item not found: ${item.inspectionItemCustomId}`,
        );
      }
    }

    // Find document by customId
    const document = await ClaimableDocument.findOne({
      customId: documentCustomId,
    });

    if (!document) {
      console.warn(`  ! Warning: Document not found: ${documentCustomId}`);
      continue;
    }

    const existing = await Checklist.findOne({ documentId: document._id });

    if (!existing) {
      const checklist = await Checklist.create({
        ...checklistFields,
        items: inspectionItems,
        documentId: document._id,
        version: 1,
      });
      totalCreated++;
      console.log(
        `  + Created: ${checklistData.name} (document: ${documentCustomId})`,
      );

      // Update document with checklistId
      await ClaimableDocument.updateOne(
        { _id: document._id },
        { checklistId: checklist._id },
      );
    } else {
      await Checklist.updateOne(
        { documentId: document._id },
        {
          ...checklistFields,
          items: inspectionItems,
        },
      );
      totalUpdated++;
      console.log(
        `  ~ Updated: ${checklistData.name} (document: ${documentCustomId})`,
      );

      // Update document with checklistId
      await ClaimableDocument.updateOne(
        { _id: document._id },
        { checklistId: existing._id },
      );
    }
  }

  console.log(
    `\nDocument Checklists seeded: ${totalCreated} created, ${totalUpdated} updated`,
  );

  // Only disconnect if we connected
  if (didConnect) {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDocumentChecklists().catch(console.error);
}

module.exports = { seedDocumentChecklists, DOCUMENT_CHECKLISTS };
