const express = require('express');
const router = express.Router();

const businessesRouter = require('./businesses.routes');
const permitApplicationsRouter = require('./permitApplications.routes');

// Mount routes at their specific paths (matching original index.js)
router.use(businessesRouter);
router.use(permitApplicationsRouter);

module.exports = router;
