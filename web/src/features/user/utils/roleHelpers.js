/**
 * Role Helper Utilities
 * Centralized role checking and permission helpers
 */

/**
 * Get normalized role slug from role object
 * @param {object|string} role - Role object or role string
 * @returns {string} Normalized role slug
 */
export function getRoleSlug(role) {
  if (!role) return 'user'
  
  if (typeof role === 'string') {
    return role.toLowerCase()
  }
  
  if (role?.slug) {
    return String(role.slug).toLowerCase()
  }
  
  return 'user'
}

/**
 * Check if user is business owner
 * @param {object|string} role - Role object or role string
 * @returns {boolean}
 */
export function isBusinessOwner(role) {
  return getRoleSlug(role) === 'business_owner'
}

/**
 * Check if user is staff role (lgu_officer, inspector, staff)
 * @param {object|string} role - Role object or role string
 * @returns {boolean}
 */
export function isStaffRole(role) {
  const roleSlug = getRoleSlug(role)
  return ['lgu_officer', 'inspector', 'staff'].includes(roleSlug)
}

/**
 * Check if user is admin
 * @param {object|string} role - Role object or role string
 * @returns {boolean}
 */
export function isAdmin(role) {
  return getRoleSlug(role) === 'admin'
}

/**
 * Check if user can edit profile fields
 * @param {object|string} role - Role object or role string
 * @returns {boolean}
 */
export function canEditProfile(role) {
  const roleSlug = getRoleSlug(role)
  // Business owners can edit their profile
  // Staff and admins have limited editing capabilities
  return roleSlug === 'business_owner'
}

/**
 * Check if user can delete account
 * @param {object|string} role - Role object or role string
 * @returns {boolean}
 */
export function canDeleteAccount(role) {
  return isBusinessOwner(role)
}

/**
 * Get available profile sections for role
 * @param {object|string} role - Role object or role string
 * @returns {Array<string>} Available section keys
 */
export function getAvailableProfileSections(role) {
  if (isStaffRole(role) || isAdmin(role)) {
    // Staff and admin: only security sections
    return ['mfa', 'password', 'email', 'sessions']
  }
  
  if (isBusinessOwner(role)) {
    // Business owner: all sections
    return ['basicInfo', 'address', 'personalInfo', 'mfa', 'password', 'email', 'sessions', 'deleteAccount']
  }
  
  // Regular users: basic info and security
  return ['basicInfo', 'mfa', 'password', 'email', 'sessions']
}

/**
 * Check if user can access specific profile section
 * @param {string} section - Section key
 * @param {object|string} role - Role object or role string
 * @returns {boolean}
 */
export function canAccessSection(section, role) {
  const availableSections = getAvailableProfileSections(role)
  return availableSections.includes(section)
}