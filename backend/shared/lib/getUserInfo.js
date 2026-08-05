/**
 * Get User Info for Audit Logging
 * Returns user name and email for audit metadata
 */

const User = require("../../services/business-service/src/models/User");

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

module.exports = { getUserInfo };
