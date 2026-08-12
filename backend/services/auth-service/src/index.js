const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const logger = require("./lib/logger");
const correlationIdMiddleware = require("./middleware/correlationId");
const {
  performanceMonitorMiddleware,
} = require("./middleware/performanceMonitor");
const { securityMonitorMiddleware } = require("./middleware/securityMonitor");
const errorHandlerMiddleware = require("./middleware/errorHandler");
const http = require("http");

dotenv.config();
// Load .env from project root when running from backend/services/auth-service (so MONGO_URI etc. are found)
const projectRootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
try {
  require("dotenv").config({ path: projectRootEnv });
} catch (_) {
  /* optional */
}

// In test mode, establish database connection immediately when app is required
// This ensures middleware can access the database
if (process.env.NODE_ENV === "test") {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    "";
  if (uri) {
    try {
      // Check if mongoose is already connected to avoid multiple connections to same URI
      if (mongoose.connection.readyState === 0) {
        connectDB(uri);
      } else {
        logger.info("Using existing mongoose connection for tests");
      }
    } catch (error) {
      logger.warn("Auth service test DB connection failed:", error.message);
    }
  }
}

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

// Track database readiness - prevents indefinite hangs when DB is slow
let dbReady = false;

// Middleware to return 503 while DB is connecting (prevents frontend hangs)
app.use((req, res, next) => {
  // Always allow health check and CSRF endpoints
  if (req.path === "/api/health" || req.path.includes("/csrf-token")) {
    return next();
  }
  // Allow requests once DB is ready
  if (dbReady || mongoose.connection.readyState === 1) {
    return next();
  }
  // Return 503 Service Unavailable - frontend should retry
  return res.status(503).json({
    error: {
      code: "service_starting",
      message: "Service is starting, please retry",
    },
  });
});

// Session/cookie support for SSO
try {
  const cookieParser = require("cookie-parser");
  const session = require("express-session");
  app.use(cookieParser());
  const sessSecret = process.env.SESSION_SECRET || "dev-session-secret";
  app.use(
    session({
      secret: sessSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    }),
  );
} catch (err) {
  logger.warn("Session middleware not available", { error: err });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "auth-service",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection && mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Load Notification model to ensure it's registered
require("./models/Notification");

// Auth routes
const authRouter = require("./routes/index");
app.use("/api/auth", authRouter);

// LGU Officer Business Owners routes
const lguOfficerBusinessOwnersRouter = require("./routes/lguOfficerBusinessOwners");
app.use(
  "/api/auth/lgu-officer/business-owners",
  lguOfficerBusinessOwnersRouter,
);

// Notification routes (shared across all services)
const notificationsRouter = require("./routes/notifications");
app.use("/api/notifications", notificationsRouter);

// Internal service-to-service endpoints
const internalRouter = require("./routes/internal");
app.use("/api/internal", internalRouter);

// IPFS proxy route (for accessing local IPFS content via backend)
const ipfsProxyRouter = require("./routes/ipfsProxy");
app.use("/api/ipfs", ipfsProxyRouter);

// Global Error Handler (must be last middleware)
app.use(errorHandlerMiddleware);

const PORT = Number(process.env.AUTH_SERVICE_PORT || 3001);

async function start() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    "";
  logger.info("Auth Service starting", {
    mongoUri: uri ? "<set>" : "<not-set>",
  });

  // START SERVER IMMEDIATELY - don't wait for DB connection
  const server = http.createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(
      `Auth Service listening on http://0.0.0.0:${PORT} (DB connecting...)`,
    );
  });

  // Connect to DB in background
  try {
    await connectDB(uri);
    dbReady = true;
    logger.info("Auth Service database ready");

    // Seed development data if enabled (with retry for Docker startup)
    if (process.env.SEED_DEV === "true") {
      const maxSeedRetries = 5;
      const seedRetryDelayMs = 3000;
      for (let attempt = 1; attempt <= maxSeedRetries; attempt++) {
        try {
          const { seedDevDataIfEmpty } = require("./lib/seedDev");
          await seedDevDataIfEmpty();
          break;
        } catch (error) {
          logger.warn(`Dev seed attempt ${attempt}/${maxSeedRetries} failed`, {
            error: error.message,
          });
          if (attempt === maxSeedRetries) {
            logger.warn("Dev seed failed after retries", {
              error: error.message,
            });
          } else {
            await new Promise((r) => setTimeout(r, seedRetryDelayMs));
          }
        }
      }
    }

    // Initialize IPFS service (await so connection to ipfs:5001 in Docker completes before check)
    const ipfsService = require("./lib/ipfsService");
    await ipfsService.initialize();
    if (ipfsService.isAvailable()) {
      logger.info("IPFS service available");
    } else {
      logger.warn(
        "IPFS service not available - file uploads will use local storage",
      );
    }

    // Initialize background jobs after DB connection
    if (process.env.NODE_ENV !== "test") {
      try {
        const { startJobs } = require("./jobs");
        startJobs();
      } catch (error) {
        logger.warn("Failed to start background jobs", { error });
      }
    }
  } catch (err) {
    logger.error("Auth Service DB/init failed (server still running)", {
      error: err,
    });
    // Don't exit - server is still running and will return 503 until DB connects
  }

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
