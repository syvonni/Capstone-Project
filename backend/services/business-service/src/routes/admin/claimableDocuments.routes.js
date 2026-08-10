const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../../middleware/auth");
const claimableDocumentController = require("../../controllers/admin/claimableDocument.controller");

const router = express.Router();

// GET /api/business/admin/documents — list all documents (excluding drafts)
router.get("/", requireJwt, (req, res) => claimableDocumentController.list(req, res));

// GET /api/business/admin/documents/:id — get single document (or draft)
router.get("/:id", requireJwt, (req, res) => claimableDocumentController.getById(req, res));

// GET /api/business/admin/documents/:id/audit — get audit history for a document
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => claimableDocumentController.getAuditHistory(req, res),
);

// GET /api/business/admin/documents/:id/draft — get draft for a document
router.get("/:id/draft", requireJwt, (req, res) => claimableDocumentController.getDraft(req, res));

// POST /api/business/admin/documents/:id/draft — create or update draft
router.post(
  "/:id/draft",
  requireJwt,
  requireRole(["admin"]),
  (req, res) => claimableDocumentController.saveDraft(req, res),
);

// POST /api/business/admin/documents/:id/publish — publish draft to original document
router.post(
  "/:id/publish",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => claimableDocumentController.publishDraft(req, res),
);

// POST /api/business/admin/documents — create document
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => claimableDocumentController.create(req, res),
);

// PUT /api/business/admin/documents/:id — update document (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), requireAdminStepUp, (req, res) => claimableDocumentController.update(req, res));

// DELETE /api/business/admin/documents/:id — soft-disable document
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  (req, res) => claimableDocumentController.disable(req, res),
);

module.exports = router;
