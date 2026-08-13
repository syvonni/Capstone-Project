const express = require("express");
const router = express.Router();

const businessesRouter = require("./businesses.routes");
const permitApplicationsRouter = require("./permitApplications.routes");
const walkInApplicationsRouter = require("./walkInApplications.routes");
const paymentsRouter = require("./payments.routes");

// Mount routes at their specific paths (matching original index.js)
router.use(businessesRouter);
router.use(permitApplicationsRouter);
router.use(walkInApplicationsRouter);
router.use(paymentsRouter);

module.exports = router;
