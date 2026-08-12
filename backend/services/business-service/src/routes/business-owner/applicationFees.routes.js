const express = require("express");
const { requireJwt } = require("../../middleware/auth");
const applicationFeeController = require("../../controllers/business-owner/applicationFee.controller");
const router = express.Router();

// GET /api/business/application-fees/by-permit-form/:formId - Get application fee for a specific permit form
router.get("/by-permit-form/:formId", requireJwt, (req, res) => applicationFeeController.getFeeByPermitForm(req, res));

module.exports = router;
