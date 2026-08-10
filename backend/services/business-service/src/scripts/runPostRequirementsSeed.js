const { seedPostRequirements } = require("../seed/seedPostRequirements");

seedPostRequirements()
  .then((result) => {
    console.log("Seed completed:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
