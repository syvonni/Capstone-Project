/**
 * General Permit Configuration
 * GET /api/admin/general-permit-config - Get requirements per category
 * PUT /api/admin/general-permit-config - Save requirements per category
 */
const express = require("express");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const router = express.Router();

// In-memory store (replace with MongoDB/Redis for production persistence across restarts)
let store = null;

const DEFAULT_REQUIREMENTS = {
  cooperative: [
    "CDA Registration",
    "Board Resolution",
    "Financial Statement",
    "List of Officers",
  ],
  association_foundation: [
    "SEC Registration",
    "Board Resolution",
    "Articles of Incorporation",
  ],
  chainsaw: ["DENR Permit", "Barangay Clearance", "Proof of Ownership"],
  firecrackers_stallholders: [
    "Fire Safety Inspection Certificate",
    "Barangay Clearance",
    "Business Permit",
  ],
  bazaar_festival_vendors: [
    "Barangay Clearance",
    "Health Certificate",
    "Sanitary Permit",
  ],
  peddlers: ["Barangay Clearance", "Community Tax Certificate", "Photo ID"],
  promotions_exhibitors: [
    "Business Permit",
    "Event Permit",
    "Insurance Certificate",
  ],
  cemetery_stallholders: ["Barangay Clearance", "Health Certificate"],
  fish_trap_fish_pen: [
    "BFAR Permit",
    "Barangay Clearance",
    "Environmental Compliance Certificate",
  ],
  fish_pond: [
    "BFAR Permit",
    "Barangay Clearance",
    "Environmental Compliance Certificate",
    "Water Rights Permit",
  ],
};

// GET /api/admin/general-permit-config (public for applicants to view requirements)
router.get("/", requireJwt, (req, res) => {
  try {
    const data = store || DEFAULT_REQUIREMENTS;
    res.json(data);
  } catch (err) {
    console.error("GET /api/admin/general-permit-config error:", err);
    res
      .status(500)
      .json({ error: "Failed to load general permit configuration" });
  }
});

// PUT /api/admin/general-permit-config (admin only)
router.put(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const previous = store || DEFAULT_REQUIREMENTS;
      const changedCategories = Object.keys(body).filter(
        (k) => JSON.stringify(previous[k]) !== JSON.stringify(body[k]),
      );
      store = { ...(store || DEFAULT_REQUIREMENTS), ...body };
      if (changedCategories.length > 0) {
        logAuditEvent(
          "general_permit_config_updated",
          req._userId,
          "GeneralPermitConfig",
          "singleton",
          {
            role: "admin",
            fieldChanged: "general_permit_config",
            oldValue: changedCategories.length
              ? JSON.stringify(changedCategories)
              : "",
            newValue: JSON.stringify(changedCategories),
            changedCategories,
            ip: req.ip,
            userAgent: req.get("user-agent"),
          },
        ).catch((err) =>
          console.error(
            "Failed to log audit event for general permit config update",
            err,
          ),
        );
      }
      res.json(store);
    } catch (err) {
      console.error("PUT /api/admin/general-permit-config error:", err);
      res
        .status(500)
        .json({ error: "Failed to save general permit configuration" });
    }
  },
);

module.exports = router;
