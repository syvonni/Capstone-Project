const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const Variable = require("../models/Variable");

async function checkVariables() {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://capstone_app:devapppass@localhost:27017/capstone_project?authSource=admin";
  console.log(
    `Connecting to MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, "//<credentials>@")}`,
  );
  await mongoose.connect(mongoUri);

  const variables = await Variable.find({}).limit(10).lean();
  console.log(`Found ${variables.length} variables:`);
  console.log(JSON.stringify(variables, null, 2));

  await mongoose.disconnect();
}

checkVariables().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
