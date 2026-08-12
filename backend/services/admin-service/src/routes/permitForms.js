const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const respond = require("../middleware/respond");
const logger = require("../lib/logger");
const { logAuditEvent } = require("../lib/auditClient");
const PermitForm = require("../../../../shared/models/PermitForm");
const Fee = require("../../../../shared/models/Fee");
const ClaimableDocument = require("../../../../shared/models/ClaimableDocument");
const PermitFormAuditHelper = require("../lib/auditHelpers/permitFormAuditHelper");
const User = require("../models/User");

// Local getUserInfo function using admin-service User model
async function getUserInfo(userId) {
  try {
    const user = await User.findById(userId)
      .select("firstName lastName email")
      .lean();
    const fullName =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.email || userId;
    return {
      name: fullName,
      email: user?.email || null,
    };
  } catch (err) {
    console.error("Failed to fetch user info for audit:", err);
    return {
      name: userId,
      email: null,
    };
  }
}

const router = express.Router();

// Validation schemas
const createPermitFormSchema = Joi.object({
  formId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow("").default(""),
  sections: Joi.array().default([]),
  notes: Joi.string().allow("").default(""),
  isActive: Joi.boolean().default(true),
  applicationFeeAmount: Joi.number().min(0).optional(),
});

const updatePermitFormSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(""),
  sections: Joi.array(),
  notes: Joi.string().allow(""),
  isActive: Joi.boolean(),
});

const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const createTemporaryPermitFormSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("").default(""),
  sections: Joi.array().default([]),
  notes: Joi.string().allow("").default(""),
  isActive: Joi.boolean().default(true),
  applicationFeeAmount: Joi.number().min(0).required(),
});

// GET /api/admin/permit-forms - List all permit forms
router.get("/", requireJwt, requireRole("admin"), async (req, res) => {
  try {
    const forms = await PermitForm.find()
      .sort({ createdAt: -1 })
      .populate("feeId")
      .lean();
    respond.success(res, 200, forms);
  } catch (error) {
    logger.error("Error fetching permit forms:", error);
    respond.error(res, 500, "fetch_failed", "Failed to fetch permit forms");
  }
});

// GET /api/admin/permit-forms/by-formId/:formId - Get single permit form by formId (admin, ignores isActive)
// Must come before /:id to avoid route matching conflicts
router.get(
  "/by-formId/:formId",
  requireJwt,
  requireRole("admin"),
  async (req, res) => {
    try {
      const form = await PermitForm.findOne({
        formId: req.params.formId,
      })
        .populate("feeId")
        .lean();

      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      respond.success(res, 200, form);
    } catch (error) {
      logger.error("Error fetching permit form by formId:", error);
      respond.error(res, 500, "fetch_failed", "Failed to fetch permit form");
    }
  },
);

// GET /api/admin/permit-forms/by-feeId/:feeId - Get permit form by fee ID
router.get(
  "/by-feeId/:feeId",
  requireJwt,
  requireRole("admin"),
  async (req, res) => {
    try {
      const form = await PermitForm.findOne({
        feeId: req.params.feeId,
      }).lean();

      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      respond.success(res, 200, form);
    } catch (error) {
      logger.error("Error fetching permit form by feeId:", error);
      respond.error(res, 500, "fetch_failed", "Failed to fetch permit form");
    }
  },
);

// GET /api/admin/permit-forms/:id/documents - Get claimable documents for a permit form
router.get(
  "/:id/documents",
  requireJwt,
  requireRole("admin"),
  async (req, res) => {
    try {
      const form = await PermitForm.findById(req.params.id)
        .populate("claimableDocumentIds")
        .lean();

      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      if (
        !form.claimableDocumentIds ||
        form.claimableDocumentIds.length === 0
      ) {
        return respond.success(res, 200, []);
      }

      respond.success(res, 200, form.claimableDocumentIds);
    } catch (error) {
      logger.error(
        "Error fetching claimable documents for permit form:",
        error,
      );
      respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch claimable documents",
      );
    }
  },
);

// POST /api/admin/permit-forms - Create permit form (with step-up)
router.post(
  "/",
  requireJwt,
  requireRole("admin"),
  requireAdminStepUp,
  validateBody(createPermitFormSchema),
  async (req, res) => {
    try {
      const {
        formId,
        name,
        description,
        sections,
        notes,
        isActive,
        applicationFeeAmount,
      } = req.body;

      // Check if formId already exists
      const existingForm = await PermitForm.findOne({ formId });
      if (existingForm) {
        return respond.error(
          res,
          400,
          "duplicate_id",
          "Permit form with this ID already exists",
        );
      }

      // Create application fee if amount is provided
      let feeId = null;
      if (applicationFeeAmount && applicationFeeAmount > 0) {
        try {
          const fee = await Fee.create({
            name: `${name} Fee`,
            amount: applicationFeeAmount,
            category: "application_fee",
            isActive: isActive !== undefined ? isActive : true,
          });
          feeId = fee._id;

          // Log audit event for fee creation
          await logAuditEvent(
            "application_fee_created",
            req._userId,
            "fee",
            feeId,
            {
              feeId: feeId,
              name: fee.name,
              amount: fee.amount,
              category: fee.category,
              isActive: fee.isActive,
            },
          ).catch((err) =>
            console.error(
              "Failed to log audit event for application fee creation",
              err,
            ),
          );
        } catch (error) {
          console.error("Failed to create application fee:", error);
          logger.error("Failed to create application fee:", error);
        }
      }

      const form = await PermitForm.create({
        formId,
        name,
        description,
        sections: sections || [],
        version: 1,
        notes: notes || "",
        isActive: isActive !== undefined ? isActive : true,
        feeId,
      });

      // Log audit event using helper
      const userInfo = await getUserInfo(req._userId);
      PermitFormAuditHelper.logCreated(
        req,
        req._userId,
        userInfo,
        form,
        "admin",
      ).catch((err) =>
        console.error("Failed to log audit event for permit form create", err),
      );

      logger.info(`Created permit form: ${formId}`);
      respond.success(res, 201, form);
    } catch (error) {
      logger.error("Error creating permit form:", error);
      respond.error(res, 500, "create_failed", "Failed to create permit form");
    }
  },
);

// PUT /api/admin/permit-forms/:id - Update permit form (with step-up, auto-increment version)
router.put(
  "/:id",
  requireJwt,
  requireRole("admin"),
  requireAdminStepUp,
  validateBody(updatePermitFormSchema),
  async (req, res) => {
    try {
      const { name, description, sections, notes, isActive } = req.body;

      const form = await PermitForm.findById(req.params.id);
      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      // Sync fee status if isActive is changing
      if (isActive !== undefined && isActive !== form.isActive && form.feeId) {
        try {
          await Fee.findByIdAndUpdate(form.feeId, { isActive });
          await logAuditEvent(
            isActive ? "application_fee_updated" : "application_fee_disabled",
            req._userId,
            "fee",
            form.feeId,
            {
              feeId: form.feeId,
              isActive,
              reason: "Synced with permit form status change",
            },
          ).catch((err) =>
            console.error(
              "Failed to log audit event for application fee status sync",
              err,
            ),
          );
        } catch (error) {
          console.error("Failed to sync fee status:", error);
          logger.error("Failed to sync fee status:", error);
        }
      }

      // Check if there are actual changes
      const changes = {};
      if (name !== undefined && name !== form.name) {
        changes.name = { from: form.name, to: name };
      }
      if (description !== undefined && description !== form.description) {
        changes.description = { from: form.description, to: description };
      }
      if (
        sections !== undefined &&
        JSON.stringify(sections) !== JSON.stringify(form.sections)
      ) {
        changes.sections = { from: form.sections, to: sections };
      }
      if (notes !== undefined && notes !== form.notes) {
        changes.notes = { from: form.notes, to: notes };
      }
      if (isActive !== undefined && isActive !== form.isActive) {
        changes.isActive = { from: form.isActive, to: isActive };
      }

      // Only increment version if there are actual changes
      const newVersion =
        Object.keys(changes).length > 0
          ? (form.version || 0) + 1
          : form.version;

      const updatedForm = await PermitForm.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(sections !== undefined && { sections }),
            ...(notes !== undefined && { notes }),
            ...(isActive !== undefined && { isActive }),
            version: newVersion,
            lastUpdated: new Date(),
          },
        },
        { new: true },
      ).lean();

      // Log audit event using helper
      const userInfo = await getUserInfo(req._userId);
      // PermitFormAuditHelper.logUpdated(req, req._userId, userInfo, form, updatedForm, "admin").catch(
      //   (err) => console.error("Failed to log audit event for permit form update", err),
      // );

      // Log version increment if version changed
      if (newVersion !== form.version) {
        // PermitFormAuditHelper.logVersionIncremented(req, req._userId, userInfo, form, form.version, newVersion, "admin").catch(
        //   (err) => console.error("Failed to log audit event for version increment", err),
        // );
      }

      logger.info(
        `Updated permit form: ${form.formId} to version ${newVersion}`,
      );
      respond.success(res, 200, updatedForm);
    } catch (error) {
      logger.error("Error updating permit form:", {
        error: error.message,
        stack: error.stack,
      });
      respond.error(res, 500, "update_failed", "Failed to update permit form");
    }
  },
);

// PATCH /api/admin/permit-forms/:id/status - Update status (with step-up)
router.patch(
  "/:id/status",
  requireJwt,
  requireRole("admin"),
  requireAdminStepUp,
  validateBody(updateStatusSchema),
  async (req, res) => {
    try {
      const { isActive } = req.body;

      const form = await PermitForm.findById(req.params.id);
      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      // Sync fee status if form has a linked fee
      if (form.feeId) {
        try {
          await Fee.findByIdAndUpdate(form.feeId, { isActive });
          await logAuditEvent(
            isActive ? "application_fee_updated" : "application_fee_disabled",
            req._userId,
            "fee",
            form.feeId,
            {
              feeId: form.feeId,
              isActive,
              reason: "Synced with permit form status change",
            },
          ).catch((err) =>
            console.error(
              "Failed to log audit event for application fee status sync",
              err,
            ),
          );
        } catch (error) {
          console.error("Failed to sync fee status:", error);
          logger.error("Failed to sync fee status:", error);
        }
      }

      const updatedForm = await PermitForm.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            isActive,
            lastUpdated: new Date(),
          },
        },
        { new: true },
      ).lean();

      // Log audit event using helper
      const userInfo = await getUserInfo(req._userId);
      PermitFormAuditHelper.logStatusChanged(
        req,
        req._userId,
        userInfo,
        form,
        form.isActive,
        isActive,
        "admin",
      ).catch((err) =>
        console.error(
          "Failed to log audit event for permit form status change",
          err,
        ),
      );

      logger.info(
        `Updated permit form status: ${form.formId} to ${isActive ? "active" : "disabled"}`,
      );
      respond.success(res, 200, updatedForm);
    } catch (error) {
      logger.error("Error updating permit form status:", error);
      respond.error(
        res,
        500,
        "status_update_failed",
        "Failed to update permit form status",
      );
    }
  },
);

// POST /api/admin/permit-forms/temporary - Create temporary permit form (with step-up)
router.post(
  "/temporary",
  requireJwt,
  requireRole("admin"),
  requireAdminStepUp,
  validateBody(createTemporaryPermitFormSchema),
  async (req, res) => {
    try {
      const {
        name,
        description,
        sections,
        notes,
        isActive,
        applicationFeeAmount,
      } = req.body;

      // Generate a unique formId for temporary permits
      const formId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create application fee (required for temporary permits)
      let feeId = null;
      if (applicationFeeAmount && applicationFeeAmount > 0) {
        try {
          const fee = await Fee.create({
            name: `${name} Fee`,
            amount: applicationFeeAmount,
            category: "application_fee",
            isActive: isActive !== undefined ? isActive : true,
          });
          feeId = fee._id;

          // Log audit event for fee creation
          await logAuditEvent(
            "application_fee_created",
            req._userId,
            "fee",
            feeId,
            {
              feeId: feeId,
              name: fee.name,
              amount: fee.amount,
              category: fee.category,
              isActive: fee.isActive,
            },
          ).catch((err) =>
            console.error(
              "Failed to log audit event for application fee creation",
              err,
            ),
          );
        } catch (error) {
          console.error("Failed to create application fee:", error);
          logger.error("Failed to create application fee:", error);
        }
      }

      const form = await PermitForm.create({
        formId,
        name,
        description,
        sections: sections || [],
        version: 1,
        notes: notes || "",
        isActive: isActive !== undefined ? isActive : true,
        feeId,
        formType: "temporary",
      });

      // Log audit event using helper
      const userInfo = await getUserInfo(req._userId);
      PermitFormAuditHelper.logCreated(
        req,
        req._userId,
        userInfo,
        form,
        "admin",
      ).catch((err) =>
        console.error(
          "Failed to log audit event for temporary permit form create",
          err,
        ),
      );

      logger.info(`Created temporary permit form: ${formId}`);
      respond.success(res, 201, form);
    } catch (error) {
      logger.error("Error creating temporary permit form:", error);
      respond.error(
        res,
        500,
        "create_failed",
        "Failed to create temporary permit form",
      );
    }
  },
);

// GET /api/admin/permit-forms/:id/key-usage - Check if field keys are used in claimable document bindings
router.get(
  "/:id/key-usage",
  requireJwt,
  requireRole("admin"),
  async (req, res) => {
    try {
      const form = await PermitForm.findById(req.params.id);
      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      // Extract all field keys from the form
      const fieldKeys = new Set();

      // Collect keys from sections
      if (form.sections && Array.isArray(form.sections)) {
        for (const section of form.sections) {
          if (section.items && Array.isArray(section.items)) {
            for (const item of section.items) {
              if (item.key) {
                fieldKeys.add(item.key);
              }
            }
          }
          if (section.groupFields && Array.isArray(section.groupFields)) {
            for (const groupField of section.groupFields) {
              if (groupField.key) {
                fieldKeys.add(groupField.key);
              }
              if (groupField.fields && Array.isArray(groupField.fields)) {
                for (const subField of groupField.fields) {
                  if (subField.key) {
                    fieldKeys.add(subField.key);
                  }
                }
              }
            }
          }
        }
      }

      // Collect keys from metadataFields
      if (form.metadataFields && Array.isArray(form.metadataFields)) {
        for (const metaField of form.metadataFields) {
          if (metaField.key) {
            fieldKeys.add(metaField.key);
          }
        }
      }

      // Check which keys are used in claimable document bindings
      try {
        const documents = await ClaimableDocument.find({
          isActive: true,
        }).lean();
        const keyUsage = {};

        // Initialize all keys as unused
        for (const key of fieldKeys) {
          keyUsage[key] = {
            used: false,
            documents: [],
          };
        }

        // Check each document for key usage
        for (const doc of documents) {
          if (doc.templateTexts && Array.isArray(doc.templateTexts)) {
            for (const textAttr of doc.templateTexts) {
              if (
                textAttr.sourceType === "form_field" &&
                textAttr.bindings &&
                Array.isArray(textAttr.bindings)
              ) {
                for (const binding of textAttr.bindings) {
                  if (
                    binding.formId === form._id.toString() &&
                    binding.fieldKey
                  ) {
                    if (keyUsage[binding.fieldKey]) {
                      keyUsage[binding.fieldKey].used = true;
                      keyUsage[binding.fieldKey].documents.push({
                        documentId: doc._id,
                        documentName: doc.name,
                        attributeName: textAttr.attributeName,
                      });
                    }
                  }
                }
              }
            }
          }
        }

        respond.success(res, 200, {
          formId: form.formId,
          formName: form.name,
          keyUsage,
        });
      } catch (error) {
        console.error("Failed to check key usage:", error);
        logger.error("Failed to check key usage:", error);
        respond.error(res, 500, "check_failed", "Failed to check key usage");
      }
    } catch (error) {
      logger.error("Error checking key usage:", error);
      respond.error(res, 500, "check_failed", "Failed to check key usage");
    }
  },
);

// DELETE /api/admin/permit-forms/:id - Delete permit form (with step-up, checks for orphaned bindings)
router.delete(
  "/:id",
  requireJwt,
  requireRole("admin"),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const form = await PermitForm.findById(req.params.id);
      if (!form) {
        return respond.error(res, 404, "not_found", "Permit form not found");
      }

      // Check if form is used in any claimable document's templateTexts bindings
      try {
        const documents = await ClaimableDocument.find({
          isActive: true,
        }).lean();
        const dependentDocuments = [];

        for (const doc of documents) {
          if (doc.templateTexts && Array.isArray(doc.templateTexts)) {
            for (const textAttr of doc.templateTexts) {
              if (
                textAttr.sourceType === "form_field" &&
                textAttr.bindings &&
                Array.isArray(textAttr.bindings)
              ) {
                for (const binding of textAttr.bindings) {
                  if (binding.formId === form._id.toString()) {
                    dependentDocuments.push({
                      documentId: doc._id,
                      documentName: doc.name,
                      attributeName: textAttr.attributeName,
                    });
                  }
                }
              }
            }
          }
        }

        if (dependentDocuments.length > 0) {
          return respond.error(
            res,
            400,
            "has_dependent_documents",
            `Cannot delete permit form: it is referenced in ${dependentDocuments.length} claimable document(s). Please remove the bindings first.`,
            { dependentDocuments },
          );
        }
      } catch (error) {
        console.error("Failed to check for dependent documents:", error);
        // Continue with deletion if check fails (fail-open)
        logger.warn(
          "Failed to check for dependent documents, proceeding with deletion",
        );
      }

      // Delete the form
      await PermitForm.findByIdAndDelete(req.params.id);

      // Log audit event
      await logAuditEvent(
        "permit_form_deleted",
        req._userId,
        "permit-form",
        form._id,
        {
          formId: form.formId,
          name: form.name,
          version: form.version,
        },
      );

      logger.info(`Deleted permit form: ${form.formId}`);
      respond.success(res, 200, {
        message: "Permit form deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting permit form:", error);
      respond.error(res, 500, "delete_failed", "Failed to delete permit form");
    }
  },
);

module.exports = router;
