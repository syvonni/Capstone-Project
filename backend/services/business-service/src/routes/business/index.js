const express = require('express');
const router = express.Router();

const profileRouter = require('./profile.routes');
const applicationsRouter = require('./applications.routes');
const { router: appealsRouter } = require('./appeals.routes');
const editRequestsRouter = require('./editRequests.routes');
const paymentsRouter = require('./payments.routes');
const feesRouter = require('./fees.routes');

// Mount routes at their specific paths (matching original index.js)
router.use(profileRouter); // profile was mounted at /api/business directly
router.use('/applications', applicationsRouter);
router.use('/appeals', appealsRouter);
router.use('/edit-requests', editRequestsRouter);
router.use('/payments', paymentsRouter);
router.use('/fees', feesRouter);

module.exports = router;
