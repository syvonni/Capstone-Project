const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const logger = require("./lib/logger");
const correlationIdMiddleware = require("./middleware/correlationId");
const {
  performanceMonitorMiddleware,
} = require("./middleware/performanceMonitor");
const {
  entityPerformanceMiddleware,
} = require("./middleware/entityPerformanceMiddleware");
const { securityMonitorMiddleware } = require("./middleware/securityMonitor");
const {
  globalRateLimit,
  writeOperationRateLimit,
  sensitiveOperationRateLimit,
} = require("./middleware/rateLimit");
const errorHandlerMiddleware = require("./middleware/errorHandler");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config();

// Load .env from project root when running from backend/services/business-service (so GEMINI_API_KEY etc. are found)
const projectRootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
try {
  require("dotenv").config({ path: projectRootEnv });
} catch (_) {
  /* optional */
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
app.use(entityPerformanceMiddleware);
app.use(securityMonitorMiddleware);

// Rate limiting (apply after security monitoring, before other middleware)
app.use(globalRateLimit());

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Session middleware required for CSRF tokens
try {
  const session = require("express-session");
  const cookieParser = require("cookie-parser");
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
  console.warn("Session middleware not available", { error: err });
}
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Preserve request body for step-up middleware (must be after body parser)
app.use((req, res, next) => {
  if (req.body) {
    req._originalBody = { ...req.body };
  }
  next();
});

// Preserve request body for all routes (to prevent middleware from stripping it)
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    req._body = req.body;
    return originalSend.call(this, data);
  };
  next();
});

// CSRF (IAS-2.7): token endpoint and middleware for /api/business and /api/inspector, /api/lgu-officer
const csrfDisabled =
  process.env.DISABLE_CSRF === "true" || process.env.NODE_ENV === "test";
const {
  createCsrfMiddleware,
  getCsrfTokenHandler,
} = require("../../../shared/csrf");
app.get(
  "/api/business/csrf-token",
  getCsrfTokenHandler({ cookieName: "csrf-token-business", sameSite: "lax" }),
);
app.get(
  "/api/lgu-officer/csrf-token",
  getCsrfTokenHandler({
    cookieName: "csrf-token-lgu-officer",
    sameSite: "lax",
  }),
);
app.use(
  "/api/business",
  createCsrfMiddleware({
    cookieName: "csrf-token-business",
    skipPaths: ["/api/business/csrf-token", "/api/business/payments/mock", "/api/business/applications"],
    disabled: csrfDisabled,
  }),
);
app.use(
  "/api/lgu-officer",
  createCsrfMiddleware({
    cookieName: "csrf-token-lgu-officer",
    skipPaths: ["/api/lgu-officer/csrf-token"],
    disabled: csrfDisabled,
  }),
);

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

// Health check endpoint
app.get("/api/health", async (req, res) => {
  let ipfsStatus = "not_configured";
  try {
    const ipfsService = require("./lib/ipfsService");
    if (ipfsService.isAvailable()) {
      ipfsStatus = "connected";
    } else {
      ipfsStatus = "unavailable";
    }
  } catch {
    ipfsStatus = "error";
  }
  res.json({
    service: "business-service",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ipfs: ipfsStatus,
  });
});

// Serve static uploads (business registration documents)
// Uploads are stored at: backend/services/business-service/../../../uploads/business-registration
// Which resolves to: backend/uploads/business-registration
// But we need to serve from the parent uploads directory to match the URL structure
const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
app.use("/uploads", express.static(uploadsDir));

// Business routes - Phase 1: Use feature aggregators
const businessRouter = require("./routes/business");
app.use("/api/business", businessRouter);

// Admin routes - Phase 1: Use feature aggregators
const adminRouter = require("./routes/admin");
app.use("/api/business/admin", sensitiveOperationRateLimit(), adminRouter);

// LGU Officer routes - Phase 1: Use feature aggregators
const lguOfficerRouter = require("./routes/lgu-officer");
app.use("/api/lgu-officer", lguOfficerRouter);

// Public routes - Phase 1: Use feature aggregators
const publicRouter = require("./routes/public");
app.use("/api/public/business", publicRouter);

// Global Error Handler (must be last middleware)
app.use(errorHandlerMiddleware);

const PORT = Number(process.env.BUSINESS_SERVICE_PORT || 3002);
let shutdownHooksRegistered = false;

async function start() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    "";
  logger.info("Business Service starting", {
    mongoUri: uri ? "<set>" : "<not-set>",
  });

  // START SERVER EARLY - create server first for socket.io attachment
  const server = http.createServer(app);

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      logger.error(`Business Service port ${PORT} is already in use.`);
      logger.error(
        "Resolve by stopping the conflicting process/container or set BUSINESS_SERVICE_PORT to a free port.",
      );
      if (process.env.NODE_ENV !== "production") {
        logger.error(
          "If you started Docker with ./start.sh, do not run backend/services npm run dev at the same time.",
        );
      }
    } else {
      logger.error("Business Service server error", { error: err });
    }
    process.exit(1);
  });

  // Initialize Socket.io for realtime updates (can work without DB)
  try {
    const { initializeSocket } = require("../../../shared/lib/socketService");
    const { Server: SocketIOServer } = require("socket.io");
    const jwtModule = require("jsonwebtoken");
    initializeSocket(server, { SocketIO: SocketIOServer, jwt: jwtModule });
    logger.info("Socket.io initialized for realtime updates");
  } catch (err) {
    logger.warn("Socket.io initialization failed (non-critical)", {
      error: err.message,
    });
  }

  // Start listening IMMEDIATELY - don't wait for DB connection
  server.listen(PORT, () => {
    logger.info(
      `Business Service listening on http://localhost:${PORT} (DB connecting...)`,
    );
    logger.info("AI LOB recommendation config", {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      lobModelServiceUrl: process.env.LOB_MODEL_SERVICE_URL
        ? "(set)"
        : "(not set)",
    });
  });

  if (!shutdownHooksRegistered) {
    shutdownHooksRegistered = true;
    const shutdown = (signal) => {
      logger.info(`Business Service received ${signal}, shutting down...`);
      server.close(async () => {
        try {
          if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
          }
        } catch (err) {
          logger.warn("Error during mongoose disconnect on shutdown", {
            error: err.message,
          });
        }
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 5000).unref();
    };
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  }

  // Connect to DB in background
  try {
    await connectDB(uri);
    dbReady = true;
    logger.info("Business Service database ready");

    // Seed fees if empty (idempotent). Runs when SEED_FEE_CONFIGURATION=true (Docker) or in non-production.
    const shouldSeedFeeConfig =
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_FEE_CONFIGURATION === "true" ||
        process.env.NODE_ENV !== "production");
    if (shouldSeedFeeConfig) {
      const maxSeedRetries = 5;
      const seedRetryDelayMs = 3000;
      for (let attempt = 1; attempt <= maxSeedRetries; attempt++) {
        try {
          const { seedIfEmpty } = require("./seed/seedFees");
          const result = await seedIfEmpty();
          if (result.seeded) {
            logger.info("Fees seeded", { count: result.count });
          }
          break;
        } catch (error) {
          logger.warn(`Fees seed attempt ${attempt}/${maxSeedRetries} failed`, {
            error: error.message,
          });
          if (attempt === maxSeedRetries) {
            logger.warn("Fees seed failed after retries", {
              error: error.message,
            });
          } else {
            await new Promise((r) => setTimeout(r, seedRetryDelayMs));
          }
        }
      }
    }

    // Seed LOB training examples (idempotent — only inserts when empty)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedIfEmpty: seedLobExamples,
        } = require("./seed/seedLobTrainingExamples");
        const lobResult = await seedLobExamples();
        if (lobResult.seeded) {
          logger.info("LOB training examples seeded", {
            count: lobResult.count,
          });
        } else if (lobResult.skipped === "dataset_not_found") {
          logger.info("LOB training examples skip: dataset file not found", {
            triedPaths: lobResult.triedPaths || [],
            hint: "In Docker ensure volume ./ai/datasets:/backend/ai/datasets is mounted and restart the container (docker-compose up -d --force-recreate business-service)",
          });
        }
      } catch (error) {
        logger.warn("LOB training examples seed failed", {
          error: error.message,
        });
      }
    }

    // Seed requirements if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedIfEmpty: seedClaimableDocuments,
        } = require("./seed/seedClaimableDocumentsClean");
        const reqResult = await seedClaimableDocuments();
        if (reqResult.seeded) {
          logger.info("Documents seeded");
        }
      } catch (error) {
        logger.warn("Documents seed failed", {
          error: error.message,
        });
      }
    }

    // Seed variables if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const { seedIfEmpty: seedVariables } = require("./seed/seedVariables");
        logger.info("Running variables seed");
        const varResult = await seedVariables();
        logger.info("Variables seed result", varResult);
        if (varResult.seeded) {
          logger.info("Variables seeded", { count: varResult.count });
        } else {
          logger.info("Variables already exist", {
            variableCount: varResult.variableCount,
          });
        }
      } catch (error) {
        logger.warn("Variables seed failed", {
          error: error.message,
        });
      }
    }

    // Seed tax brackets if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedIfEmpty: seedTaxBrackets,
        } = require("./seed/seedTaxBrackets");
        logger.info("Running tax brackets seed");
        const taxResult = await seedTaxBrackets();
        logger.info("Tax brackets seed result", taxResult);
        if (taxResult.seeded) {
          logger.info("Tax brackets seeded", { count: taxResult.count });
        } else {
          logger.info("Tax brackets already exist", {
            bracketCount: taxResult.bracketCount,
          });
        }
      } catch (error) {
        logger.warn("Tax brackets seed failed", {
          error: error.message,
        });
      }
    }

    // Seed LOBs if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const { seedIfEmpty: seedLobs } = require("./seed/seedLobs");
        logger.info("Running LOBs seed");
        const lobResult = await seedLobs();
        logger.info("LOBs seed result", lobResult);
        if (lobResult.seeded) {
          logger.info("LOBs seeded", {
            count: lobResult.count,
            updated: lobResult.updated,
          });
        } else {
          logger.info("LOBs already exist", { lobCount: lobResult.feeCount });
        }
      } catch (error) {
        logger.warn("LOBs seed failed", {
          error: error.message,
        });
      }
    }

    // Seed PostRequirements if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedIfEmpty: seedPostRequirements,
        } = require("./seed/seedPostRequirements");
        logger.info("Running PostRequirements seed");
        const prResult = await seedPostRequirements();
        logger.info("PostRequirements seed result", prResult);
        if (prResult.postRequirementsCreated > 0) {
          logger.info("PostRequirements seeded", {
            postRequirementsCreated: prResult.postRequirementsCreated,
            lobsUpdated: prResult.lobsUpdated,
          });
        } else {
          logger.info("PostRequirements already exist");
        }
      } catch (error) {
        logger.warn("PostRequirements seed failed", {
          error: error.message,
        });
      }
    }

    // Seed Violations if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedIfEmpty: seedViolations,
        } = require("./seed/seedViolations");
        logger.info("Running Violations seed");
        const vioResult = await seedViolations();
        logger.info("Violations seed result", vioResult);
        if (vioResult.seeded) {
          logger.info("Violations seeded", {
            count: vioResult.count,
            feesCreated: vioResult.feesCreated,
          });
        } else {
          logger.info("Violations already exist", {
            violationCount: vioResult.violationCount,
          });
        }
      } catch (error) {
        logger.warn("Violations seed failed", {
          error: error.message,
        });
      }
    }

    // Seed PostRequirementViolations if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedPostRequirementViolations,
        } = require("./seed/seedPostRequirementViolations");
        logger.info("Running PostRequirementViolations seed");
        const prvResult = await seedPostRequirementViolations();
        logger.info("PostRequirementViolations seed result", prvResult);
        if (prvResult.createdCount > 0) {
          logger.info("PostRequirementViolations seeded", {
            createdCount: prvResult.createdCount,
            feesCreated: prvResult.feesCreated,
          });
        } else {
          logger.info("PostRequirementViolations already exist");
        }
      } catch (error) {
        logger.warn("PostRequirementViolations seed failed", {
          error: error.message,
        });
      }
    }

    // Seed PostRequirementInspectionItems if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedPostRequirementInspectionItems,
        } = require("./seed/seedPostRequirementInspectionItems");
        logger.info("Running PostRequirementInspectionItems seed");
        const priResult = await seedPostRequirementInspectionItems();
        logger.info("PostRequirementInspectionItems seed result", priResult);
        if (priResult.createdCount > 0) {
          logger.info("PostRequirementInspectionItems seeded", {
            createdCount: priResult.createdCount,
          });
        } else {
          logger.info("PostRequirementInspectionItems already exist");
        }
      } catch (error) {
        logger.warn("PostRequirementInspectionItems seed failed", {
          error: error.message,
        });
      }
    }

    // Seed PostRequirementChecklists if empty (idempotent)
    if (shouldSeedFeeConfig) {
      try {
        const {
          seedPostRequirementChecklists,
        } = require("./seed/seedPostRequirementChecklists");
        logger.info("Running PostRequirementChecklists seed");
        const prcResult = await seedPostRequirementChecklists();
        logger.info("PostRequirementChecklists seed result", prcResult);
        if (prcResult.createdCount > 0) {
          logger.info("PostRequirementChecklists seeded", {
            createdCount: prcResult.createdCount,
          });
        } else {
          logger.info("PostRequirementChecklists already exist");
        }
      } catch (error) {
        logger.warn("PostRequirementChecklists seed failed", {
          error: error.message,
        });
      }
    }

    // IPFS service is lazy-loaded in routes when needed
    // Don't initialize here to avoid module loading issues
    logger.info("IPFS service will be loaded on-demand in routes");
  } catch (err) {
    logger.error("Business Service DB/init failed (server still running)", {
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
