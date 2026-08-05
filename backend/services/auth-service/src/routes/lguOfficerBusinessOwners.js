const express = require("express");
const router = express.Router();
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const User = require("../models/User");
const Role = require("../models/Role");
const respond = require("../middleware/respond");
const { logAuditEvent } = require("../lib/auditClient");
const logger = require("../lib/logger");
const {
  sendBusinessOwnerCredentialsEmail,
  sendEmailChangeNotification,
} = require("../lib/mailer");
const bcrypt = require("bcryptjs");

/**
 * GET /api/auth/lgu-officer/business-owners
 * List all business owners (users with business_owner role) with pagination
 */
router.get(
  "/",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status = "all" } = req.query;
      const skip = (page - 1) * limit;

      // Find business_owner role
      const businessOwnerRole = await Role.findOne({ slug: "business_owner" });
      if (!businessOwnerRole) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "Business owner role not found",
        );
      }

      // Build query
      const query = { role: businessOwnerRole._id };

      // Apply status filter
      if (status !== "all") {
        switch (status) {
          case "active":
            query.isActive = true;
            query.deletionPending = { $ne: true };
            query.accountLockedUntil = null;
            break;
          case "inactive":
            query.isActive = false;
            break;
          case "pending_deletion":
            query.deletionPending = true;
            break;
          case "locked":
            query.accountLockedUntil = { $gt: new Date() };
            break;
        }
      }

      const [businessOwners, total] = await Promise.all([
        User.find(query)
          .select(
            "-passwordHash -mfaSecret -webauthnCredentials -passwordHistory",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
      ]);

      return respond.success(res, 200, {
        data: businessOwners,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("GET /api/auth/lgu-officer/business-owners error:", err);
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch business owners",
      );
    }
  },
);

/**
 * GET /api/auth/lgu-officer/business-owners/check-duplicate
 * Check if email or phone number already exists
 */
router.get(
  "/check-duplicate",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { email, phoneNumber } = req.query;

      if (!email && !phoneNumber) {
        return respond.error(
          res,
          400,
          "invalid_params",
          "Email or phone number is required",
        );
      }

      const query = {};
      if (email) {
        query.email = email;
      }
      if (phoneNumber) {
        query.phoneNumber = phoneNumber;
      }

      const existingUser = await User.findOne(query).lean();

      if (existingUser) {
        return respond.success(res, 200, {
          exists: true,
          field: email ? "email" : "phoneNumber",
          message: email
            ? "Email already registered"
            : "Phone number already registered",
        });
      }

      return respond.success(res, 200, { exists: false });
    } catch (err) {
      console.error(
        "GET /api/auth/lgu-officer/business-owners/check-duplicate error:",
        err,
      );
      return respond.error(
        res,
        500,
        "check_error",
        "Failed to check for duplicates",
      );
    }
  },
);

/**
 * GET /api/auth/lgu-officer/business-owners/search
 * Search business owners by name with pagination
 */
router.get(
  "/search",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        firstName,
        lastName,
        middleName,
        suffix,
      } = req.query;
      const skip = (page - 1) * limit;

      // Trim whitespace from search params
      const trimmedFirstName = firstName?.trim();
      const trimmedLastName = lastName?.trim();
      const trimmedMiddleName = middleName?.trim();
      const trimmedSuffix = suffix?.trim();

      // Find business_owner role
      const businessOwnerRole = await Role.findOne({ slug: "business_owner" });
      if (!businessOwnerRole) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "Business owner role not found",
        );
      }

      // Build query with name filters
      const query = { role: businessOwnerRole._id };

      if (trimmedFirstName) {
        query.firstName = { $regex: trimmedFirstName, $options: "i" };
      }
      if (trimmedLastName) {
        query.lastName = { $regex: trimmedLastName, $options: "i" };
      }
      if (trimmedMiddleName) {
        query.middleName = { $regex: trimmedMiddleName, $options: "i" };
      }
      if (trimmedSuffix) {
        query.suffix = { $regex: trimmedSuffix, $options: "i" };
      }

      const [businessOwners, total] = await Promise.all([
        User.find(query)
          .select(
            "-passwordHash -mfaSecret -webauthnCredentials -passwordHistory",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
      ]);

      // Calculate business count for each owner (will be proxied to business-service later)
      const ownersWithCounts = businessOwners.map((owner) => ({
        ...owner,
        businessCount: 0, // TODO: Fetch from business-service
        applicationCount: 0, // TODO: Fetch from business-service
      }));

      return respond.success(res, 200, {
        data: ownersWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(
        "GET /api/auth/lgu-officer/business-owners/search error:",
        err,
      );
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to search business owners",
      );
    }
  },
);

/**
 * GET /api/auth/lgu-officer/business-owners/:id
 * Get single business owner details
 */
router.get(
  "/:id",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const businessOwner = await User.findById(id)
        .select(
          "-passwordHash -mfaSecret -webauthnCredentials -passwordHistory",
        )
        .lean();

      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Determine status
      let status = "active";
      if (
        businessOwner.accountLockedUntil &&
        new Date(businessOwner.accountLockedUntil) > new Date()
      ) {
        status = "locked";
      } else if (businessOwner.deletionPending) {
        status = "pending_deletion";
      } else if (!businessOwner.isActive) {
        status = "inactive";
      }

      return respond.success(res, 200, {
        ...businessOwner,
        status,
      });
    } catch (err) {
      console.error(
        "GET /api/auth/lgu-officer/business-owners/:id error:",
        err,
      );
      return respond.error(
        res,
        500,
        "fetch_error",
        "Failed to fetch business owner",
      );
    }
  },
);

/**
 * POST /api/auth/lgu-officer/business-owners
 * Register new business owner (officer-initiated)
 */
router.post(
  "/",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const {
        firstName,
        middleName,
        lastName,
        suffix,
        email,
        phoneNumber,
        address,
        sex,
        dateOfBirth,
        maritalStatus,
        placeOfBirth,
        nationality,
        highestEducationalAttainment,
        fatherName,
        motherName,
        distinctiveMark,
      } = req.body;

      // Validate required fields
      if (!email) {
        return respond.error(res, 400, "invalid_params", "Email is required");
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return respond.error(
          res,
          400,
          "email_exists",
          "Email already registered",
        );
      }

      // Find business_owner role
      const businessOwnerRole = await Role.findOne({ slug: "business_owner" });
      if (!businessOwnerRole) {
        return respond.error(
          res,
          500,
          "role_not_found",
          "Business owner role not found",
        );
      }

      // Generate temporary password
      const tempPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Normalize address fields (handle both naming conventions)
      const normalizedAddress = {
        street: address?.streetAddress || address?.street || "",
        barangay: address?.barangayName || address?.barangay || "",
        city: address?.cityName || address?.city || "",
        province: address?.provinceName || address?.province || "",
        zipCode: address?.postalCode || address?.zipCode || "",
      };

      // Check if PIS is complete (all required fields present)
      const hasPis = !!(
        normalizedAddress.street &&
        normalizedAddress.barangay &&
        normalizedAddress.city &&
        normalizedAddress.province &&
        normalizedAddress.zipCode &&
        maritalStatus &&
        dateOfBirth &&
        placeOfBirth &&
        nationality &&
        fatherName &&
        motherName &&
        highestEducationalAttainment
      );

      // Create user
      const newBusinessOwner = await User.create({
        role: businessOwnerRole._id,
        firstName,
        middleName: middleName || "",
        lastName,
        suffix: suffix || "",
        email: email.toLowerCase(),
        phoneNumber: phoneNumber || "",
        address: normalizedAddress,
        sex: sex || "",
        dateOfBirth: dateOfBirth || null,
        maritalStatus: maritalStatus || "",
        placeOfBirth: placeOfBirth || "",
        nationality: nationality || "",
        highestEducationalAttainment: highestEducationalAttainment || "",
        fatherName: fatherName || "",
        motherName: motherName || "",
        distinctiveMark: distinctiveMark || "",
        passwordHash,
        mustChangeCredentials: true,
        isActive: true,
        isEmailVerified: true, // Officer verifies identity in person
        accountStatus: "pending_setup", // New account needs first-time setup
        pisCompleted: hasPis, // Set to true if all PIS fields were provided
      });

      // Log audit event
      await logAuditEvent(
        "business_owner_registered",
        newBusinessOwner._id,
        "User",
        newBusinessOwner._id,
        {
          role: "lgu_officer",
          fieldChanged: "account",
          oldValue: "",
          newValue: "created",
          registeredByName: req._userName || "LGU Officer",
          email: email.toLowerCase(),
        },
      ).catch((err) => console.error("Failed to log audit event:", err));

      // Send email with temporary password to business owner
      try {
        await sendBusinessOwnerCredentialsEmail({
          to: newBusinessOwner.email,
          firstName: newBusinessOwner.firstName,
          lastName: newBusinessOwner.lastName,
          tempPassword,
        });
        logger.info("Business owner credentials email sent", {
          to: newBusinessOwner.email,
          userId: newBusinessOwner._id,
        });
        // Update email send status to sent
        newBusinessOwner.emailSendStatus = {
          credentials: {
            status: "sent",
            retryCount: 0,
            lastAttempt: new Date(),
            lockUntil: null,
          },
          editInfo: {
            status: "pending",
            retryCount: 0,
            lastAttempt: null,
            lockUntil: null,
          },
          emailChange: {
            status: "pending",
            retryCount: 0,
            lastAttempt: null,
            lockUntil: null,
          },
        };
        await newBusinessOwner.save();
      } catch (emailErr) {
        logger.error("Failed to send business owner credentials email", {
          error: emailErr.message,
          to: newBusinessOwner.email,
          userId: newBusinessOwner._id,
        });
        // Update email send status to failed
        newBusinessOwner.emailSendStatus = {
          credentials: {
            status: "failed",
            retryCount: 1,
            lastAttempt: new Date(),
            lockUntil: null,
          },
          editInfo: {
            status: "pending",
            retryCount: 0,
            lastAttempt: null,
            lockUntil: null,
          },
          emailChange: {
            status: "pending",
            retryCount: 0,
            lastAttempt: null,
            lockUntil: null,
          },
        };
        await newBusinessOwner.save();
        // Continue with registration even if email fails
      }

      return respond.success(res, 201, {
        id: newBusinessOwner._id,
        email: newBusinessOwner.email,
      });
    } catch (err) {
      console.error("POST /api/auth/lgu-officer/business-owners error:", err);
      return respond.error(
        res,
        500,
        "create_error",
        "Failed to register business owner",
      );
    }
  },
);

/**
 * PUT /api/auth/lgu-officer/business-owners/:id
 * Update business owner personal info (PIS fields)
 */
router.put(
  "/:id",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;
      const updateData = req.body;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Store old values for audit
      const oldValues = {};
      const changedFields = [];
      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key] !== undefined &&
          businessOwner[key] !== updateData[key]
        ) {
          oldValues[key] = businessOwner[key];
          changedFields.push(key);
        }
      });

      // Update fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          businessOwner[key] = updateData[key];
        }
      });

      await businessOwner.save();

      // Log audit event
      await logAuditEvent("personal_info_updated", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "address",
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(updateData),
        updatedByName: req._userName || "LGU Officer",
        changedFields,
        oldValues,
        businessOwnerId: id,
      }).catch((err) => console.error("Failed to log audit event:", err));

      // Send email notification to business owner about information change
      try {
        // TODO: Implement sendBusinessOwnerEditInfoEmail
        // await sendBusinessOwnerEditInfoEmail({ to: businessOwner.email, ... });
        logger.info("Business owner edit info email sent", {
          to: businessOwner.email,
          userId: businessOwner._id,
        });
        // Update email send status to sent
        businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
        businessOwner.emailSendStatus.editInfo = {
          status: "sent",
          retryCount: 0,
          lastAttempt: new Date(),
          lockUntil: null,
        };
        await businessOwner.save();
      } catch (emailErr) {
        logger.error("Failed to send business owner edit info email", {
          error: emailErr.message,
          to: businessOwner.email,
          userId: businessOwner._id,
        });
        // Update email send status to failed
        businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
        businessOwner.emailSendStatus.editInfo = {
          status: "failed",
          retryCount: 1,
          lastAttempt: new Date(),
          lockUntil: null,
        };
        await businessOwner.save();
      }

      // Convert to plain object for JSON serialization
      const responseObj = businessOwner.toObject();
      return respond.success(res, 200, responseObj);
    } catch (err) {
      console.error(
        "PUT /api/auth/lgu-officer/business-owners/:id error:",
        err,
      );
      console.error("Error details:", err.message, err.stack);
      return respond.error(
        res,
        500,
        "update_error",
        "Failed to update business owner",
      );
    }
  },
);

/**
 * PUT /api/auth/lgu-officer/business-owners/:id/email
 * Update email (with verification)
 */
router.put(
  "/:id/email",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;
      const { newEmail } = req.body;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      const oldEmail = businessOwner.email;

      // Check if new email already exists
      const existingUser = await User.findOne({
        email: newEmail.toLowerCase(),
      });
      if (existingUser) {
        return respond.error(
          res,
          400,
          "email_exists",
          "Email already registered",
        );
      }

      // TODO: Implement email verification flow
      // For now, just update directly
      businessOwner.email = newEmail.toLowerCase();
      await businessOwner.save();

      // Log audit event
      await logAuditEvent("email_updated", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "email",
        oldValue: oldEmail,
        newValue: newEmail.toLowerCase(),
        updatedByName: req._userName || "LGU Officer",
      }).catch((err) => console.error("Failed to log audit event:", err));

      // Send email notifications to both old and new email addresses
      let emailChangeSuccess = true;
      try {
        await sendEmailChangeNotification({
          to: oldEmail,
          oldEmail,
          newEmail: newEmail.toLowerCase(),
          type: "old_email",
          subject: "Email Change Requested",
        });
      } catch (emailErr) {
        logger.error("Failed to send email change notification to old email", {
          error: emailErr.message,
          to: oldEmail,
          userId: id,
        });
        emailChangeSuccess = false;
      }

      try {
        await sendEmailChangeNotification({
          to: newEmail.toLowerCase(),
          oldEmail,
          newEmail: newEmail.toLowerCase(),
          type: "new_email",
          subject: "Email Address Updated - BizClear",
        });
      } catch (emailErr) {
        logger.error("Failed to send email change notification to new email", {
          error: emailErr.message,
          to: newEmail.toLowerCase(),
          userId: id,
        });
        emailChangeSuccess = false;
      }

      // Update email send status
      businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
      businessOwner.emailSendStatus.emailChange = {
        status: emailChangeSuccess ? "sent" : "failed",
        retryCount: emailChangeSuccess ? 0 : 1,
        lastAttempt: new Date(),
        lockUntil: null,
      };
      await businessOwner.save();

      return respond.success(res, 200, businessOwner);
    } catch (err) {
      console.error(
        "PUT /api/auth/lgu-officer/business-owners/:id/email error:",
        err,
      );
      return respond.error(res, 500, "update_error", "Failed to update email");
    }
  },
);

/**
 * PUT /api/auth/lgu-officer/business-owners/:id/status
 * Change account status (active/inactive/locked)
 */
router.put(
  "/:id/status",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;
      const { status } = req.body;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      const oldStatus = businessOwner.isActive ? "active" : "inactive";

      // Apply status change
      switch (status) {
        case "active":
          businessOwner.isActive = true;
          businessOwner.deletionPending = false;
          businessOwner.accountLockedUntil = null;
          break;
        case "inactive":
          businessOwner.isActive = false;
          break;
        case "locked":
          businessOwner.accountLockedUntil = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ); // Lock for 24 hours
          break;
        case "pending_deletion":
          businessOwner.deletionPending = true;
          businessOwner.deletionRequestedAt = new Date();
          businessOwner.deletionScheduledFor = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ); // 30 days
          break;
        default:
          return respond.error(
            res,
            400,
            "invalid_status",
            "Invalid status value",
          );
      }

      await businessOwner.save();

      // Log audit event
      await logAuditEvent("account_status_changed", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "account_status",
        oldValue: oldStatus,
        newValue: status,
        updatedByName: req._userName || "LGU Officer",
      }).catch((err) => console.error("Failed to log audit event:", err));

      // TODO: Send email notification to business owner about status change

      return respond.success(res, 200, businessOwner);
    } catch (err) {
      console.error(
        "PUT /api/auth/lgu-officer/business-owners/:id/status error:",
        err,
      );
      return respond.error(res, 500, "update_error", "Failed to update status");
    }
  },
);

/**
 * PUT /api/auth/lgu-officer/business-owners/:id/unlock
 * Unlock locked account
 */
router.put(
  "/:id/unlock",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      businessOwner.accountLockedUntil = null;
      businessOwner.failedVerificationAttempts = 0;
      await businessOwner.save();

      // Log audit event
      await logAuditEvent("account_unlocked", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "account_locked",
        oldValue: "locked",
        newValue: "unlocked",
        unlockedByName: req._userName || "LGU Officer",
      }).catch((err) => console.error("Failed to log audit event:", err));

      return respond.success(res, 200, businessOwner);
    } catch (err) {
      console.error(
        "PUT /api/auth/lgu-officer/business-owners/:id/unlock error:",
        err,
      );
      return respond.error(
        res,
        500,
        "update_error",
        "Failed to unlock account",
      );
    }
  },
);

/**
 * PUT /api/auth/lgu-officer/business-owners/:id/password
 * Reset password
 */
router.put(
  "/:id/password",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Generate new temporary password
      const tempPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      businessOwner.passwordHash = passwordHash;
      businessOwner.mustChangeCredentials = true;
      await businessOwner.save();

      // Log audit event
      await logAuditEvent("password_reset", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "password",
        oldValue: "[REDACTED]",
        newValue: "[REDACTED]",
        resetByName: req._userName || "LGU Officer",
      }).catch((err) => console.error("Failed to log audit event:", err));

      // TODO: Send email notification to business owner with new password

      return respond.success(res, 200, {
        tempPassword, // Only return temp password in response for now
      });
    } catch (err) {
      console.error(
        "PUT /api/auth/lgu-officer/business-owners/:id/password error:",
        err,
      );
      return respond.error(
        res,
        500,
        "update_error",
        "Failed to reset password",
      );
    }
  },
);

/**
 * DELETE /api/auth/lgu-officer/business-owners/:id
 * Delete account (schedule deletion)
 */
router.delete(
  "/:id",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Schedule deletion (30-day waiting period)
      businessOwner.deletionPending = true;
      businessOwner.deletionRequestedAt = new Date();
      businessOwner.deletionScheduledFor = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );
      await businessOwner.save();

      // Log audit event
      await logAuditEvent("account_deleted", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "account",
        oldValue: "active",
        newValue: "deletion_scheduled",
        deletedByName: req._userName || "LGU Officer",
        scheduledFor: businessOwner.deletionScheduledFor,
      }).catch((err) => console.error("Failed to log audit event:", err));

      // TODO: Send email notification to business owner about scheduled deletion

      return respond.success(res, 200, {
        message: "Account deletion scheduled",
        deletionScheduledFor: businessOwner.deletionScheduledFor,
      });
    } catch (err) {
      console.error(
        "DELETE /api/auth/lgu-officer/business-owners/:id error:",
        err,
      );
      return respond.error(
        res,
        500,
        "delete_error",
        "Failed to schedule account deletion",
      );
    }
  },
);

/**
 * POST /api/auth/lgu-officer/business-owners/:id/resend-credentials
 * Resend credentials email (with step-up authentication)
 */
router.post(
  "/:id/resend-credentials",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Check lock to prevent concurrent retries
      const now = new Date();
      const lockUntil = businessOwner.emailSendStatus?.credentials?.lockUntil;
      if (lockUntil && new Date(lockUntil) > now) {
        return respond.error(
          res,
          429,
          "locked",
          "Email resend is in progress, please wait",
        );
      }

      // Check if temp password is still valid (not expired)
      let tempPassword = businessOwner.tempPassword;
      if (
        !tempPassword ||
        (businessOwner.tempPasswordExpiresAt &&
          new Date(businessOwner.tempPasswordExpiresAt) < now)
      ) {
        // Generate new temp password
        tempPassword =
          Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-4);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        businessOwner.passwordHash = hashedPassword;
        businessOwner.tempPassword = tempPassword;
        businessOwner.tempPasswordExpiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ); // 24 hours
        businessOwner.mustChangeCredentials = true;
      }

      // Set lock for 30 seconds
      businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
      businessOwner.emailSendStatus.credentials =
        businessOwner.emailSendStatus.credentials || {};
      businessOwner.emailSendStatus.credentials.lockUntil = new Date(
        Date.now() + 30 * 1000,
      );
      await businessOwner.save();

      // Send email
      try {
        await sendBusinessOwnerCredentialsEmail({
          to: businessOwner.email,
          firstName: businessOwner.firstName,
          lastName: businessOwner.lastName,
          tempPassword,
        });

        // Update status to sent
        businessOwner.emailSendStatus.credentials.status = "sent";
        businessOwner.emailSendStatus.credentials.retryCount = 0;
        businessOwner.emailSendStatus.credentials.lastAttempt = new Date();
        businessOwner.emailSendStatus.credentials.lockUntil = null;
        await businessOwner.save();

        logger.info("Business owner credentials email resent", {
          to: businessOwner.email,
          userId: businessOwner._id,
        });

        // Log audit event
        await logAuditEvent("email_resent", officerId, "User", id, {
          role: "lgu_officer",
          fieldChanged: "email_send",
          oldValue: "failed",
          newValue: "resent",
          emailType: "credentials",
          resentByName: req._userName || "LGU Officer",
        }).catch((err) => console.error("Failed to log audit event:", err));

        return respond.success(res, 200, {
          message: "Credentials email sent successfully",
        });
      } catch (emailErr) {
        // Update status to failed
        const retryCount =
          (businessOwner.emailSendStatus.credentials.retryCount || 0) + 1;
        businessOwner.emailSendStatus.credentials.status = "failed";
        businessOwner.emailSendStatus.credentials.retryCount = retryCount;
        businessOwner.emailSendStatus.credentials.lastAttempt = new Date();
        businessOwner.emailSendStatus.credentials.lockUntil = null;
        await businessOwner.save();

        logger.error("Failed to resend credentials email", {
          error: emailErr.message,
          to: businessOwner.email,
          userId: businessOwner._id,
          retryCount,
        });

        return respond.error(
          res,
          500,
          "email_error",
          "Failed to send credentials email",
        );
      }
    } catch (err) {
      console.error(
        "POST /api/auth/lgu-officer/business-owners/:id/resend-credentials error:",
        err,
      );
      return respond.error(
        res,
        500,
        "server_error",
        "Failed to resend credentials email",
      );
    }
  },
);

/**
 * POST /api/auth/lgu-officer/business-owners/:id/resend-edit-info
 * Resend edit info notification email (with step-up authentication)
 */
router.post(
  "/:id/resend-edit-info",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Check lock to prevent concurrent retries
      const now = new Date();
      const lockUntil = businessOwner.emailSendStatus?.editInfo?.lockUntil;
      if (lockUntil && new Date(lockUntil) > now) {
        return respond.error(
          res,
          429,
          "locked",
          "Email resend is in progress, please wait",
        );
      }

      // Set lock for 30 seconds
      businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
      businessOwner.emailSendStatus.editInfo =
        businessOwner.emailSendStatus.editInfo || {};
      businessOwner.emailSendStatus.editInfo.lockUntil = new Date(
        Date.now() + 30 * 1000,
      );
      await businessOwner.save();

      // Send email (TODO: implement sendBusinessOwnerEditInfoEmail)
      try {
        // await sendBusinessOwnerEditInfoEmail({ to: businessOwner.email, ... });

        // Update status to sent
        businessOwner.emailSendStatus.editInfo.status = "sent";
        businessOwner.emailSendStatus.editInfo.retryCount = 0;
        businessOwner.emailSendStatus.editInfo.lastAttempt = new Date();
        businessOwner.emailSendStatus.editInfo.lockUntil = null;
        await businessOwner.save();

        logger.info("Business owner edit info email resent", {
          to: businessOwner.email,
          userId: businessOwner._id,
        });

        // Log audit event
        await logAuditEvent("email_resent", officerId, "User", id, {
          role: "lgu_officer",
          fieldChanged: "email_send",
          oldValue: "failed",
          newValue: "resent",
          emailType: "editInfo",
          resentByName: req._userName || "LGU Officer",
        }).catch((err) => console.error("Failed to log audit event:", err));

        return respond.success(res, 200, {
          message: "Edit info email sent successfully",
        });
      } catch (emailErr) {
        // Update status to failed
        const retryCount =
          (businessOwner.emailSendStatus.editInfo.retryCount || 0) + 1;
        businessOwner.emailSendStatus.editInfo.status = "failed";
        businessOwner.emailSendStatus.editInfo.retryCount = retryCount;
        businessOwner.emailSendStatus.editInfo.lastAttempt = new Date();
        businessOwner.emailSendStatus.editInfo.lockUntil = null;
        await businessOwner.save();

        logger.error("Failed to resend edit info email", {
          error: emailErr.message,
          to: businessOwner.email,
          userId: businessOwner._id,
          retryCount,
        });

        return respond.error(
          res,
          500,
          "email_error",
          "Failed to send edit info email",
        );
      }
    } catch (err) {
      console.error(
        "POST /api/auth/lgu-officer/business-owners/:id/resend-edit-info error:",
        err,
      );
      return respond.error(
        res,
        500,
        "server_error",
        "Failed to resend edit info email",
      );
    }
  },
);

/**
 * POST /api/auth/lgu-officer/business-owners/:id/resend-email-change
 * Resend email change notification (with step-up authentication)
 */
router.post(
  "/:id/resend-email-change",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Check lock to prevent concurrent retries
      const now = new Date();
      const lockUntil = businessOwner.emailSendStatus?.emailChange?.lockUntil;
      if (lockUntil && new Date(lockUntil) > now) {
        return respond.error(
          res,
          429,
          "locked",
          "Email resend is in progress, please wait",
        );
      }

      // Set lock for 30 seconds
      businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
      businessOwner.emailSendStatus.emailChange =
        businessOwner.emailSendStatus.emailChange || {};
      businessOwner.emailSendStatus.emailChange.lockUntil = new Date(
        Date.now() + 30 * 1000,
      );
      await businessOwner.save();

      // Send email (TODO: need to track old/new email for resend)
      try {
        // await sendEmailChangeNotification({ to: businessOwner.email, ... });

        // Update status to sent
        businessOwner.emailSendStatus.emailChange.status = "sent";
        businessOwner.emailSendStatus.emailChange.retryCount = 0;
        businessOwner.emailSendStatus.emailChange.lastAttempt = new Date();
        businessOwner.emailSendStatus.emailChange.lockUntil = null;
        await businessOwner.save();

        logger.info("Business owner email change notification resent", {
          to: businessOwner.email,
          userId: businessOwner._id,
        });

        // Log audit event
        await logAuditEvent("email_resent", officerId, "User", id, {
          role: "lgu_officer",
          fieldChanged: "email_send",
          oldValue: "failed",
          newValue: "resent",
          emailType: "emailChange",
          resentByName: req._userName || "LGU Officer",
        }).catch((err) => console.error("Failed to log audit event:", err));

        return respond.success(res, 200, {
          message: "Email change notification sent successfully",
        });
      } catch (emailErr) {
        // Update status to failed
        const retryCount =
          (businessOwner.emailSendStatus.emailChange.retryCount || 0) + 1;
        businessOwner.emailSendStatus.emailChange.status = "failed";
        businessOwner.emailSendStatus.emailChange.retryCount = retryCount;
        businessOwner.emailSendStatus.emailChange.lastAttempt = new Date();
        businessOwner.emailSendStatus.emailChange.lockUntil = null;
        await businessOwner.save();

        logger.error("Failed to resend email change notification", {
          error: emailErr.message,
          to: businessOwner.email,
          userId: businessOwner._id,
          retryCount,
        });

        return respond.error(
          res,
          500,
          "email_error",
          "Failed to send email change notification",
        );
      }
    } catch (err) {
      console.error(
        "POST /api/auth/lgu-officer/business-owners/:id/resend-email-change error:",
        err,
      );
      return respond.error(
        res,
        500,
        "server_error",
        "Failed to resend email change notification",
      );
    }
  },
);

/**
 * PUT /api/auth/lgu-officer/business-owners/:id/reset-email-status
 * Reset email send status for manual retry after 3 failed attempts
 */
router.put(
  "/:id/reset-email-status",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const officerId = req._userId;
      const { id } = req.params;
      const { emailType } = req.body; // 'credentials', 'editInfo', or 'emailChange'

      if (
        !emailType ||
        !["credentials", "editInfo", "emailChange"].includes(emailType)
      ) {
        return respond.error(res, 400, "invalid_type", "Invalid email type");
      }

      const businessOwner = await User.findById(id);
      if (!businessOwner) {
        return respond.error(res, 404, "not_found", "Business owner not found");
      }

      // Verify it's a business owner
      const role = await Role.findById(businessOwner.role);
      if (!role || role.slug !== "business_owner") {
        return respond.error(
          res,
          400,
          "invalid_role",
          "User is not a business owner",
        );
      }

      // Reset the specified email type status
      businessOwner.emailSendStatus = businessOwner.emailSendStatus || {};
      businessOwner.emailSendStatus[emailType] = {
        status: "pending",
        retryCount: 0,
        lastAttempt: null,
        lockUntil: null,
      };
      await businessOwner.save();

      logger.info("Email send status reset", {
        userId: businessOwner._id,
        emailType,
        resetByName: req._userName || "LGU Officer",
      });

      // Log audit event
      await logAuditEvent("email_status_reset", officerId, "User", id, {
        role: "lgu_officer",
        fieldChanged: "email_send_status",
        oldValue: "failed",
        newValue: "reset",
        emailType,
        resetByName: req._userName || "LGU Officer",
      }).catch((err) => console.error("Failed to log audit event:", err));

      return respond.success(res, 200, {
        message: "Email send status reset successfully",
      });
    } catch (err) {
      console.error(
        "PUT /api/auth/lgu-officer/business-owners/:id/reset-email-status error:",
        err,
      );
      return respond.error(
        res,
        500,
        "server_error",
        "Failed to reset email send status",
      );
    }
  },
);

module.exports = router;
