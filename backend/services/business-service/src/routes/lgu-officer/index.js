const express = require("express");
const router = express.Router();

const businessesRouter = require("./businesses.routes");
const permitApplicationsRouter = require("./permitApplications.routes");
const walkInApplicationsRouter = require("./walkInApplications.routes");

// Mount routes at their specific paths (matching original index.js)
router.use(businessesRouter);
router.use(permitApplicationsRouter);
router.use(walkInApplicationsRouter);

module.exports = router;
