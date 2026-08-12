const express = require("express");
const {
  requireJwt,
  requireRole,
} = require("../../middleware/auth");
const nameValidationController = require("../../controllers/admin/nameValidation.controller");

const router = express.Router();

// GET /api/business/admin/validate-name - validate name across entity types
router.get(
  "/",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => nameValidationController.validateName(req, res)
);

module.exports = router;
