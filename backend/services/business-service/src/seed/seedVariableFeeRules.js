/**
 * Seed Variable Fee Rules
 *
 * Populates the variable fee rules from the comprehensive fee seeder reference.
 * This is idempotent - can be run multiple times without creating duplicates.
 *
 * Usage:
 *   node backend/services/business-service/src/seed/seedVariableFeeRules.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const VariableFeeRule = require("../models/VariableFeeRule");
const {
  variableFeeRules: REFERENCE_VARIABLE_FEE_RULES,
} = require("./comprehensiveFeeSeederReference");

// Transform reference data to match the VariableFeeRule model
const VARIABLE_FEE_RULES_SEED_DATA = REFERENCE_VARIABLE_FEE_RULES.map(
  (rule) => {
    return {
      customId: rule._id, // Use customId for reference mapping
      name: rule.name,
      notes: rule.notes || "",
      question: rule.question || "",
      calculationMethod: rule.calculationMethod,
      customCalculationMethod: rule.customCalculationMethod || null,
      baseRate: rule.baseRate,
      unit: rule.unit,
      brackets: rule.brackets || [],
      classifications: rule.classifications || [],
      isActive: rule.isActive !== false,
    };
  },
);

async function seed() {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://capstone_app:devapppass@localhost:27017/capstone_project?authSource=admin";
  console.log(
    `Connecting to MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, "//<credentials>@")}`,
  );
  await mongoose.connect(mongoUri);

  let totalUpserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  console.log("\nSeeding Variable Fee Rules...");
  for (const ruleData of VARIABLE_FEE_RULES_SEED_DATA) {
    const existing = await VariableFeeRule.findOne({ name: ruleData.name });

    if (!existing) {
      // Insert new
      await VariableFeeRule.create({
        ...ruleData,
        version: 1,
      });
      totalUpserted++;
      console.log(
        `  + Seeded: ${ruleData.name} (${ruleData.calculationMethod}, ₱${ruleData.baseRate}/${ruleData.unit})`,
      );
    } else {
      // Check if any fields need updating
      const needsUpdate =
        existing.calculationMethod !== ruleData.calculationMethod ||
        existing.baseRate !== ruleData.baseRate ||
        existing.unit !== ruleData.unit ||
        existing.question !== ruleData.question ||
        existing.notes !== ruleData.notes;

      if (needsUpdate) {
        await VariableFeeRule.updateOne(
          { name: ruleData.name },
          {
            $set: {
              calculationMethod: ruleData.calculationMethod,
              baseRate: ruleData.baseRate,
              unit: ruleData.unit,
              question: ruleData.question,
              notes: ruleData.notes,
            },
          },
        );
        totalUpdated++;
        console.log(`  ~ Updated: ${ruleData.name}`);
      } else {
        totalSkipped++;
        console.log(`  = Skipped (exists): ${ruleData.name}`);
      }
    }
  }

  console.log(
    `\nDone. Total Seeded: ${totalUpserted}, Total Updated: ${totalUpdated}, Total Skipped: ${totalSkipped}`,
  );
  await mongoose.disconnect();
}

/**
 * Seed variable fee rules if the collection is empty.
 * Safe to call during startup — assumes mongoose is already connected.
 *
 * @returns {{ seeded: boolean, count?: number, error?: string }}
 */
async function seedIfEmpty() {
  try {
    const ruleCount = await VariableFeeRule.countDocuments({});

    if (ruleCount === 0) {
      let totalUpserted = 0;

      for (const ruleData of VARIABLE_FEE_RULES_SEED_DATA) {
        await VariableFeeRule.create({
          ...ruleData,
          version: 1,
        });
        totalUpserted++;
      }

      return { seeded: true, count: totalUpserted };
    }

    return {
      seeded: false,
      ruleCount,
    };
  } catch (error) {
    return { seeded: false, error: error.message };
  }
}

async function seedForce() {
  try {
    // Clear all existing variable fee rules with timeout handling
    console.log("Clearing existing variable fee rules...");
    await VariableFeeRule.deleteMany({}).maxTimeMS(30000);
    console.log("Cleared existing data");

    let totalUpserted = 0;

    for (const ruleData of VARIABLE_FEE_RULES_SEED_DATA) {
      await VariableFeeRule.create({
        ...ruleData,
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
          console.log(`Force seeded ${result.count} variable fee rules`);
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
