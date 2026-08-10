/**
 * Seed Variables
 *
 * Populates the variables from the comprehensive fee seeder reference.
 * This is idempotent - can be run multiple times without creating duplicates.
 *
 * Usage:
 *   node backend/services/business-service/src/seed/seedVariables.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const Variable = require("../models/Variable");
const Fee = require("../models/Fee");
const VariableFeeRule = require("../models/VariableFeeRule");
const Checklist = require("../models/Checklist");
const {
  variableFeeRules: REFERENCE_VARIABLE_FEE_RULES,
} = require("./comprehensiveFeeSeederReference");
const { seedVariableChecklists } = require("./seedVariableChecklists");

// Transform reference data to match the Variable model
// Remove "Fee" suffix from names since these are business variables, not fees
const VARIABLES_SEED_DATA = REFERENCE_VARIABLE_FEE_RULES.map((rule) => {
  const unit = rule.unit || "unit";
  const unitSingular = rule.unitSingular || unit;
  const unitPlural = rule.unitPlural || unit;
  const unitContextSingular = rule.unitContextSingular || unitSingular;
  const unitContextPlural = rule.unitContextPlural || unitPlural;

  return {
    customId: rule._id,
    name: rule.name.replace(/ Fee$/, ""), // Remove "Fee" suffix
    description: rule.description || "",
    notes: rule.notes || "",
    question: rule.question || "",
    calculationMethod: rule.calculationMethod,
    customCalculationMethod: rule.customCalculationMethod || null,
    baseRate: rule.baseRate,
    unit,
    unitSingular,
    unitPlural,
    unitContextSingular,
    unitContextPlural,
    brackets: rule.brackets || [],
    classifications: rule.classifications || [],
    legalBasis: rule.legalBasis || [],
    isActive: rule.isActive !== false,
  };
});

// Add yes/no variables (migrated from ConditionalFee)
const YES_NO_VARIABLES = [
  {
    customId: "VAR-YES-001",
    name: "Parking Available",
    description:
      "Variable for establishments based on parking space availability",
    notes: "Yes/no question for parking availability",
    question: "Does the establishment have parking space?",
    calculationMethod: "yes_no",
    fixedAmount: 200,
    unit: "space",
    unitSingular: "space",
    unitPlural: "spaces",
    unitContextSingular: "parking space",
    unitContextPlural: "parking spaces",
    legalBasis: [
      {
        title: "Local Government Code of 1991, Sec. 152",
        description: "Parking space requirements for commercial establishments",
      },
    ],
    isActive: true,
  },
];

const ALL_VARIABLES = [...VARIABLES_SEED_DATA, ...YES_NO_VARIABLES];

async function seed() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  let totalUpserted = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;

  console.log("\nSeeding Variables...");

  // First, delete any variables that are not in our new list (cleanup old variables)
  const newCustomIds = ALL_VARIABLES.map((v) => v.customId);
  const toDelete = await Variable.find({ customId: { $nin: newCustomIds } });
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map((v) => v._id);
    await Variable.deleteMany({ _id: { $in: deleteIds } }).maxTimeMS(30000);
    totalDeleted = toDelete.length;
    console.log(`  - Deleted ${totalDeleted} old variables`);
  }

  for (const variableData of ALL_VARIABLES) {
    const existing = await Variable.findOne({
      customId: variableData.customId,
    });

    // Find associated Variable Fee Rule by customId
    let variableFeeRuleId = null;
    const variableFeeRule = await VariableFeeRule.findOne({
      customId: variableData.customId,
    });
    if (variableFeeRule) {
      variableFeeRuleId = variableFeeRule._id;
    }

    // Create or find associated Fee
    let feeId = null;
    const feeName = `${variableData.name} Fee`;
    const existingFee = await Fee.findOne({
      name: feeName,
      category: "variable_fee",
    });

    if (!existingFee) {
      // Create new fee
      const fee = await Fee.create({
        name: feeName,
        notes: `Variable fee for ${variableData.name}`,
        amount: variableData.baseRate || 0,
        category: "variable_fee",
        version: 1,
      });
      feeId = fee._id;
      console.log(`  + Created fee: ${feeName}`);
    } else {
      feeId = existingFee._id;
    }

    // Find associated checklist by variableId
    let checklistId = null;
    const checklist = await Checklist.findOne({ variableId: existing?._id });
    if (checklist) {
      checklistId = checklist._id;
    }

    if (!existing) {
      // Insert new
      const newVariable = await Variable.create({
        ...variableData,
        feeId,
        variableFeeRuleId,
        checklistId,
        version: 1,
      });
      totalUpserted++;
      console.log(
        `  + Seeded: ${variableData.name} (${variableData.calculationMethod})`,
      );

      // Update checklist to link to this variable
      if (checklist) {
        await Checklist.updateOne(
          { _id: checklist._id },
          { variableId: newVariable._id },
        );
      }
    } else {
      // Update name to remove "Fee" suffix if present and link fee, variable fee rule, and checklist
      await Variable.updateOne(
        { customId: variableData.customId },
        {
          $set: {
            name: variableData.name,
            description: variableData.description,
            legalBasis: variableData.legalBasis,
            feeId,
            variableFeeRuleId,
            checklistId,
            unitSingular: variableData.unitSingular,
            unitPlural: variableData.unitPlural,
            unitContextSingular: variableData.unitContextSingular,
            unitContextPlural: variableData.unitContextPlural,
          },
        },
      );
      totalUpdated++;
      console.log(
        `  ~ Updated: ${variableData.name} (customId: ${variableData.customId})`,
      );
    }
  }

  console.log(
    `\nDone. Total Seeded: ${totalUpserted}, Total Updated: ${totalUpdated}, Total Deleted: ${totalDeleted}`,
  );

  // Seed variable checklists after variables are created
  console.log("\nSeeding variable checklists...");
  await seedVariableChecklists();

  await mongoose.disconnect();
}

/**
 * Seed variables if the collection is empty.
 * Safe to call during startup — assumes mongoose is already connected.
 *
 * @returns {{ seeded: boolean, count?: number, error?: string }}
 */
async function seedIfEmpty() {
  try {
    const variableCount = await Variable.countDocuments({});

    if (variableCount === 0) {
      let totalUpserted = 0;

      for (const variableData of ALL_VARIABLES) {
        await Variable.create({
          ...variableData,
          version: 1,
        });
        totalUpserted++;
      }

      // Seed variable checklists after variables are created
      console.log("\nSeeding variable checklists...");
      await seedVariableChecklists();

      return { seeded: true, count: totalUpserted };
    }

    return {
      seeded: false,
      variableCount,
    };
  } catch (error) {
    console.error("Variables seedIfEmpty error:", error);
    return { seeded: false, error: error.message };
  }
}

async function seedForce() {
  try {
    // Clear all existing variables with timeout handling
    console.log("Clearing existing variables...");
    await Variable.deleteMany({}).maxTimeMS(60000);
    console.log("Cleared existing data");

    let totalUpserted = 0;

    for (const variableData of ALL_VARIABLES) {
      await Variable.create({
        ...variableData,
        version: 1,
      });
      totalUpserted++;
    }

    return { seeded: true, count: totalUpserted };
  } catch (error) {
    return { seeded: false, error: error.message };
  }
}

module.exports = { seed, seedIfEmpty, seedForce };

// Run seed if called directly
if (require.main === module) {
  const force = process.argv.includes("--force");
  if (force) {
    seedForce()
      .then((result) => {
        if (result.seeded) {
          console.log(`Force seeded ${result.count} variables`);
        } else {
          console.error("Force seed failed:", result.error);
        }
        process.exit(result.seeded ? 0 : 1);
      })
      .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
      });
  } else {
    seed().catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
  }
}
