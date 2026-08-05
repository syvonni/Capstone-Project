const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const logger = require("./lib/logger");
const correlationIdMiddleware = require("./middleware/correlationId");
const {
  performanceMonitorMiddleware,
} = require("./middleware/performanceMonitor");
const { securityMonitorMiddleware } = require("./middleware/securityMonitor");
const errorHandlerMiddleware = require("./middleware/errorHandler");
const http = require("http");
const mongoose = require("mongoose");

dotenv.config();

const app = express();

const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["https://challenges.cloudflare.com"],
        fontSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// Structured Logging & Monitoring Middleware (early in chain)
app.use(correlationIdMiddleware);
app.use(performanceMonitorMiddleware);
app.use(securityMonitorMiddleware);

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

if (process.env.NODE_ENV !== "production") {
  let morgan;
  try {
    morgan = require("morgan");
  } catch (_) {
    morgan = null;
  }
  if (morgan) app.use(morgan("dev"));
}

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const dbStatus =
    mongoose.connection && mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  res.json({
    ok: true,
    service: "audit-service",
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Audit routes
const auditRouter = require("./routes/audit");
app.use("/api/audit", auditRouter);

// Global Error Handler (must be last middleware)
app.use(errorHandlerMiddleware);

const PORT = Number(process.env.AUDIT_SERVICE_PORT || 3004);

async function start() {
  try {
    const uri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URL ||
      "";
    logger.info("Audit Service starting", {
      mongoUri: uri ? "<set>" : "<not-set>",
    });

    logger.info("Attempting to connect to database...");
    await connectDB(uri);
    logger.info("Database connected successfully!");

    // Initialize background jobs after DB connection
    if (process.env.NODE_ENV !== "test") {
      try {
        const { startJobs } = require("./jobs");
        startJobs();
      } catch (error) {
        logger.warn("Failed to start background jobs", { error });
      }
    }

    const server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`Audit Service listening on http://localhost:${PORT}`);
    });

    return server;
  } catch (err) {
    logger.error("Audit Service start failed", { error: err });
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
