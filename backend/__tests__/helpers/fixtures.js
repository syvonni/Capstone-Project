const User = require("../../services/auth-service/src/models/User");
const Role = require("../../services/auth-service/src/models/Role");
const bcrypt = require("bcryptjs");

/**
 * Generate unique email with timestamp
 * @param {string} prefix - Email prefix (e.g., 'businessowner', 'staff')
 * @returns {string}
 */
function generateUniqueEmail(prefix = "user") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${timestamp}${random}@example.com`;
}

/**
 * Generate unique phone number with timestamp
 * @param {string} prefix - Phone prefix (optional)
 * @returns {string}
 */
function generateUniquePhone(prefix = "") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prefix ? `${prefix}${timestamp}${random}` : `+1${timestamp}${random}`;
}

/**
 * Create a test role
 * @param {string} slug - Role slug (e.g., 'business_owner', 'admin', 'lgu_officer')
 * @returns {Promise<Role>}
 */
async function createTestRole(slug) {
  let role = await Role.findOne({ slug });
  if (!role) {
    const roleNames = {
      business_owner: "Business Owner",
      admin: "Admin",
      lgu_officer: "LGU Officer",
      inspector: "LGU Inspector",
    };
    role = await Role.create({
      name: roleNames[slug] || slug,
      slug,
    });
  }
  return role;
}

/**
 * Create a test user with unique data
 */
async function createTestUser(options = {}) {
  const {
    roleSlug = "business_owner",
    email,
    phoneNumber,
    password = "Test123!@#",
    firstName,
    lastName,
    extraFields = {},
  } = options;

  const role = await createTestRole(roleSlug);
  const uniqueEmail = email || generateUniqueEmail(roleSlug);
  const uniquePhone =
    phoneNumber || generateUniquePhone(`__unset__${Date.now()}_`);

  const userData = {
    role: role._id,
    email: uniqueEmail,
    phoneNumber: uniquePhone,
    passwordHash: await bcrypt.hash(password, 10),
    termsAccepted: true,
    tokenVersion: 0,
    firstName:
      firstName ||
      (roleSlug === "business_owner"
        ? "Business"
        : roleSlug === "admin"
          ? "Admin"
          : "Staff"),
    lastName: lastName || "User",
    ...extraFields,
  };

  const user = await User.findOneAndUpdate({ email: uniqueEmail }, userData, {
    upsert: true,
    new: true,
  });

  await user.populate("role");
  return user;
}

/**
 * Create all standard test users (businessOwner, staff, admin)
 */
async function createTestUsers() {
  const businessOwnerRole = await createTestRole("business_owner");
  const staffRole = await createTestRole("lgu_officer");
  const adminRole = await createTestRole("admin");

  const businessOwner = await createTestUser({
    roleSlug: "business_owner",
    firstName: "Business",
    lastName: "Owner",
  });

  const staffUser = await createTestUser({
    roleSlug: "lgu_officer",
    firstName: "Staff",
    lastName: "User",
    extraFields: {
      isStaff: true,
      isActive: true,
    },
  });

  const adminUser = await createTestUser({
    roleSlug: "admin",
    firstName: "Admin",
    lastName: "User",
  });

  return {
    businessOwner,
    staffUser,
    adminUser,
    roles: {
      businessOwnerRole,
      staffRole,
      adminRole,
    },
  };
}

/**
 * Generate tokens for test users
 */
function getTestTokens(users) {
  const {
    signAccessToken,
  } = require("../../services/auth-service/src/middleware/auth");

  return {
    businessOwnerToken: signAccessToken(users.businessOwner).token,
    staffToken: signAccessToken(users.staffUser).token,
    adminToken: signAccessToken(users.adminUser).token,
  };
}

/**
 * Get headers for requests that require step-up (e.g. profile/personal-info, approvals).
 * Works for admin, lgu_officer, and any other role with step-up enabled.
 * Use with .set() for supertest: request(app).patch(...).set(...getStepUpHeaders(token, user))
 */
function getStepUpHeaders(token, user) {
  const {
    signStepUpToken,
  } = require("../../services/auth-service/src/middleware/auth");
  const stepUpToken = signStepUpToken(user._id).token;
  return {
    Authorization: `Bearer ${token}`,
    "X-Step-Up-Token": stepUpToken,
  };
}

/**
 * Get headers for admin requests that require step-up (e.g. profile/personal-info, approvals).
 * Use with .set() for supertest: request(app).patch(...).set(...getAdminStepUpHeaders(adminToken, adminUser))
 * @deprecated Use getStepUpHeaders instead (supports all roles)
 */
function getAdminStepUpHeaders(adminToken, adminUser) {
  return getStepUpHeaders(adminToken, adminUser);
}

/**
 * Create a test verification request
 */
async function createTestVerificationRequest(userId, purpose, method = "otp") {
  const {
    requestVerification,
  } = require("../../services/auth-service/src/lib/verificationService");
  return await requestVerification(userId, method, purpose);
}

module.exports = {
  generateUniqueEmail,
  generateUniquePhone,
  createTestRole,
  createTestUser,
  createTestUsers,
  getTestTokens,
  getStepUpHeaders,
  getAdminStepUpHeaders,
  createTestVerificationRequest,
};
