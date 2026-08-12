const express = require("express");
const respond = require("../middleware/respond");
const logger = require("../lib/logger");
const PermitForm = require("../../../../shared/models/PermitForm");

const router = express.Router();

// GET /api/public/permit-forms - List active permit forms for business owners
router.get("/", async (req, res) => {
  try {
    const forms = await PermitForm.find({ isActive: true })
      .select("formId name description version createdAt updatedAt isActive")
      .sort({ name: 1 })
      .lean();
    respond.success(res, 200, forms);
  } catch (error) {
    logger.error("Error fetching public permit forms:", error);
    respond.error(res, 500, "failed_to_fetch", "Failed to fetch permit forms");
  }
});

// GET /api/public/permit-forms/grouped - Get permit forms grouped by type
// Must come before /:id to avoid route matching conflicts
router.get("/grouped", async (req, res) => {
  try {
    const allForms = await PermitForm.find()
      .select(
        "formId name description formType category isActive createdAt updatedAt",
      )
      .sort({ name: 1 })
      .lean();

    // Group forms by type
    const regularPermit = allForms.find(
      (f) => f.formType === "regular" || f.formId === "unified-business-permit",
    );
    const temporaryPermitForms = allForms.filter(
      (f) => f.formType === "temporary",
    );

    // Build temporary permit structure
    let temporaryPermit = null;
    if (temporaryPermitForms.length > 0) {
      // Create parent temporary permit entry
      temporaryPermit = {
        parent: {
          formId: "temporary-permit",
          name: "Temporary Permit",
          description: "For short-term, seasonal, or special event operations",
          isActive: temporaryPermitForms.some((f) => f.isActive),
        },
        categories: temporaryPermitForms.map((form) => ({
          formId: form.formId,
          name: form.name,
          description: form.description,
          category: form.category,
          isActive: form.isActive,
        })),
      };
    }

    const result = {
      regularPermit: regularPermit || null,
      temporaryPermit: temporaryPermit,
    };

    respond.success(res, 200, result);
  } catch (error) {
    logger.error("Error fetching grouped permit forms:", error);
    respond.error(
      res,
      500,
      "fetch_failed",
      "Failed to fetch grouped permit forms",
    );
  }
});

// GET /api/public/permit-forms/by-formId/:formId - Get single active permit form by formId
// Must come before /:id to avoid route matching conflicts
router.get("/by-formId/:formId", async (req, res) => {
  try {
    const form = await PermitForm.findOne({
      formId: req.params.formId,
      isActive: true,
    }).lean();

    if (!form) {
      return respond.error(
        res,
        404,
        "not_found",
        "Permit form not found or inactive",
      );
    }

    respond.success(res, 200, form);
  } catch (error) {
    logger.error("Error fetching public permit form by formId:", error);
    respond.error(res, 500, "fetch_failed", "Failed to fetch permit form");
  }
});

// GET /api/public/permit-forms/:id - Get single active permit form
router.get("/:id", async (req, res) => {
  try {
    const form = await PermitForm.findOne({
      _id: req.params.id,
      isActive: true,
    }).lean();

    if (!form) {
      return respond.error(
        res,
        404,
        "not_found",
        "Permit form not found or inactive",
      );
    }

    respond.success(res, 200, form);
  } catch (error) {
    logger.error("Error fetching public permit form:", error);
    respond.error(res, 500, "fetch_failed", "Failed to fetch permit form");
  }
});

module.exports = router;
