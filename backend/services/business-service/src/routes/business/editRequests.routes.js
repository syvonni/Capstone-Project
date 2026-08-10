const express = require("express");
const { requireJwt, requireRole } = require("../../middleware/auth");
const editRequestController = require("../../controllers/business/editRequest.controller");
const router = express.Router();

// GET /api/business/edit-requests
router.get("/", requireJwt, (req, res) => editRequestController.list(req, res));

// POST /api/business/edit-requests — submit
router.post("/", requireJwt, (req, res) => editRequestController.create(req, res));

// PUT /api/business/edit-requests/:id — approve / reject (officer)
router.put(
  "/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  (req, res) => editRequestController.update(req, res),
);

// PUT /api/business/edit-requests/:id/claim
router.put(
  "/:id/claim",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  (req, res) => editRequestController.claim(req, res),
);

// PUT /api/business/edit-requests/:id/release
router.put(
  "/:id/release",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  (req, res) => editRequestController.release(req, res),
);

// PUT /api/business/edit-requests/:id/transfer
router.put(
  "/:id/transfer",
  requireJwt,
  requireRole(["lgu_officer", "staff", "admin"]),
  (req, res) => editRequestController.transfer(req, res),
);

module.exports = router;
