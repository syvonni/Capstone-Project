const mongoose = require("mongoose");
const Checklist = require("../models/Checklist");
const InspectionItem = require("../models/InspectionItem");
const { VARIABLE_INSPECTION_ITEMS } = require("./seedVariableInspectionItems");

/**
 * Variable Checklists Seeder
 *
 * Seeds checklists specific to variable compliance verification.
 * Each checklist corresponds to one variable and contains inspection items.
 *
 * Structure:
 * - name: Display name of the checklist
 * - description: Description of the checklist
 * - notes: Inspector guidance
 * - legalBasis: Array of legal references (url, title, description)
 * - items: Array of inspection items with inspectionItemName and order
 */

const VARIABLE_CHECKLISTS = [
  // Salon/Barber Chair Fee
  {
    variableCustomId: 'salon-barber-chair-fee',
    name: 'Salon/Barber Chair Compliance',
    description: 'Checklist for verifying salon and barbershop chair count and documentation',
    notes: 'Covers chair count verification and documentation requirements for salon/barbershop businesses',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees based on business capacity'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-salon-chair-count', order: 1 },
      { inspectionItemCustomId: 'var-inspection-salon-chair-docs', order: 2 },
    ]
  },

  // Parking Space Fee
  {
    variableCustomId: 'parking-space-fee',
    name: 'Parking Space Compliance',
    description: 'Checklist for verifying parking area and accessibility',
    notes: 'Covers parking area measurement verification and accessibility compliance',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees based on parking area'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-parking-area', order: 1 },
      { inspectionItemCustomId: 'var-inspection-parking-accessibility', order: 2 },
    ]
  },

  // Storage Area Fee
  {
    variableCustomId: 'storage-area-fee',
    name: 'Storage Area Compliance',
    description: 'Checklist for verifying storage area and safety compliance',
    notes: 'Covers storage area measurement verification and safety standards',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees based on storage area'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-storage-area', order: 1 },
      { inspectionItemCustomId: 'var-inspection-storage-safety', order: 2 },
    ]
  },

  // Boarding Capacity Fee
  {
    variableCustomId: 'boarding-capacity-fee',
    name: 'Boarding House Compliance',
    description: 'Checklist for verifying boarding house capacity and safety',
    notes: 'Covers boarding capacity verification and safety/occupancy standards',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees based on boarding capacity'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-boarding-capacity', order: 1 },
      { inspectionItemCustomId: 'var-inspection-boarding-safety', order: 2 },
    ]
  },

  // PUV Unit Fee
  {
    variableCustomId: 'puv-unit-fee',
    name: 'PUV Compliance',
    description: 'Checklist for verifying public utility vehicle operations',
    notes: 'Covers PUV vehicle count verification and registration validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'Section 5: Registration requirements for PUVs'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-puv-count', order: 1 },
      { inspectionItemCustomId: 'var-inspection-puv-registration', order: 2 },
    ]
  },

  // Trucking Unit Fee
  {
    variableCustomId: 'trucking-unit-fee',
    name: 'Trucking Compliance',
    description: 'Checklist for verifying trucking vehicle operations',
    notes: 'Covers trucking vehicle count verification and registration validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees on trucking operations'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-trucking-count', order: 1 },
      { inspectionItemCustomId: 'var-inspection-trucking-registration', order: 2 },
    ]
  },

  // Mining Hectare Fee
  {
    variableCustomId: 'mining-hectare-fee',
    name: 'Mining Compliance',
    description: 'Checklist for verifying mining operations',
    notes: 'Covers mining area verification and permit validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Area verification requirements for mining permits'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-mining-area', order: 1 },
      { inspectionItemCustomId: 'var-inspection-mining-permit', order: 2 },
    ]
  },

  // Subdivision Lot Fee
  {
    variableCustomId: 'subdivision-lot-fee',
    name: 'Subdivision Lot Compliance',
    description: 'Checklist for verifying subdivision lot count and permits',
    notes: 'Covers subdivision lot count verification and development permit validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Section 5: Registration requirements for subdivision projects'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-subdivision-lots', order: 1 },
      { inspectionItemCustomId: 'var-inspection-subdivision-permit', order: 2 },
    ]
  },

  // Subdivision Area Fee
  {
    variableCustomId: 'subdivision-area-fee',
    name: 'Subdivision Area Compliance',
    description: 'Checklist for verifying subdivision area',
    notes: 'Covers subdivision area verification',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Section 5: Area verification requirements for subdivision projects'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-subdivision-area', order: 1 },
    ]
  },

  // Subdivision Floor Area Fee
  {
    variableCustomId: 'subdivision-floor-area-fee',
    name: 'Subdivision Floor Area Compliance',
    description: 'Checklist for verifying subdivision floor area',
    notes: 'Covers subdivision floor area verification',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 301: Floor area verification requirements'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-subdivision-floor-area', order: 1 },
    ]
  },

  // Hospital Bed Fee
  {
    variableCustomId: 'hospital-bed-fee',
    name: 'Hospital Bed Capacity Compliance',
    description: 'Checklist for verifying hospital bed capacity and LTO',
    notes: 'Covers hospital bed capacity verification and LTO validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/',
        title: 'RA 4226 - Hospital Licensure Act',
        description: 'Section 3: Bed capacity reporting requirements'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-hospital-beds', order: 1 },
      { inspectionItemCustomId: 'var-inspection-hospital-lto', order: 2 },
    ]
  },

  // Printing Machine Fee
  {
    variableCustomId: 'printing-machine-fee',
    name: 'Printing Machine Compliance',
    description: 'Checklist for verifying printing machine count and registration',
    notes: 'Covers printing machine count verification and registration requirements',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees on printing equipment'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-printing-machines', order: 1 },
      { inspectionItemCustomId: 'var-inspection-printing-registration', order: 2 },
    ]
  },

  // Market Stall Fee
  {
    variableCustomId: 'market-stall-fee',
    name: 'Market Stall Compliance',
    description: 'Checklist for verifying market stall area and assignment',
    notes: 'Covers market stall area verification and assignment validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees based on stall area'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-market-stall-area', order: 1 },
      { inspectionItemCustomId: 'var-inspection-market-stall-assignment', order: 2 },
    ]
  },

  // Hotel Room Fee
  {
    variableCustomId: 'hotel-room-fee',
    name: 'Hotel Room Compliance',
    description: 'Checklist for verifying hotel room count and accreditation',
    notes: 'Covers hotel room count verification and DOT accreditation validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/',
        title: 'RA 9593 - Tourism Act of 2009',
        description: 'Section 38: Room capacity reporting requirements'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-hotel-rooms', order: 1 },
      { inspectionItemCustomId: 'var-inspection-hotel-accreditation', order: 2 },
    ]
  },

  // Apartment Unit Fee
  {
    variableCustomId: 'apartment-unit-fee',
    name: 'Apartment Unit Compliance',
    description: 'Checklist for verifying apartment unit count and permits',
    notes: 'Covers apartment unit count verification and building permit validity',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Authority to impose fees on rental units'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-apartment-units', order: 1 },
      { inspectionItemCustomId: 'var-inspection-apartment-permit', order: 2 },
    ]
  },

  // Bank Classification Fee
  {
    variableCustomId: 'bank-classification-fee',
    name: 'Bank Classification Compliance',
    description: 'Checklist for verifying bank type and registration',
    notes: 'Covers bank type verification and BSP registration validity',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/',
        title: 'BSP Circular No. 898',
        description: 'Classification requirements for banks'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-bank-type', order: 1 },
      { inspectionItemCustomId: 'var-inspection-bank-registration', order: 2 },
    ]
  },

  // Lending Classification Fee
  {
    variableCustomId: 'lending-classification-fee',
    name: 'Lending Institution Compliance',
    description: 'Checklist for verifying lending institution type and registration',
    notes: 'Covers lending institution type verification and SEC registration validity',
    legalBasis: [
      {
        url: 'https://www.sec.gov.ph/',
        title: 'SEC Memorandum Circular No. 12',
        description: 'Classification requirements for lending institutions'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-lending-type', order: 1 },
      { inspectionItemCustomId: 'var-inspection-lending-registration', order: 2 },
    ]
  },

  // Pawnshop Classification Fee
  {
    variableCustomId: 'pawnshop-classification-fee',
    name: 'Pawnshop Compliance',
    description: 'Checklist for verifying pawnshop type and registration',
    notes: 'Covers pawnshop type verification and BSP registration validity',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/',
        title: 'BSP Circular No. 522',
        description: 'Classification requirements for pawnshops'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-pawnshop-type', order: 1 },
      { inspectionItemCustomId: 'var-inspection-pawnshop-registration', order: 2 },
    ]
  },

  // Parking Available (Yes/No)
  {
    variableCustomId: 'VAR-YES-001',
    name: 'Parking Space Availability Compliance',
    description: 'Checklist for verifying parking space availability',
    notes: 'Covers parking space availability verification',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements'
      }
    ],
    items: [
      { inspectionItemCustomId: 'var-inspection-parking-availability', order: 1 },
    ]
  },
];

async function seedVariableChecklists() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  let totalCreated = 0;
  let totalUpdated = 0;

  console.log("\nSeeding Variable Checklists...");

  for (const checklistData of VARIABLE_CHECKLISTS) {
    const { variableCustomId, items, ...checklistFields } = checklistData;
    
    // Find inspection items by customId
    const inspectionItems = [];
    for (const item of items) {
      const inspectionItem = await InspectionItem.findOne({ customId: item.inspectionItemCustomId });
      if (inspectionItem) {
        inspectionItems.push({
          inspectionItemId: inspectionItem._id,
          order: item.order
        });
      } else {
        console.warn(`  ! Warning: Inspection item not found: ${item.inspectionItemCustomId}`);
      }
    }

    // Find variable by customId
    const Variable = require("../models/Variable");
    const variable = await Variable.findOne({ customId: variableCustomId });

    if (!variable) {
      console.warn(`  ! Warning: Variable not found: ${variableCustomId}`);
      continue;
    }

    const existing = await Checklist.findOne({ variableId: variable._id });

    if (!existing) {
      const checklist = await Checklist.create({
        ...checklistFields,
        items: inspectionItems,
        variableId: variable._id,
        version: 1,
      });
      totalCreated++;
      console.log(`  + Created: ${checklistData.name} (variable: ${variableCustomId})`);
      
      // Update variable with checklistId
      await Variable.updateOne(
        { _id: variable._id },
        { checklistId: checklist._id }
      );
    } else {
      await Checklist.updateOne(
        { variableId: variable._id },
        {
          ...checklistFields,
          items: inspectionItems,
        }
      );
      totalUpdated++;
      console.log(`  ~ Updated: ${checklistData.name} (variable: ${variableCustomId})`);
      
      // Update variable with checklistId
      await Variable.updateOne(
        { _id: variable._id },
        { checklistId: existing._id }
      );
    }
  }

  console.log(`\nVariable Checklists seeded: ${totalCreated} created, ${totalUpdated} updated`);
  await mongoose.disconnect();
}

// Run if called directly
if (require.main === module) {
  seedVariableChecklists().catch(console.error);
}

module.exports = { seedVariableChecklists, VARIABLE_CHECKLISTS };
