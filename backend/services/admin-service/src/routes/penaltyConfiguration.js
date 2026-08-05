const express = require("express");
const PenaltyConfiguration = require("../models/PenaltyConfiguration");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");

const router = express.Router();

// GET /api/admin/penalty-configuration — get active config (or all)
router.get("/", requireJwt, async (req, res) => {
  try {
    const { all } = req.query;
    if (all === "true") {
      const configs = await PenaltyConfiguration.find()
        .sort({ createdAt: -1 })
        .lean();
      return res.json({ data: configs });
    }
    // Return active config
    let active = await PenaltyConfiguration.findOne({ isActive: true }).lean();
    if (!active) {
      // Seed default if none exists
      active = await PenaltyConfiguration.create({
        surchargePercentage: 25,
        monthlyInterestRate: 2,
        penaltyStartDay: 20,
        effectiveDate: new Date(),
        isActive: true,
      });
      active = active.toObject();
    }
    return res.json({ data: active });
  } catch (err) {
    console.error("GET /penalty-configuration error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch penalty configuration",
      },
    });
  }
});

// POST /api/admin/penalty-configuration — create new config
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const {
        surchargePercentage,
        monthlyInterestRate,
        penaltyStartDay,
        compliancePeriods,
        effectiveDate,
      } = req.body;

      // Validate penaltyStartDay
      if (
        penaltyStartDay !== undefined &&
        (penaltyStartDay < 1 || penaltyStartDay > 31)
      ) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Penalty start day must be between 1 and 31",
          },
        });
      }

      // Warn if penaltyStartDay is 31 (February issue)
      const warnings = [];
      if (penaltyStartDay === 31) {
        warnings.push(
          "Penalty start day 31 may cause issues in February (only 28/29 days)",
        );
      }

      const config = await PenaltyConfiguration.create({
        surchargePercentage: surchargePercentage ?? 25,
        monthlyInterestRate: monthlyInterestRate ?? 2,
        penaltyStartDay: penaltyStartDay ?? 20,
        compliancePeriods: compliancePeriods || {},
        effectiveDate: effectiveDate || new Date(),
        isActive: true,
        createdBy: req._userId,
        updatedBy: req._userId,
      });

      logAuditEvent(
        "penalty_config_created",
        req._userId,
        "PenaltyConfiguration",
        String(config._id),
        {
          role: "admin",
          fieldChanged: "penalty_config",
          oldValue: "",
          newValue: String(config._id),
          configId: String(config._id),
          surchargePercentage: config.surchargePercentage,
          monthlyInterestRate: config.monthlyInterestRate,
          penaltyStartDay: config.penaltyStartDay,
          effectiveDate: config.effectiveDate?.toISOString?.(),
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for penalty config create",
          err,
        ),
      );

      return res.status(201).json({ data: config, warnings });
    } catch (err) {
      console.error("POST /penalty-configuration error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to create penalty configuration",
        },
      });
    }
  },
);

// PUT /api/admin/penalty-configuration/:id — update config
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        surchargePercentage,
        monthlyInterestRate,
        penaltyStartDay,
        compliancePeriods,
        effectiveDate,
        isActive,
      } = req.body;

      if (
        penaltyStartDay !== undefined &&
        (penaltyStartDay < 1 || penaltyStartDay > 31)
      ) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Penalty start day must be between 1 and 31",
          },
        });
      }

      const config = await PenaltyConfiguration.findById(id);
      if (!config) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Penalty configuration not found",
          },
        });
      }

      // Prevent deactivating the last active config
      if (isActive === false) {
        const activeCount = await PenaltyConfiguration.countDocuments({
          isActive: true,
          _id: { $ne: id },
        });
        if (activeCount === 0) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message:
                "Cannot deactivate the last active penalty configuration",
            },
          });
        }
      }

      const oldValues = {
        surchargePercentage: config.surchargePercentage,
        monthlyInterestRate: config.monthlyInterestRate,
        penaltyStartDay: config.penaltyStartDay,
        isActive: config.isActive,
      };

      if (surchargePercentage !== undefined)
        config.surchargePercentage = surchargePercentage;
      if (monthlyInterestRate !== undefined)
        config.monthlyInterestRate = monthlyInterestRate;
      if (penaltyStartDay !== undefined)
        config.penaltyStartDay = penaltyStartDay;
      if (compliancePeriods !== undefined)
        config.compliancePeriods = compliancePeriods;
      if (effectiveDate !== undefined) config.effectiveDate = effectiveDate;
      if (isActive !== undefined) config.isActive = isActive;
      config.updatedBy = req._userId;

      await config.save();

      logAuditEvent(
        "penalty_config_updated",
        req._userId,
        "PenaltyConfiguration",
        String(config._id),
        {
          role: "admin",
          fieldChanged: "penalty_config",
          oldValue: JSON.stringify(oldValues),
          newValue: JSON.stringify({
            surchargePercentage: config.surchargePercentage,
            monthlyInterestRate: config.monthlyInterestRate,
            penaltyStartDay: config.penaltyStartDay,
            isActive: config.isActive,
          }),
          configId: String(config._id),
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for penalty config update",
          err,
        ),
      );

      const warnings = [];
      if (config.penaltyStartDay === 31) {
        warnings.push("Penalty start day 31 may cause issues in February");
      }

      return res.json({ data: config, warnings });
    } catch (err) {
      console.error("PUT /penalty-configuration error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to update penalty configuration",
        },
      });
    }
  },
);

// POST /api/admin/penalty-configuration/reset — reset to defaults
router.post(
  "/reset",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const previousConfigs = await PenaltyConfiguration.find({
        isActive: true,
      })
        .select("_id surchargePercentage monthlyInterestRate penaltyStartDay")
        .lean();

      // Deactivate all existing
      await PenaltyConfiguration.updateMany({}, { $set: { isActive: false } });

      // Create default
      const config = await PenaltyConfiguration.create({
        surchargePercentage: 25,
        monthlyInterestRate: 2,
        penaltyStartDay: 20,
        effectiveDate: new Date(),
        isActive: true,
        createdBy: req._userId,
        updatedBy: req._userId,
      });

      logAuditEvent(
        "penalty_config_reset",
        req._userId,
        "PenaltyConfiguration",
        String(config._id),
        {
          role: "admin",
          fieldChanged: "penalty_config",
          oldValue: previousConfigs.length
            ? JSON.stringify(
                previousConfigs.map((c) => ({
                  id: String(c._id),
                  surchargePercentage: c.surchargePercentage,
                  monthlyInterestRate: c.monthlyInterestRate,
                  penaltyStartDay: c.penaltyStartDay,
                })),
              )
            : "",
          newValue: JSON.stringify({
            configId: String(config._id),
            surchargePercentage: 25,
            monthlyInterestRate: 2,
            penaltyStartDay: 20,
          }),
          previousActiveCount: previousConfigs.length,
          newConfigId: String(config._id),
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for penalty config reset",
          err,
        ),
      );

      return res.json({ data: config, message: "Reset to defaults" });
    } catch (err) {
      console.error("POST /penalty-configuration/reset error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to reset penalty configuration",
        },
      });
    }
  },
);

module.exports = router;
