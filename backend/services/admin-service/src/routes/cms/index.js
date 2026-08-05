const express = require("express");
const { requireJwt } = require("../../middleware/auth");
const {
  getFaqBySlotId,
  listFaqs,
  updateFaq,
  getInstructionBySlotId,
  listInstructions,
  getInstructionBySlotIdAdmin,
  updateInstruction,
  getPageBySlotId,
  listPages,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  updateLegacyPage,
} = require("../../services/cmsService");
const { getCmsAuditLogs } = require("../../services/cmsAuditService");

// ─── Public router (mounted at /api/cms) ────────────────────────────────────────
const publicRouter = express.Router();

// GET /api/cms/faq/:slotId — public fetch of FAQ section
publicRouter.get("/faq/:slotId", async (req, res) => {
  try {
    const result = await getFaqBySlotId(req.params.slotId);
    if (!result)
      return res.status(404).json({ error: "FAQ section not found" });
    return res.json(result);
  } catch (err) {
    console.error("GET /api/cms/faq/:slotId failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cms/instructions/:slotId — public fetch of instruction content
publicRouter.get("/instructions/:slotId", async (req, res) => {
  try {
    const result = await getInstructionBySlotId(req.params.slotId);
    if (!result)
      return res.status(404).json({ error: "Instruction content not found" });
    return res.json(result);
  } catch (err) {
    console.error("GET /api/cms/instructions/:slotId failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cms/pages/:slotId — public fetch of page content (chapter-based)
publicRouter.get("/pages/:slotId", async (req, res) => {
  try {
    const result = await getPageBySlotId(req.params.slotId);
    if (!result)
      return res.status(404).json({ error: "Page content not found" });
    return res.json(result);
  } catch (err) {
    console.error("GET /api/cms/pages/:slotId failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin router (mounted at /api/admin/cms) ──────────────────────────────────
const adminRouter = express.Router();

// GET /api/admin/cms/faq — list all FAQ sections
adminRouter.get("/faq", requireJwt, async (req, res) => {
  try {
    const result = await listFaqs();
    return res.json(result);
  } catch (err) {
    console.error("GET /api/admin/cms/faq failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/cms/faq/:slotId — update FAQ section items (edit only, no create/delete slots)
adminRouter.put("/faq/:slotId", requireJwt, async (req, res) => {
  try {
    const { items, subtitle } = req.body;
    const { publish = false } = req.query;
    const result = await updateFaq(
      req.params.slotId,
      items,
      subtitle,
      publish === "true",
      req._userId,
    );
    return res.json(result);
  } catch (err) {
    console.error("PUT /api/admin/cms/faq/:slotId failed", err);
    if (err.message === "items must be an array") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "FAQ section not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Each item must have a question and answer") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/cms/instructions — list all instruction slots
adminRouter.get("/instructions", requireJwt, async (req, res) => {
  try {
    const result = await listInstructions();
    return res.json(result);
  } catch (err) {
    console.error("GET /api/admin/cms/instructions failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/cms/instructions/:slotId — fetch single instruction by slotId
adminRouter.get("/instructions/:slotId", requireJwt, async (req, res) => {
  try {
    const result = await getInstructionBySlotIdAdmin(req.params.slotId);
    if (!result)
      return res.status(404).json({ error: "Instruction content not found" });
    return res.json(result);
  } catch (err) {
    console.error("GET /api/admin/cms/instructions/:slotId failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/cms/instructions/:slotId — update instruction content (edit only)
adminRouter.put("/instructions/:slotId", requireJwt, async (req, res) => {
  try {
    const { description, bulletPoints, faqItems } = req.body;
    const { publish = false } = req.query;
    const result = await updateInstruction(
      req.params.slotId,
      description,
      bulletPoints,
      faqItems,
      publish === "true",
      req._userId,
    );
    return res.json(result);
  } catch (err) {
    console.error("PUT /api/admin/cms/instructions/:slotId failed", err);
    if (
      err.message === "bulletPoints must be an array" ||
      err.message === "faqItems must be an array"
    ) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Instruction content not found") {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/cms/pages — list chapters (query: ?pageSlotId=privacy-policy)
adminRouter.get("/pages", requireJwt, async (req, res) => {
  try {
    const { pageSlotId } = req.query;
    const result = await listPages(pageSlotId);
    return res.json(result);
  } catch (err) {
    console.error("GET /api/admin/cms/pages failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/cms/pages — create a new chapter
adminRouter.post("/pages", requireJwt, async (req, res) => {
  try {
    const { pageSlotId, title, description } = req.body;
    const result = await createChapter(
      pageSlotId,
      title,
      description,
      req._userId,
    );
    return res.status(201).json(result);
  } catch (err) {
    console.error("POST /api/admin/cms/pages failed", err);
    if (
      err.message === "Invalid pageSlotId" ||
      err.message === "Title is required"
    ) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/cms/pages/:id — update a chapter
adminRouter.put("/pages/:id", requireJwt, async (req, res) => {
  try {
    const { title, description, introText, sections } = req.body;
    const { publish = false } = req.query;
    const result = await updateChapter(
      req.params.id,
      title,
      description,
      introText,
      sections,
      publish === "true",
      req._userId,
    );
    return res.json(result);
  } catch (err) {
    console.error("PUT /api/admin/cms/pages/:id failed", err);
    if (err.message === "sections must be an array") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Chapter not found") {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/cms/pages/:id — delete a chapter
adminRouter.delete("/pages/:id", requireJwt, async (req, res) => {
  try {
    const result = await deleteChapter(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("DELETE /api/admin/cms/pages/:id failed", err);
    if (err.message === "Chapter not found") {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/cms/pages/reorder — reorder chapters
adminRouter.patch("/pages/reorder", requireJwt, async (req, res) => {
  try {
    const { pageSlotId, orderedIds } = req.body;
    const result = await reorderChapters(pageSlotId, orderedIds);
    return res.json(result);
  } catch (err) {
    console.error("PATCH /api/admin/cms/pages/reorder failed", err);
    if (
      err.message === "Invalid pageSlotId" ||
      err.message === "orderedIds must be an array"
    ) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Legacy: PUT /api/admin/cms/pages/legacy/:slotId — update old PageContent (kept for migration)
adminRouter.put("/pages/legacy/:slotId", requireJwt, async (req, res) => {
  try {
    const { introText, sections } = req.body;
    const { publish = false } = req.query;
    const result = await updateLegacyPage(
      req.params.slotId,
      introText,
      sections,
      publish === "true",
      req._userId,
    );
    return res.json(result);
  } catch (err) {
    console.error("PUT /api/admin/cms/pages/legacy/:slotId failed", err);
    if (err.message === "sections must be an array") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Page content not found") {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/cms/audit/:slotId — fetch audit logs for a specific CMS slot
adminRouter.get("/audit/:slotId", requireJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getCmsAuditLogs(req.params.slotId, page, limit);
    return res.json(result);
  } catch (err) {
    console.error("GET /api/admin/cms/audit/:slotId failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { publicRouter, adminRouter };
