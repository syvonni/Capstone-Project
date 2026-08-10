import {
  UserOutlined,
  SafetyCertificateOutlined,
  TabletOutlined,
  LockOutlined,
  MailOutlined,
  DesktopOutlined,
  DeleteOutlined,
} from '@ant-design/icons'

export const PROFILE_NAV_ITEMS = [
  { key: 'general', label: 'General', icon: UserOutlined },
  { key: 'security', label: 'Security', icon: SafetyCertificateOutlined },
]

/** Business owner: General, Security (Account removed - merged into Security). */
export const PROFILE_NAV_ITEMS_OWNER = PROFILE_NAV_ITEMS

/** Staff and admin: Security only (no General, no Account). */
export const PROFILE_NAV_ITEMS_STAFF = PROFILE_NAV_ITEMS.filter(
  (n) => n.key !== 'general'
)

/** @deprecated Use PROFILE_NAV_ITEMS_STAFF for both staff and admin. */
export const PROFILE_NAV_ITEMS_STAFF_ADMIN = PROFILE_NAV_ITEMS_STAFF

/** Consolidated navigation items for all settings sections - flat structure without sections */
export const CONSOLIDATED_NAV_ITEMS = [
  // Personal Information (consolidated from Basic Info, Address, Personal Info)
  { key: 'personalInfo', label: 'Personal Information', icon: UserOutlined },
  
  // Security sections  
  { key: 'mfa', label: 'Multi-Factor Authentication', icon: TabletOutlined },
  { key: 'password', label: 'Password', icon: LockOutlined },
  { key: 'email', label: 'Email Address', icon: MailOutlined },
  { key: 'sessions', label: 'Active Sessions', icon: DesktopOutlined },
  { key: 'deleteAccount', label: 'Delete Account', icon: DeleteOutlined },
]

/** @deprecated - Personal Information is now a single consolidated tab */
export const GENERAL_SECTIONS = [
  { key: 'personalInfo', label: 'Personal Information', icon: UserOutlined },
]

/** Security sections (includes email and sessions from former Account tab) */
export const SECURITY_SECTIONS = [
  { key: 'mfa', label: 'Multi-Factor Authentication (MFA)', icon: TabletOutlined },
  { key: 'password', label: 'Password', icon: LockOutlined },
  { key: 'email', label: 'Email Address', icon: MailOutlined },
  { key: 'sessions', label: 'Active Sessions', icon: DesktopOutlined },
  { key: 'deleteAccount', label: 'Delete Account', icon: DeleteOutlined },
]

/** @deprecated - Account sections moved to Security tab */
export const ACCOUNT_SECTIONS = SECURITY_SECTIONS.filter((s) => s.key === 'email' || s.key === 'sessions')