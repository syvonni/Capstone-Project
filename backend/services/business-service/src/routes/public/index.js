const express = require("express");
const router = express.Router();

const statsRouter = require("./stats.routes");

// Mount routes at their specific paths (matching original index.js)
router.use(statsRouter);

module.exports = router;
