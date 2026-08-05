const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const Office = require("../models/Office");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const respond = require("../middleware/respond");
const { validateBody, Joi } = require("../middleware/validation");
const {
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeName,
} = require("../lib/sanitizer");
const { isStaffRole, refreshStaffRoleCache } = require("../lib/roleHelpers");
const { logAuditEvent } = require("../lib/auditClient");
const { addToPasswordHistory } = require("../lib/passwordHistory");
const { validatePasswordStrength } = require("../lib/passwordValidator");
const { sendStaffCredentialsEmail } = require("../lib/mailer");

const router = express.Router();

const updateStaffSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).optional(),
  lastName: Joi.string().trim().min(1).max(100).optional(),
  phoneNumber: Joi.string().trim().allow("", null).optional(),
  email: Joi.string().email().optional(),
  office: Joi.string().trim().optional(),
  role: Joi.string().trim().optional(),
  isActive: Joi.boolean().optional(),
  reason: Joi.string().trim().min(5).max(500).required(),
});

const resetPasswordSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
  tempPasswordLength: Joi.number().integer().min(12).max(24).optional(),
});

const officeCreateSchema = Joi.object({
  code: Joi.string().trim().min(2).max(50).required(),
  name: Joi.string().trim().min(2).max(120).required(),
  group: Joi.string().trim().min(2).max(120).required(),
  isActive: Joi.boolean().optional(),
});

const officeUpdateSchema = Joi.object({
  code: Joi.string().trim().min(2).max(50).optional(),
  name: Joi.string().trim().min(2).max(120).optional(),
  group: Joi.string().trim().min(2).max(120).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const staffRoleCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .required(),
  description: Joi.string().trim().max(300).allow("").optional(),
  displayName: Joi.string().trim().max(120).allow("").optional(),
});

const staffRoleUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  slug: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .optional(),
  description: Joi.string().trim().max(300).allow("").optional(),
  displayName: Joi.string().trim().max(120).allow("").optional(),
}).min(1);

function generateTempPassword(len = 14) {
  const length = Math.max(12, Math.min(32, Number(len) || 14));
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const specials = "!@#$%^&*";
  const all = lowers + uppers + digits + specials;

  function pick(set) {
    const idx = crypto.randomBytes(1)[0] % set.length;
    return set[idx];
  }

  const required = [pick(lowers), pick(uppers), pick(digits), pick(specials)];
  const remainingLen = Math.max(length - required.length, 0);
  const remaining = Array.from({ length: remainingLen }, () => pick(all));
  const raw = required.concat(remaining);

  // Shuffle
  for (let i = raw.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }

  return raw.join("");
}

function sanitizeNameField(value) {
  const raw = sanitizeName(sanitizeString(value || ""));
  return raw || "";
}

function normalizeOfficeCode(value) {
  return String(value || "")
    .replace("PNP‑FEU", "PNP-FEU")
    .trim()
    .toUpperCase();
}

router.patch(
  "/admin/staff/:staffId",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(updateStaffSchema),
  async (req, res) => {
    try {
      const adminId = req._userId;
      const staffId = req.params.staffId;
      const {
        firstName,
        lastName,
        phoneNumber,
        email,
        office,
        role,
        isActive,
        reason,
      } = req.body || {};

      const staffUser = await User.findById(staffId).populate("role");
      if (!staffUser)
        return respond.error(
          res,
          404,
          "staff_not_found",
          "Staff user not found",
        );

      const currentRoleSlug = staffUser.role?.slug || "";
      if (!(staffUser.role?.isStaffRole || isStaffRole(currentRoleSlug))) {
        return respond.error(
          res,
          400,
          "not_staff_user",
          "Only staff users can be edited here",
        );
      }

      const changes = [];

      if (firstName !== undefined) {
        const safe = sanitizeNameField(firstName);
        if (safe && safe !== staffUser.firstName) {
          changes.push({
            field: "firstName",
            oldValue: staffUser.firstName || "",
            newValue: safe,
          });
          staffUser.firstName = safe;
        }
      }

      if (lastName !== undefined) {
        const safe = sanitizeNameField(lastName);
        if (safe && safe !== staffUser.lastName) {
          changes.push({
            field: "lastName",
            oldValue: staffUser.lastName || "",
            newValue: safe,
          });
          staffUser.lastName = safe;
        }
      }

      if (phoneNumber !== undefined) {
        const safePhone = sanitizePhoneNumber(String(phoneNumber || ""));
        if (safePhone !== staffUser.phoneNumber) {
          changes.push({
            field: "phoneNumber",
            oldValue: staffUser.phoneNumber || "",
            newValue: safePhone,
          });
          staffUser.phoneNumber = safePhone || "";
        }
      }

      if (email !== undefined) {
        const normalized = sanitizeEmail(email || "");
        if (!normalized)
          return respond.error(res, 400, "invalid_email", "Invalid email");
        if (normalized !== staffUser.email) {
          const exists = await User.findOne({ email: normalized }).lean();
          if (exists && String(exists._id) !== String(staffUser._id)) {
            return respond.error(
              res,
              409,
              "email_exists",
              "Email already in use",
            );
          }
          changes.push({
            field: "email",
            oldValue: staffUser.email || "",
            newValue: normalized,
          });
          staffUser.email = normalized;
          // Email change: require MFA re-setup and invalidate sessions
          staffUser.mfaEnabled = false;
          staffUser.mfaSecret = "";
          staffUser.fprintEnabled = false;
          staffUser.mfaMethod = "";
          staffUser.mfaDisablePending = false;
          staffUser.mfaDisableRequestedAt = null;
          staffUser.mfaDisableScheduledFor = null;
          staffUser.tokenFprint = "";
          staffUser.tokenVersion = (staffUser.tokenVersion || 0) + 1;
          staffUser.mustSetupMfa = true;
        }
      }

      if (office !== undefined) {
        const canonicalOffice = normalizeOfficeCode(office);
        const officeDoc = await Office.findOne({
          code: canonicalOffice,
          isActive: true,
        }).lean();
        if (!officeDoc) {
          return respond.error(
            res,
            400,
            "office_not_found",
            "Office not found",
          );
        }
        if (canonicalOffice !== staffUser.office) {
          changes.push({
            field: "office",
            oldValue: staffUser.office || "",
            newValue: canonicalOffice,
          });
          staffUser.office = canonicalOffice;
        }
      }

      if (role !== undefined) {
        const roleDoc = await Role.findOne({
          slug: String(role || "").toLowerCase(),
        }).lean();
        if (!roleDoc || !roleDoc.isStaffRole) {
          return respond.error(
            res,
            400,
            "role_not_allowed",
            "Role not allowed for staff",
          );
        }
        if (
          String(staffUser.role?._id || staffUser.role) !== String(roleDoc._id)
        ) {
          changes.push({
            field: "role",
            oldValue: currentRoleSlug,
            newValue: roleDoc.slug,
          });
          staffUser.role = roleDoc._id;
        }
      }

      if (isActive !== undefined) {
        const active = !!isActive;
        if (!active && String(staffUser._id) === String(adminId)) {
          return respond.error(
            res,
            400,
            "self_disable_not_allowed",
            "You cannot disable your own account",
          );
        }
        const prev = staffUser.isActive !== false;
        if (active !== prev) {
          changes.push({
            field: "account",
            oldValue: String(prev),
            newValue: String(active),
          });
          staffUser.isActive = active;
          if (!active) {
            staffUser.tokenVersion = (staffUser.tokenVersion || 0) + 1;
          }
        }
      }

      if (!changes.length) {
        return res.json({
          success: true,
          user: {
            id: String(staffUser._id),
            email: staffUser.email,
            firstName: staffUser.firstName,
            lastName: staffUser.lastName,
            phoneNumber: staffUser.phoneNumber,
            office: staffUser.office,
            role: staffUser.role?.slug || staffUser.role,
            isActive: staffUser.isActive !== false,
            mustSetupMfa: !!staffUser.mustSetupMfa,
            mustChangeCredentials: !!staffUser.mustChangeCredentials,
            tokenVersion: staffUser.tokenVersion || 0,
          },
        });
      }

      await staffUser.save();

      const adminRole = req._userRole || "admin";
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Create audit log per field changed
      for (const change of changes) {
        await logAuditEvent(
          "profile_update",
          staffUser._id,
          "User",
          staffUser._id,
          {
            role: adminRole,
            fieldChanged: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            reason,
            changedBy: adminId,
            ip,
            userAgent,
          },
        );
      }

      return res.json({
        success: true,
        user: {
          id: String(staffUser._id),
          email: staffUser.email,
          firstName: staffUser.firstName,
          lastName: staffUser.lastName,
          phoneNumber: staffUser.phoneNumber,
          office: staffUser.office,
          role: staffUser.role?.slug || staffUser.role,
          isActive: staffUser.isActive !== false,
          mustSetupMfa: !!staffUser.mustSetupMfa,
          mustChangeCredentials: !!staffUser.mustChangeCredentials,
          tokenVersion: staffUser.tokenVersion || 0,
        },
      });
    } catch (err) {
      console.error("PATCH /api/auth/admin/staff/:staffId error:", err);
      return respond.error(
        res,
        500,
        "staff_update_failed",
        "Failed to update staff user",
      );
    }
  },
);

router.post(
  "/admin/staff/:staffId/reset-password",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(resetPasswordSchema),
  async (req, res) => {
    try {
      const adminId = req._userId;
      const { staffId } = req.params;
      const { reason, tempPasswordLength } = req.body || {};

      const staffUser = await User.findById(staffId).populate("role");
      if (!staffUser)
        return respond.error(
          res,
          404,
          "staff_not_found",
          "Staff user not found",
        );

      const roleSlug = staffUser.role?.slug || "";
      if (!(staffUser.role?.isStaffRole || isStaffRole(roleSlug))) {
        return respond.error(
          res,
          400,
          "not_staff_user",
          "Only staff users can be reset here",
        );
      }

      const tempPassword = generateTempPassword(tempPasswordLength || 14);
      const strength = validatePasswordStrength(tempPassword);
      if (!strength.valid) {
        return respond.error(
          res,
          500,
          "password_generation_failed",
          "Generated password did not meet strength requirements",
        );
      }

      // Update password and security flags
      const oldHash = String(staffUser.passwordHash || "");
      const newHash = await bcrypt.hash(tempPassword, 10);
      const updatedHistory = addToPasswordHistory(
        oldHash,
        staffUser.passwordHistory || [],
      );

      staffUser.passwordHash = newHash;
      staffUser.passwordChangedAt = new Date();
      staffUser.passwordHistory = updatedHistory;
      staffUser.tokenVersion = (staffUser.tokenVersion || 0) + 1;
      staffUser.mustChangeCredentials = true;
      staffUser.mustSetupMfa = true;
      staffUser.mfaEnabled = false;
      staffUser.mfaSecret = "";
      staffUser.fprintEnabled = false;
      staffUser.mfaMethod = "";
      staffUser.mfaDisablePending = false;
      staffUser.mfaDisableRequestedAt = null;
      staffUser.mfaDisableScheduledFor = null;
      staffUser.tokenFprint = "";

      await staffUser.save();

      // Send email with temp credentials (non-blocking)
      const roleLabel = staffUser.role?.name || roleSlug || "Staff";
      sendStaffCredentialsEmail({
        to: staffUser.email,
        username: staffUser.username,
        tempPassword,
        office: staffUser.office || "",
        roleLabel,
      }).catch((err) => {
        console.error("Failed to send staff credentials email:", err);
      });

      const adminRole = req._userRole || "admin";
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      await logAuditEvent(
        "password_change",
        staffUser._id,
        "User",
        staffUser._id,
        {
          role: adminRole,
          fieldChanged: "password",
          oldValue: "[REDACTED]",
          newValue: "[REDACTED]",
          reason,
          resetBy: adminId,
          ip,
          userAgent,
          tokenVersion: staffUser.tokenVersion,
          mustChangeCredentials: true,
          mustSetupMfa: true,
        },
      );

      return res.json({
        success: true,
        message: "Temporary password issued",
        user: {
          id: String(staffUser._id),
          email: staffUser.email,
          username: staffUser.username || "",
          office: staffUser.office || "",
          role: roleSlug,
          isActive: staffUser.isActive !== false,
          mustChangeCredentials: !!staffUser.mustChangeCredentials,
          mustSetupMfa: !!staffUser.mustSetupMfa,
        },
      });
    } catch (err) {
      console.error(
        "POST /api/auth/admin/staff/:staffId/reset-password error:",
        err,
      );
      return respond.error(
        res,
        500,
        "staff_reset_failed",
        "Failed to reset staff password",
      );
    }
  },
);

router.get(
  "/admin/offices",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const docs = await Office.find({}).sort({ group: 1, name: 1 }).lean();
      const offices = docs.map((doc) => ({
        id: String(doc._id),
        code: doc.code,
        name: doc.name,
        group: doc.group || "",
        isActive: doc.isActive !== false,
      }));
      return res.json(offices);
    } catch (err) {
      console.error("GET /api/auth/admin/offices error:", err);
      return respond.error(
        res,
        500,
        "office_list_failed",
        "Failed to load offices",
      );
    }
  },
);

router.get(
  "/offices",
  requireJwt,
  requireRole(["lgu_officer", "staff", "inspector", "admin"]),
  async (req, res) => {
    try {
      const docs = await Office.find({}).sort({ group: 1, name: 1 }).lean();
      const offices = docs.map((doc) => ({
        id: String(doc._id),
        code: doc.code,
        name: doc.name,
        group: doc.group || "",
        isActive: doc.isActive !== false,
      }));
      return res.json(offices);
    } catch (err) {
      console.error("GET /api/auth/offices error:", err);
      return respond.error(
        res,
        500,
        "office_list_failed",
        "Failed to load offices",
      );
    }
  },
);

router.post(
  "/admin/offices",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(officeCreateSchema),
  async (req, res) => {
    try {
      const { code, name, group, isActive } = req.body || {};
      const normalizedCode = normalizeOfficeCode(code);
      const existing = await Office.findOne({ code: normalizedCode }).lean();
      if (existing) {
        return respond.error(
          res,
          409,
          "office_exists",
          "Office code already exists",
        );
      }
      const created = await Office.create({
        code: normalizedCode,
        name: String(name || "").trim(),
        group: String(group || "").trim(),
        isActive: isActive !== false,
      });
      return res.status(201).json({
        id: String(created._id),
        code: created.code,
        name: created.name,
        group: created.group || "",
        isActive: created.isActive !== false,
      });
    } catch (err) {
      console.error("POST /api/auth/admin/offices error:", err);
      return respond.error(
        res,
        500,
        "office_create_failed",
        "Failed to create office",
      );
    }
  },
);

router.patch(
  "/admin/offices/:officeId",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(officeUpdateSchema),
  async (req, res) => {
    try {
      const { officeId } = req.params;
      const { code, name, group, isActive } = req.body || {};
      const office = await Office.findById(officeId);
      if (!office)
        return respond.error(res, 404, "office_not_found", "Office not found");

      if (code !== undefined) {
        const normalizedCode = normalizeOfficeCode(code);
        if (normalizedCode !== office.code) {
          const inUse = await User.findOne({ office: office.code }).lean();
          if (inUse) {
            return respond.error(
              res,
              409,
              "office_in_use",
              "Office code is in use by staff accounts",
            );
          }
          const exists = await Office.findOne({ code: normalizedCode }).lean();
          if (exists) {
            return respond.error(
              res,
              409,
              "office_exists",
              "Office code already exists",
            );
          }
          office.code = normalizedCode;
        }
      }

      if (name !== undefined) {
        office.name = String(name || "").trim();
      }
      if (group !== undefined) {
        office.group = String(group || "").trim();
      }
      if (isActive !== undefined) {
        office.isActive = !!isActive;
      }
      await office.save();
      return res.json({
        id: String(office._id),
        code: office.code,
        name: office.name,
        group: office.group || "",
        isActive: office.isActive !== false,
      });
    } catch (err) {
      console.error("PATCH /api/auth/admin/offices/:officeId error:", err);
      return respond.error(
        res,
        500,
        "office_update_failed",
        "Failed to update office",
      );
    }
  },
);

router.delete(
  "/admin/offices/:officeId",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { officeId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(officeId)) {
        return respond.error(
          res,
          400,
          "invalid_office_id",
          "Invalid office id",
        );
      }
      const office = await Office.findById(officeId);
      if (!office)
        return respond.error(res, 404, "office_not_found", "Office not found");
      const inUse = await User.findOne({ office: office.code }).lean();
      if (inUse) {
        return respond.error(
          res,
          409,
          "office_in_use",
          "Office is assigned to staff users",
        );
      }
      await office.deleteOne();
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/auth/admin/offices/:officeId error:", err);
      return respond.error(
        res,
        500,
        "office_delete_failed",
        "Failed to delete office",
      );
    }
  },
);

router.get(
  "/admin/staff-roles",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const docs = await Role.find({ isStaffRole: true })
        .sort({ name: 1 })
        .lean();
      const roles = docs.map((doc) => ({
        id: String(doc._id),
        name: doc.name,
        slug: doc.slug,
        description: doc.description || "",
        displayName: doc.displayName || doc.name,
      }));
      return res.json(roles);
    } catch (err) {
      console.error("GET /api/auth/admin/staff-roles error:", err);
      return respond.error(
        res,
        500,
        "role_list_failed",
        "Failed to load roles",
      );
    }
  },
);

router.post(
  "/admin/staff-roles",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(staffRoleCreateSchema),
  async (req, res) => {
    try {
      const { name, slug, description, displayName } = req.body || {};
      const normalizedSlug = String(slug || "")
        .toLowerCase()
        .trim();
      const exists = await Role.findOne({ slug: normalizedSlug }).lean();
      if (exists) {
        return respond.error(
          res,
          409,
          "role_exists",
          "Role slug already exists",
        );
      }
      const created = await Role.create({
        name: String(name || "").trim(),
        slug: normalizedSlug,
        description: String(description || "").trim(),
        displayName:
          String(displayName || "").trim() || String(name || "").trim(),
        isStaffRole: true,
      });
      await refreshStaffRoleCache();
      return res.status(201).json({
        id: String(created._id),
        name: created.name,
        slug: created.slug,
        description: created.description || "",
        displayName: created.displayName || created.name,
      });
    } catch (err) {
      console.error("POST /api/auth/admin/staff-roles error:", err);
      return respond.error(
        res,
        500,
        "role_create_failed",
        "Failed to create role",
      );
    }
  },
);

router.patch(
  "/admin/staff-roles/:roleId",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(staffRoleUpdateSchema),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return respond.error(res, 400, "invalid_role_id", "Invalid role id");
      }
      const { name, slug, description, displayName } = req.body || {};
      const role = await Role.findById(roleId);
      if (!role)
        return respond.error(res, 404, "role_not_found", "Role not found");
      if (!role.isStaffRole) {
        return respond.error(
          res,
          400,
          "role_not_staff",
          "Only staff roles can be edited here",
        );
      }
      if (slug !== undefined) {
        const normalizedSlug = String(slug || "")
          .toLowerCase()
          .trim();
        if (normalizedSlug !== role.slug) {
          const exists = await Role.findOne({ slug: normalizedSlug }).lean();
          if (exists) {
            return respond.error(
              res,
              409,
              "role_exists",
              "Role slug already exists",
            );
          }
          role.slug = normalizedSlug;
        }
      }
      if (name !== undefined) {
        role.name = String(name || "").trim();
      }
      if (description !== undefined) {
        role.description = String(description || "").trim();
      }
      if (displayName !== undefined) {
        role.displayName = String(displayName || "").trim();
      }
      await role.save();
      await refreshStaffRoleCache();
      return res.json({
        id: String(role._id),
        name: role.name,
        slug: role.slug,
        description: role.description || "",
        displayName: role.displayName || role.name,
      });
    } catch (err) {
      console.error("PATCH /api/auth/admin/staff-roles/:roleId error:", err);
      return respond.error(
        res,
        500,
        "role_update_failed",
        "Failed to update role",
      );
    }
  },
);

router.delete(
  "/admin/staff-roles/:roleId",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return respond.error(res, 400, "invalid_role_id", "Invalid role id");
      }
      const role = await Role.findById(roleId);
      if (!role)
        return respond.error(res, 404, "role_not_found", "Role not found");
      if (!role.isStaffRole) {
        return respond.error(
          res,
          400,
          "role_not_staff",
          "Only staff roles can be deleted here",
        );
      }
      const inUse = await User.findOne({ role: role._id }).lean();
      if (inUse) {
        return respond.error(
          res,
          409,
          "role_in_use",
          "Role is assigned to staff users",
        );
      }
      await role.deleteOne();
      await refreshStaffRoleCache();
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/auth/admin/staff-roles/:roleId error:", err);
      return respond.error(
        res,
        500,
        "role_delete_failed",
        "Failed to delete role",
      );
    }
  },
);

// ─── Admin Accounts Management (approval-gated) ───

// GET /api/auth/admin/admins - List all admin users
router.get(
  "/admin/admins",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const adminRole = await Role.findOne({ slug: "admin" }).lean();
      if (!adminRole) return res.json([]);

      const docs = await User.find({ role: adminRole._id })
        .populate("role")
        .lean();

      const creatorIds = [
        ...new Set(
          docs
            .map((d) => d.createdBy)
            .filter((v) => v && mongoose.Types.ObjectId.isValid(v)),
        ),
      ];
      const creators =
        creatorIds.length > 0
          ? await User.find({ _id: { $in: creatorIds } })
              .populate("role")
              .lean()
          : [];
      const creatorMap = new Map(creators.map((c) => [String(c._id), c]));

      const adminsSafe = docs.map((doc) => {
        let createdBy = null;
        if (doc.createdBy === "seeder") {
          createdBy = { type: "seeder", label: "Seeder" };
        } else if (doc.createdBy === "self") {
          createdBy = { type: "self", label: "Self-registration" };
        } else if (
          doc.createdBy &&
          mongoose.Types.ObjectId.isValid(doc.createdBy)
        ) {
          const creator = creatorMap.get(String(doc.createdBy));
          if (creator) {
            const cRole =
              creator.role && creator.role.slug ? creator.role.slug : "user";
            const name =
              [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
              creator.email;
            createdBy = {
              type: "user",
              label: name,
              role: cRole,
              id: String(creator._id),
            };
          }
        }
        return {
          id: String(doc._id),
          role: "admin",
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          username: doc.username || "",
          phoneNumber: doc.phoneNumber || "",
          isActive: doc.isActive !== false,
          mustChangeCredentials: !!doc.mustChangeCredentials,
          mustSetupMfa: !!doc.mustSetupMfa,
          mfaEnabled: !!doc.mfaEnabled,
          createdAt: doc.createdAt,
          createdBy,
        };
      });
      return res.json(adminsSafe);
    } catch (err) {
      console.error("GET /api/auth/admin/admins error:", err);
      return respond.error(
        res,
        500,
        "admins_load_failed",
        "Failed to load admin accounts",
      );
    }
  },
);

const AdminApproval = require("../models/AdminApproval");

const adminChangeRequestSchema = Joi.object({
  requestType: Joi.string()
    .valid(
      "personal_info_change",
      "account_status_change",
      "role_change",
      "password_reset",
    )
    .required(),
  changes: Joi.object().required(),
  reason: Joi.string().trim().min(5).max(500).required(),
});

// POST /api/auth/admin/admins/:adminId/request-change - Request a change to an admin account (requires approval)
router.post(
  "/admin/admins/:adminId/request-change",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  validateBody(adminChangeRequestSchema),
  async (req, res) => {
    try {
      const requesterId = req._userId;
      const targetAdminId = req.params.adminId;

      if (!mongoose.Types.ObjectId.isValid(targetAdminId)) {
        return respond.error(res, 400, "invalid_id", "Invalid admin ID");
      }

      const targetAdmin = await User.findById(targetAdminId).populate("role");
      if (!targetAdmin) {
        return respond.error(
          res,
          404,
          "admin_not_found",
          "Admin user not found",
        );
      }

      const targetRoleSlug = targetAdmin.role?.slug || "";
      if (targetRoleSlug !== "admin") {
        return respond.error(
          res,
          400,
          "not_admin_user",
          "Target user is not an admin",
        );
      }

      // Admins cannot request changes to their own account through this endpoint
      if (String(targetAdminId) === String(requesterId)) {
        return respond.error(
          res,
          400,
          "self_change_not_allowed",
          "You cannot request changes to your own admin account through this endpoint",
        );
      }

      const { requestType, changes, reason } = req.body;

      // Build request details based on type
      const oldValues = {};
      const newValues = {};

      switch (requestType) {
        case "personal_info_change": {
          if (changes.firstName !== undefined) {
            oldValues.firstName = targetAdmin.firstName || "";
            newValues.firstName = sanitizeNameField(changes.firstName);
          }
          if (changes.lastName !== undefined) {
            oldValues.lastName = targetAdmin.lastName || "";
            newValues.lastName = sanitizeNameField(changes.lastName);
          }
          if (changes.phoneNumber !== undefined) {
            oldValues.phoneNumber = targetAdmin.phoneNumber || "";
            newValues.phoneNumber = sanitizePhoneNumber(
              String(changes.phoneNumber || ""),
            );
          }
          if (changes.email !== undefined) {
            const normalized = sanitizeEmail(changes.email || "");
            if (!normalized)
              return respond.error(res, 400, "invalid_email", "Invalid email");
            if (normalized !== targetAdmin.email) {
              const exists = await User.findOne({ email: normalized }).lean();
              if (exists && String(exists._id) !== String(targetAdmin._id)) {
                return respond.error(
                  res,
                  409,
                  "email_exists",
                  "Email already in use",
                );
              }
            }
            oldValues.email = targetAdmin.email || "";
            newValues.email = normalized;
          }
          if (Object.keys(newValues).length === 0) {
            return respond.error(
              res,
              400,
              "no_changes",
              "No valid changes provided",
            );
          }
          break;
        }
        case "account_status_change": {
          if (changes.isActive === undefined) {
            return respond.error(
              res,
              400,
              "missing_field",
              "isActive is required for account status change",
            );
          }
          oldValues.isActive = String(targetAdmin.isActive !== false);
          newValues.isActive = String(!!changes.isActive);
          break;
        }
        case "password_reset": {
          newValues.passwordReset = true;
          break;
        }
        default:
          return respond.error(
            res,
            400,
            "invalid_request_type",
            "Invalid request type",
          );
      }

      const approvalId = AdminApproval.generateApprovalId();
      const approval = await AdminApproval.create({
        approvalId,
        requestType,
        userId: targetAdminId,
        requestedBy: requesterId,
        requestDetails: {
          oldValues,
          newValues,
          fields: Object.keys(newValues),
          reason,
          targetIsAdmin: true,
        },
        status: "pending",
        requiredApprovals: 2,
        metadata: {
          ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
        },
      });

      const ip =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const changedFields = Object.keys(newValues);
      const fieldChanged = changedFields[0] || "admin_change";
      await logAuditEvent(
        targetAdminId,
        "admin_approval",
        "User",
        targetAdminId,
        {
          role: "admin",
          fieldChanged,
          oldValue: JSON.stringify(oldValues),
          newValue: JSON.stringify(newValues),
          ip,
          userAgent,
          approvalId,
          requestType,
          requestedBy: requesterId,
          reason,
        },
      );

      return res.status(201).json({
        success: true,
        approval: {
          approvalId: approval.approvalId,
          requestType: approval.requestType,
          status: approval.status,
          requiredApprovals: approval.requiredApprovals,
          message:
            "Approval request created. Waiting for 2 admin approvals before the change is applied.",
        },
      });
    } catch (err) {
      console.error(
        "POST /api/auth/admin/admins/:adminId/request-change error:",
        err,
      );
      return respond.error(
        res,
        500,
        "admin_change_request_failed",
        "Failed to create admin change request",
      );
    }
  },
);

// GET /api/auth/admin/admins/:adminId/pending-approvals - Get pending approvals for an admin
router.get(
  "/admin/admins/:adminId/pending-approvals",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { adminId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return respond.error(res, 400, "invalid_id", "Invalid admin ID");
      }

      const approvals = await AdminApproval.find({
        userId: adminId,
        status: "pending",
      })
        .populate("requestedBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        approvals: approvals.map((a) => ({
          approvalId: a.approvalId,
          requestType: a.requestType,
          requestDetails: a.requestDetails,
          status: a.status,
          requiredApprovals: a.requiredApprovals,
          currentApprovals: a.approvals?.length || 0,
          requestedBy: a.requestedBy,
          createdAt: a.createdAt,
        })),
      });
    } catch (err) {
      console.error(
        "GET /api/auth/admin/admins/:adminId/pending-approvals error:",
        err,
      );
      return respond.error(
        res,
        500,
        "pending_approvals_failed",
        "Failed to fetch pending approvals",
      );
    }
  },
);

router.get(
  "/users/count",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { role } = req.query;
      const filter = {};
      if (role) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) filter.role = roleDoc._id;
      }
      const count = await User.countDocuments(filter);
      return respond.success(res, 200, { count });
    } catch (err) {
      console.error("GET /api/auth/users/count error:", err);
      return respond.error(res, 500, "count_failed", "User count failed");
    }
  },
);

router.get(
  "/users/search",
  requireJwt,
  requireRole(["admin", "staff", "lgu_officer"]),
  async (req, res) => {
    try {
      const { q, role } = req.query;

      const roleDoc = role ? await Role.findOne({ slug: role }) : null;

      // Build filter - only filter by role if specified
      // NOTE: firstName/lastName are encrypted with randomized encryption, so regex won't work
      // We fetch all users with the role and filter after Mongoose decryption hooks run
      const filter = {};
      if (roleDoc) filter.role = roleDoc._id;

      // Fetch users WITHOUT .lean() so Mongoose decryption hooks run
      const allUserDocs = await User.find(filter)
        .select("firstName lastName email phoneNumber isActive _id createdAt")
        .limit(200);

      // Convert to plain objects after decryption
      const allUsers = allUserDocs.map((doc) => doc.toObject());

      // If no search query, return all (up to limit)
      if (!q || q.length < 2) {
        return respond.success(res, 200, allUsers.slice(0, 50));
      }

      // Filter by search term after decryption
      const searchLower = q.toLowerCase();
      const users = allUsers
        .filter((u) => {
          const firstName = (u.firstName || "").toLowerCase();
          const lastName = (u.lastName || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          return (
            firstName.includes(searchLower) ||
            lastName.includes(searchLower) ||
            email.includes(searchLower)
          );
        })
        .slice(0, 50); // Limit final results

      return respond.success(res, 200, users);
    } catch (err) {
      console.error("GET /api/auth/users/search error:", err);
      return respond.error(res, 500, "search_failed", "User search failed");
    }
  },
);

module.exports = router;
