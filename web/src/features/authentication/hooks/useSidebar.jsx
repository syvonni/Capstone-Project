import { useMemo, useState } from 'react'
import { useAuthSession } from '@/features/authentication'
import { useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  FileTextOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  QuestionCircleOutlined,
  FormOutlined,
  DollarOutlined,
  EditOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  EyeOutlined,
  StarOutlined,
  ShopOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  ApartmentOutlined,
  CheckSquareOutlined,
  CalculatorOutlined,
  WarningOutlined,
  GlobalOutlined,
  ToolOutlined,
} from '@ant-design/icons'

// Role keys used across the app: 'business_owner', 'admin', 'inspector', 'lgu_officer', 'user'
export default function useSidebar() {
  const { role, currentUser } = useAuthSession()
  const location = useLocation()

  const items = useMemo(() => {
    // Items are objects: { key, label, to?, type?, icon? }
    const staffOnboardingItems = [
      { key: 'onboarding', label: 'Account Setup', to: '/staff/onboarding', icon: <SafetyCertificateOutlined /> },
      { key: 'profile', label: 'Profile / Settings', to: '/settings-profile', icon: <UserOutlined /> },
      { key: 'logout', label: 'Logout', type: 'action', icon: <LogoutOutlined /> },
    ]

    const perRole = {
      business_owner: [], // Business owner routes use BusinessOwnerLayout (no sidebar)
      admin: [
        { key: 'dashboard', label: 'Dashboard', to: '/admin/dashboard', icon: <DashboardOutlined /> },
        { key: 'admin-requests', label: 'Requests', to: '/admin/requests', icon: <CheckCircleOutlined /> },
        { key: 'content-management', label: 'Content Management', to: '/admin/content-management', icon: <FileTextOutlined /> },
        { key: 'unified-business-permit', label: 'Unified Business Permit Form', to: '/admin/forms/business-permit', icon: <GlobalOutlined /> },
        { key: 'temporary-permits', label: 'Temporary Permit Forms', to: '/admin/forms/temporary-permits', icon: <FormOutlined /> },
        { key: 'fees', label: 'Fees', to: '/admin/fees', icon: <DollarOutlined /> },
        { key: 'variables', label: 'Variables', to: '/admin/variables', icon: <CalculatorOutlined /> },
        { key: 'documents', label: 'Claimable Documents', to: '/admin/documents', icon: <FileSearchOutlined /> },
        { key: 'post-requirements', label: 'Post Requirements', to: '/admin/post-requirements', icon: <CheckSquareOutlined /> },
        { key: 'violations', label: 'Violations', to: '/admin/violations', icon: <WarningOutlined /> },
        { key: 'inspections', label: 'Inspections', to: '/admin/inspections', icon: <CheckCircleOutlined /> },
        { key: 'lob', label: 'Lines of Business', to: '/admin/lob', icon: <ApartmentOutlined /> },
        { key: 'maintenance', label: 'Maintenance', to: '/admin/maintenance', icon: <ToolOutlined /> },
      ],
      staff: [
        { key: 'dashboard', label: 'Dashboard', to: '/staff', icon: <DashboardOutlined /> },
        { key: 'recovery', label: 'Request Recovery', to: '/staff/recovery-request', icon: <SafetyCertificateOutlined /> },
        { key: 'applications', label: 'Permit Applications (Review)', to: '/staff/applications', icon: <FileTextOutlined /> },
        { key: 'edit-requests', label: 'Edit Requests', to: '/staff/edit-requests', icon: <EditOutlined /> },
        { key: 'appeals', label: 'Appeals', to: '/staff/appeals', icon: <AuditOutlined /> },
        { key: 'reports', label: 'Reports / Analytics', to: '/staff/reports', icon: <BarChartOutlined /> },
        { key: 'support', label: 'Customer Support / Inquiry', to: '/staff/support', icon: <QuestionCircleOutlined /> },
        { key: 'profile', label: 'Profile / Settings', to: '/settings-profile', icon: <UserOutlined /> },
        { key: 'logout', label: 'Logout', type: 'action', icon: <LogoutOutlined /> },
      ],
      inspector: [
        { key: 'dashboard', label: 'Dashboard', to: '/staff', icon: <DashboardOutlined /> },
        { key: 'profile', label: 'Profile / Settings', to: '/settings-profile', icon: <UserOutlined /> },
        { key: 'logout', label: 'Logout', type: 'action', icon: <LogoutOutlined /> },
      ],
      lgu_officer: [
        { key: 'dashboard', label: 'Dashboard', to: '/staff', icon: <DashboardOutlined /> },
        { key: 'to-review', label: 'To Review', to: '/staff/to-review', icon: <EyeOutlined /> },
        { key: 'applications', label: 'Applications', to: '/staff/applications', icon: <FileTextOutlined /> },
        { key: 'permit-processing', label: 'Permit Processing', to: '/staff/permit-processing', icon: <FileProtectOutlined /> },
        { key: 'businesses', label: 'Businesses', to: '/staff/businesses', icon: <ShopOutlined /> },
        { key: 'business-owners', label: 'Business Owners', to: '/staff/business-owners', icon: <TeamOutlined /> },
        { key: 'help-requests', label: 'Help Requests', to: '/staff/help-requests', icon: <QuestionCircleOutlined /> },
        { key: 'ledger', label: 'Ledger', to: '/staff/ledger', icon: <DollarOutlined /> },
        { key: 'bookmarks', label: 'Bookmarks', to: '/staff/bookmarks', icon: <StarOutlined /> },
        { key: 'profile', label: 'Settings', to: '/settings-profile', icon: <SettingOutlined /> },
      ],
      user: [
        { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: <DashboardOutlined /> },
        { key: 'profile', label: 'Profile / Settings', to: '/settings-profile', icon: <UserOutlined /> },
        { key: 'logout', label: 'Logout', type: 'action', icon: <LogoutOutlined /> },
      ],
    }

    const roleKey = (role?.slug || role || 'user').toString().toLowerCase()
    const isStaffRole = ['staff', 'lgu_officer', 'inspector'].includes(roleKey)
    if (isStaffRole && (currentUser?.mustChangeCredentials || currentUser?.mustSetupMfa)) {
      return staffOnboardingItems
    }
    const result = perRole[roleKey] || perRole.user
    return Array.isArray(result) ? result : []
  }, [role, currentUser])

  const [selected, setSelected] = useState(items[0]?.key ?? 'dashboard')

  const onSelect = ({ key }) => setSelected(key)

  // Get page title and icon from current route
  const getPageInfo = useMemo(() => {
    const pathname = location.pathname
    // Find matching item by 'to' property — prefer exact match, then longest prefix match
    const exactMatch = items.find(item => item.to && pathname === item.to)
    if (exactMatch) {
      return { pageTitle: exactMatch.label, pageIcon: exactMatch.icon }
    }
    // Longest prefix match (sort by path length descending to find most specific)
    const prefixMatches = items
      .filter(item => item.to && item.to !== '/' && pathname.startsWith(item.to))
      .sort((a, b) => b.to.length - a.to.length)
    if (prefixMatches.length > 0) {
      return { pageTitle: prefixMatches[0].label, pageIcon: prefixMatches[0].icon }
    }
    return { pageTitle: null, pageIcon: null }
  }, [items, location.pathname])

  return { items, selected, onSelect, role, getPageInfo }
}
