const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
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
const errorHandlerMiddleware = require("./middleware/errorHandler");
const http = require("http");
const mongoose = require("mongoose");

dotenv.config();
// Load .env from project root when running from backend/services/admin-service (so MONGO_URI etc. are found)
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

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

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
  logger.warn("Session middleware not available", { error: err });
}

// CSRF (IAS-2.7): token endpoint and middleware for /api/admin
const csrfDisabled =
  process.env.DISABLE_CSRF === "true" || process.env.NODE_ENV === "test";
const {
  createCsrfMiddleware,
  getCsrfTokenHandler,
} = require("../../../shared/csrf");
app.get(
  "/api/admin/csrf-token",
  getCsrfTokenHandler({ cookieName: "csrf-token-admin", sameSite: "lax" }),
);
app.get(
  "/api/lgu-officer/csrf-token",
  getCsrfTokenHandler({
    cookieName: "csrf-token-lgu-officer",
    sameSite: "lax",
  }),
);
app.use(
  "/api/admin",
  createCsrfMiddleware({
    cookieName: "csrf-token-admin",
    skipPaths: ["/api/admin/csrf-token"],
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
app.get("/api/health", (req, res) => {
  res.json({
    service: "admin-service",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Load models to ensure they're registered with mongoose
require("./models/Role");
require("./models/User");
require("./models/LGU");
require("./models/FormGroup");
require("./models/PenaltyConfiguration");
require("./models/Notification");
require("./models/ApplicationProcess");
require("../../../shared/models/PermitForm");

// Admin routes
const adminRouter = require("./routes/approvals");
const maintenanceRouter = require("./routes/maintenance");
const lgusRouter = require("./routes/lgus");
const penaltyConfigRouter = require("./routes/penaltyConfiguration");
const generalPermitConfigRouter = require("./routes/generalPermitConfig");
const permitFormsRouter = require("./routes/permitForms");
const publicPermitFormsRouter = require("./routes/publicPermitForms");

app.use("/api/admin", adminRouter);
app.use("/api/admin/mgus", lgusRouter);
app.use("/api/admin/permit-forms", permitFormsRouter);
app.use("/api/admin/penalty-configuration", penaltyConfigRouter);
app.use("/api/admin/general-permit-config", generalPermitConfigRouter);
// Public maintenance status endpoint (for frontend to check)
app.use("/api/maintenance", maintenanceRouter);
// Public LGU endpoints
app.use("/api/lgus", lgusRouter);
// Public permit forms endpoints
app.use("/api/public/permit-forms", publicPermitFormsRouter);
const announcementsRouter = require("./routes/announcements");
app.use("/api/admin/announcements", announcementsRouter);
const applicationProcessesRouter = require("./routes/applicationProcesses");
app.use("/api/admin/application-processes", applicationProcessesRouter);
const publicApplicationProcessesRouter = require("./routes/publicApplicationProcesses");
app.use("/api/public/application-processes", publicApplicationProcessesRouter);
const {
  publicRouter: cmsPublicRouter,
  adminRouter: cmsAdminRouter,
} = require("./routes/cms");
app.use("/api/cms", cmsPublicRouter);
app.use("/api/admin/cms", cmsAdminRouter);

// Staff personal activity endpoint
const { auditClient } = require("../../../shared/lib/httpClient");
const {
  requireJwt: requireJwtForActivity,
  requireRole: requireRoleForActivity,
} = require("./middleware/auth");
const respondActivity = require("./middleware/respond");
app.get(
  "/api/admin/my-activity",
  requireJwtForActivity,
  requireRoleForActivity(["staff", "lgu_officer", "inspector", "admin"]),
  async (req, res) => {
    try {
      const period = req.query.period || "month";
      const userId = req.user?._id || req._userId;
      const dateFilter =
        period === "week"
          ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          : period === "month"
            ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            : null;

      // Query audit-service for logs
      const params = {
        userId,
        limit: 100,
        sort: "createdAt:-1",
      };

      if (dateFilter) {
        params.startDate = dateFilter.toISOString();
      }

      const response = await auditClient.get(`/api/audit/logs`, {
        params,
      });

      const auditLogs = response.logs || [];
      const approved = auditLogs.filter((l) =>
        (l.eventType || l.action || "").includes("approved"),
      ).length;
      const rejected = auditLogs.filter((l) =>
        (l.eventType || l.action || "").includes("rejected"),
      ).length;
      const totalReviews = auditLogs.filter(
        (l) =>
          (l.eventType || l.action || "").includes("review") ||
          (l.eventType || l.action || "").includes("approved") ||
          (l.eventType || l.action || "").includes("rejected"),
      ).length;

      return respondActivity.success(res, 200, {
        totalReviews,
        approved,
        rejected,
        pending: Math.max(0, totalReviews - approved - rejected),
        recentActivity: auditLogs.slice(0, 20),
      });
    } catch (err) {
      console.error("GET /api/admin/my-activity error:", err);
      return respondActivity.error(
        res,
        500,
        "activity_error",
        "Failed to fetch activity",
      );
    }
  },
);

// Serve static uploads (form templates, etc.)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Notification routes (shared across all services)
// Use auth service routes since notifications are user-specific
// In microservices mode, /api/notifications routes to auth service (port 3001)
// This is handled by vite.config.js proxy configuration

// Global Error Handler (must be last middleware)
app.use(errorHandlerMiddleware);

const PORT = Number(process.env.ADMIN_SERVICE_PORT || 3003);

async function start() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    "";
  logger.info("Admin Service starting", {
    mongoUri: uri ? "<set>" : "<not-set>",
  });

  // START SERVER IMMEDIATELY - don't wait for DB connection
  // This prevents proxy timeouts when backend is slow to connect to DB
  const server = http.createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(
      `Admin Service listening on http://0.0.0.0:${PORT} (DB connecting...)`,
    );
  });

  // Connect to DB in background
  try {
    await connectDB(uri);
    dbReady = true;
    logger.info("Admin Service database ready");

    // Seed form definitions if empty (idempotent)
    // Runs when SEED_FORM_DEFINITIONS=true (Docker) or in non-test dev
    const shouldSeed =
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_FORM_DEFINITIONS === "true" ||
        process.env.NODE_ENV !== "production");

    // FormDefinition seeding removed - FormDefinition has been deleted

    // Seed permit forms if empty (idempotent)
    // Runs when SEED_PERMIT_FORMS=true (Docker) or in non-test dev
    const shouldSeedPermitForms =
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_PERMIT_FORMS === "true" ||
        process.env.NODE_ENV !== "production");

    if (shouldSeedPermitForms) {
      try {
        const { seedPermitFormsIfEmpty } = require("./seed/seedPermitForms");
        const result = await seedPermitFormsIfEmpty();
        if (result.seeded) {
          logger.info("Permit forms seeded", {
            created: result.created,
            updated: result.updated,
          });
        }
      } catch (error) {
        logger.warn("Permit forms seed failed", { error: error.message });
      }
    }

    // Seed approval requests when SEED_APPROVAL_REQUESTS or SEED_DEV is set (idempotent)
    if (
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_APPROVAL_REQUESTS === "true" ||
        process.env.SEED_DEV === "true")
    ) {
      try {
        const {
          seedApprovalRequestsIfEmpty,
        } = require("./seed/seedApprovalRequests");
        const result = await seedApprovalRequestsIfEmpty();
        if (result.seeded) {
          logger.info("Approval requests seeded", { created: result.created });
        }
      } catch (error) {
        logger.warn("Approval requests seed failed", { error: error.message });
      }
    }

    // Seed audit logs for dashboard "Recent admin activity" when SEED_DEV is set (idempotent)
    // DISABLED: Prevents fake audit events from contributing to noise
    // if (process.env.NODE_ENV !== "test" && process.env.SEED_DEV === "true") {
    //   try {
    //     const { seedAuditLogsIfEmpty } = require("./seed/seedAuditLogs");
    //     const result = await seedAuditLogsIfEmpty();
    //     if (result.seeded) {
    //       logger.info("Audit logs seeded", { created: result.created });
    //     }
    //   } catch (error) {
    //     logger.warn("Audit logs seed failed", { error: error.message });
    //   }
    // }

    // Seed announcements for landing page when SEED_ANNOUNCEMENTS or SEED_DEV is set (idempotent)
    if (
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_ANNOUNCEMENTS === "true" ||
        process.env.SEED_DEV === "true")
    ) {
      const maxSeedRetries = 5;
      const seedRetryDelayMs = 3000;
      for (let attempt = 1; attempt <= maxSeedRetries; attempt++) {
        try {
          const {
            seedAnnouncementsIfEmpty,
          } = require("./seed/seedAnnouncements");
          const result = await seedAnnouncementsIfEmpty();
          if (result.seeded) {
            logger.info("Announcements seeded", { created: result.created });
            break;
          } else if (
            result.reason === "missing admin role" ||
            result.reason === "missing admin user"
          ) {
            // Retry if admin user/role not ready yet (race condition with auth-service)
            logger.warn(
              `Announcements seed attempt ${attempt}/${maxSeedRetries} failed: ${result.reason}`,
            );
            if (attempt === maxSeedRetries) {
              logger.warn("Announcements seed failed after retries", {
                reason: result.reason,
              });
            } else {
              await new Promise((r) => setTimeout(r, seedRetryDelayMs));
            }
          } else {
            // Don't retry for other reasons (e.g., already has documents)
            logger.info("Announcements seed skipped", {
              reason: result.reason,
            });
            break;
          }
        } catch (error) {
          logger.warn(
            `Announcements seed attempt ${attempt}/${maxSeedRetries} failed with error`,
            { error: error.message },
          );
          if (attempt === maxSeedRetries) {
            logger.warn("Announcements seed failed after retries", {
              error: error.message,
            });
          } else {
            await new Promise((r) => setTimeout(r, seedRetryDelayMs));
          }
        }
      }
    }

    // Seed application processes when SEED_APPLICATION_PROCESSES or SEED_DEV is set (idempotent)
    if (
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_APPLICATION_PROCESSES === "true" ||
        process.env.SEED_DEV === "true")
    ) {
      try {
        const {
          seedApplicationProcessesIfEmpty,
        } = require("./seed/seedApplicationProcesses");
        const result = await seedApplicationProcessesIfEmpty();
        if (result.seeded) {
          logger.info("Application processes seeded", {
            created: result.created,
          });
        }
      } catch (error) {
        logger.warn("Application processes seed failed", {
          error: error.message,
        });
      }
    }

    // Seed CMS content (FAQ sections + Instructions) when SEED_CMS or SEED_DEV is set (idempotent)
    if (
      process.env.NODE_ENV !== "test" &&
      (process.env.SEED_CMS === "true" || process.env.SEED_DEV === "true")
    ) {
      try {
        const { seedCmsContentIfEmpty } = require("./seed/seedCmsContent");
        const result = await seedCmsContentIfEmpty();
        if (result.faq?.seeded)
          logger.info("CMS FAQ sections seeded", {
            created: result.faq.created,
          });
        if (result.instructions?.seeded)
          logger.info("CMS instructions seeded", {
            created: result.instructions.created,
          });
        if (result.pages?.seeded)
          logger.info("CMS page content seeded", {
            created: result.pages.created,
          });
      } catch (error) {
        logger.warn("CMS content seed failed", { error: error.message });
      }
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
    logger.error("Admin Service DB/seed failed (server still running)", {
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
