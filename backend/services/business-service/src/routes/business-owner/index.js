const express = require("express");
const router = express.Router();

const profileRouter = require("./profile.routes");
const applicationsRouter = require("./applications.routes");
const appealsRouter = require("./appeals.routes");
const paymentsRouter = require("./payments.routes");
const applicationFeesRouter = require("./applicationFees.routes");

// Mount routes at their specific paths (matching original index.js)
router.use(profileRouter); // profile was mounted at /api/business directly
router.use(applicationsRouter); // applicationsRouter already has /applications prefix
router.use(appealsRouter);
router.use(paymentsRouter);
router.use("/application-fees", applicationFeesRouter);

module.exports = router;
