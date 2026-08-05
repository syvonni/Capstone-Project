const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");
const respond = require("../middleware/respond");
const LGU = require("../models/LGU");
const { logAuditEvent } = require("../lib/auditClient");

const router = express.Router();

// Validation schemas
const createLguSchema = Joi.object({
  code: Joi.string()
    .uppercase()
    .trim()
    .pattern(/^[A-Z0-9-]+$/)
    .required()
    .messages({
      "string.pattern.base": "Code must be alphanumeric with hyphens only",
    }),
  name: Joi.string().trim().min(2).max(100).required(),
  region: Joi.string().trim().min(2).max(100).required(),
  province: Joi.string().trim().max(100).allow("", null).optional(),
  type: Joi.string().valid("city", "municipality").required(),
  isActive: Joi.boolean().optional(),
});

const updateLguSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  region: Joi.string().trim().min(2).max(100).optional(),
  province: Joi.string().trim().max(100).allow("", null).optional(),
  type: Joi.string().valid("city", "municipality").optional(),
  isActive: Joi.boolean().optional(),
});

// ============================================
// PUBLIC ROUTES (must be before /:code routes)
// ============================================

// GET /api/lgus/public/active - Public endpoint for active LGUs
router.get("/public/active", async (req, res) => {
  try {
    const { region, type } = req.query;
    const filter = { isActive: true };
    if (region) filter.region = region;
    if (type) filter.type = type;

    const lgus = await LGU.find(filter)
      .select("code name region province type")
      .sort({ region: 1, name: 1 })
      .lean();

    return res.json({ success: true, lgus });
  } catch (err) {
    console.error("GET /api/lgus/public/active error:", err);
    return res.status(500).json({ success: false, lgus: [] });
  }
});

// GET /api/lgus/public/regions - Get unique regions (public)
router.get("/public/regions", async (_req, res) => {
  try {
    const regions = await LGU.distinct("region", { isActive: true });
    return res.json({ success: true, regions: regions.sort() });
  } catch (err) {
    console.error("GET /api/lgus/public/regions error:", err);
    return res.status(500).json({ success: false, regions: [] });
  }
});

// ============================================
// ADMIN ROUTES (require authentication)
// ============================================

// GET /api/admin/lgus - List all LGUs (admin only)
router.get("/", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { region, type, isActive, search, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (region) filter.region = region;
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [lgus, total] = await Promise.all([
      LGU.find(filter)
        .sort({ region: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LGU.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      lgus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/lgus error:", err);
    return respond.error(res, 500, "lgu_list_failed", "Failed to load LGUs");
  }
});

// GET /api/admin/lgus/:code - Get single LGU (admin only)
router.get("/:code", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const lgu = await LGU.findOne({
      code: req.params.code.toUpperCase(),
    }).lean();
    if (!lgu) {
      return respond.error(res, 404, "lgu_not_found", "LGU not found");
    }
    return res.json({ success: true, lgu });
  } catch (err) {
    console.error("GET /api/admin/lgus/:code error:", err);
    return respond.error(res, 500, "lgu_get_failed", "Failed to load LGU");
  }
});

// POST /api/admin/lgus - Create new LGU (admin only)
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(createLguSchema),
  async (req, res) => {
    try {
      const { code, name, region, province, type, isActive } = req.body;

      // Check for duplicate code
      const existing = await LGU.findOne({ code: code.toUpperCase() });
      if (existing) {
        return respond.error(
          res,
          409,
          "lgu_code_exists",
          "An LGU with this code already exists",
        );
      }

      const lgu = await LGU.create({
        code: code.toUpperCase(),
        name,
        region,
        province: province || "",
        type,
        isActive: isActive !== false,
      });

      logAuditEvent("lgu_created", req._userId, "LGU", String(lgu._id), {
        role: "admin",
        fieldChanged: "lgu",
        oldValue: "",
        newValue: lgu.code,
        code: lgu.code,
        name: lgu.name,
        type: lgu.type,
        region: lgu.region,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      }).catch((err) =>
        console.error("Failed to log audit event for LGU create", err),
      );

      return res.status(201).json({ success: true, lgu });
    } catch (err) {
      console.error("POST /api/admin/lgus error:", err);
      if (err.code === 11000) {
        return respond.error(
          res,
          409,
          "lgu_code_exists",
          "An LGU with this code already exists",
        );
      }
      return respond.error(
        res,
        500,
        "lgu_create_failed",
        "Failed to create LGU",
      );
    }
  },
);

// PUT /api/admin/lgus/:code - Update LGU (admin only)
router.put(
  "/:code",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(updateLguSchema),
  async (req, res) => {
    try {
      const lgu = await LGU.findOne({ code: req.params.code.toUpperCase() });
      if (!lgu) {
        return respond.error(res, 404, "lgu_not_found", "LGU not found");
      }

      const { name, region, province, type, isActive } = req.body;
      const oldValues = {
        name: lgu.name,
        region: lgu.region,
        province: lgu.province,
        type: lgu.type,
        isActive: lgu.isActive,
      };

      if (name !== undefined) lgu.name = name;
      if (region !== undefined) lgu.region = region;
      if (province !== undefined) lgu.province = province;
      if (type !== undefined) lgu.type = type;
      if (isActive !== undefined) lgu.isActive = isActive;

      await lgu.save();

      logAuditEvent("lgu_updated", req._userId, "LGU", String(lgu._id), {
        role: "admin",
        fieldChanged: "lgu",
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify({
          name: lgu.name,
          region: lgu.region,
          province: lgu.province,
          type: lgu.type,
          isActive: lgu.isActive,
        }),
        code: lgu.code,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      }).catch((err) =>
        console.error("Failed to log audit event for LGU update", err),
      );

      return res.json({ success: true, lgu });
    } catch (err) {
      console.error("PUT /api/admin/lgus/:code error:", err);
      return respond.error(
        res,
        500,
        "lgu_update_failed",
        "Failed to update LGU",
      );
    }
  },
);

// DELETE /api/admin/lgus/:code - Delete LGU (admin only)
router.delete(
  "/:code",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      const lgu = await LGU.findOne({ code }).lean();
      if (!lgu) {
        return respond.error(res, 404, "lgu_not_found", "LGU not found");
      }
      await LGU.deleteOne({ code });
      logAuditEvent("lgu_deleted", req._userId, "LGU", code, {
        role: "admin",
        fieldChanged: "lgu",
        oldValue: code,
        newValue: "",
        code,
        name: lgu.name,
        type: lgu.type,
        region: lgu.region,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      }).catch((err) =>
        console.error("Failed to log audit event for LGU delete", err),
      );
      return res.json({ success: true, message: "LGU deleted" });
    } catch (err) {
      console.error("DELETE /api/admin/lgus/:code error:", err);
      return respond.error(
        res,
        500,
        "lgu_delete_failed",
        "Failed to delete LGU",
      );
    }
  },
);

module.exports = router;
