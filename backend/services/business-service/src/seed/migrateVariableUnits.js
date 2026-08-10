const mongoose = require("mongoose");
const Variable = require("../models/Variable");

// Basic pluralization mapping for common units
const pluralizationMap = {
  unit: "units",
  room: "rooms",
  sqm: "sqm",
  "sq.m": "sq.m",
  hectare: "hectares",
  establishment: "establishments",
  inspection: "inspections",
  application: "applications",
  vehicle: "vehicles",
  equipment: "equipment",
  certificate: "certificates",
  student: "students",
  night: "nights",
  guard: "guards",
  facility: "facilities",
  door: "doors",
};

function getPlural(unit) {
  // Check mapping first
  if (pluralizationMap[unit]) {
    return pluralizationMap[unit];
  }

  // Simple rule: if it doesn't end with 's', add 's'
  if (!unit.endsWith("s")) {
    return unit + "s";
  }

  // Already looks plural, return as-is
  return unit;
}

async function migrateVariableUnits() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/capstone_project";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get all variables
    const variables = await Variable.find({});
    console.log(`Found ${variables.length} variables to migrate`);

    let updated = 0;
    for (const variable of variables) {
      const singular = variable.unit;
      const plural = getPlural(variable.unit);

      // Use direct MongoDB update to add fields if they don't exist
      const result = await Variable.updateOne(
        { _id: variable._id },
        {
          $set: {
            unitSingular: singular,
            unitPlural: plural,
          },
        },
      );

      if (result.modifiedCount > 0) {
        updated++;
        console.log(`Updated: ${variable.customId} - ${singular} / ${plural}`);
      }
    }

    console.log(`Migration complete. Updated ${updated} variables.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateVariableUnits();
