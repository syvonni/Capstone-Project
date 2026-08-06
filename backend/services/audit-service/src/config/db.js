const mongoose = require("mongoose");
const logger = require("../lib/logger");

// Phase 5: Database query performance tracking
mongoose.set("debug", false); // Disable mongoose debug mode (we use our own)

async function connectDB(uri) {
  if (!uri) {
    logger.warn("MONGO_URI not set. Skipping MongoDB connection.");
    return;
  }

  try {
    // Connect using the provided URI. Mongoose will parse the DB name from the URI.
    await mongoose.connect(uri);
    // Log the resolved connection details to help debug which database was used.
    try {
      const dbName =
        mongoose.connection && mongoose.connection.name
          ? mongoose.connection.name
          : "<unknown-db>";
      const host =
        mongoose.connection && mongoose.connection.host
          ? mongoose.connection.host
          : "<unknown-host>";
      logger.info(
        `MongoDB connected to database '${dbName}' on host '${host}'`,
      );
    } catch (logErr) {
      // Best-effort logging; do not fail the connection if logging fails.
      logger.info("MongoDB connected (unable to resolve connection name/host)");
    }
  } catch (err) {
    logger.error("MongoDB connection error", { error: err });
    throw err;
  }
}

module.exports = connectDB;
