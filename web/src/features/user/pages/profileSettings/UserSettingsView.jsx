import { useEffect, useState } from 'react'
import { Layout, Typography, Grid, Button } from 'antd'
import { theme } from 'antd'
import { ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppSidebar as Sidebar } from '@/features/authentication'
import LayoutPageHeader from '@/shared/components/LayoutPageHeader'
import BusinessOwnerLayout from '@/features/business-owner/components/shared/BusinessOwnerLayout'
import StaffLayout from '@/shared/components/StaffLayout'
import ConsolidatedProfileNav from './ConsolidatedProfileNav'
import ConsolidatedContentRenderer from './ConsolidatedContentRenderer'
import { CONSOLIDATED_NAV_ITEMS } from './constants'
import ApplicationsList from '@/features/business-owner/pages/applications/components/ApplicationsList'
import { getBusinesses } from '@/features/business-owner/services/businessProfileService'
import { useAuthSession } from '@/features/authentication'
import { App as AntApp } from 'antd'

const { Title } = Typography

const SECTION_PANEL_WIDTH = 260

// Business sidebar component for settings page - uses actual ApplicationsList
function BusinessSidebarContent() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBusinessId, setSelectedBusinessId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const location = useLocation()

  // Get business ID from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const businessId = params.get('business')
    if (businessId) {
      setSelectedBusinessId(businessId)
    }
  }, [location])

  // Fetch businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true)
        const response = await getBusinesses()
        setBusinesses(response.businesses || [])
      } catch (error) {
        console.error('Error fetching businesses:', error)
        message.error('Failed to load businesses')
      } finally {
        setLoading(false)
      }
    }
    fetchBusinesses()
  }, [message])

  const handleBusinessSelect = (businessId) => {
    setSelectedBusinessId(businessId)
    // Update URL with new business ID
    navigate(`/settings-profile?business=${businessId}`)
  }

  return (
    <>
      {/* Actual Business List Panel */}
      <ApplicationsList
        businesses={businesses}
        loading={loading}
        selectedBusinessId={selectedBusinessId}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        onBusinessSelect={handleBusinessSelect}
        onAddBusiness={() => navigate('/owner')}
      />
    </>
  )
}

export default function UserSettingsView({
  themeSettings = {},
  showBackButton = true,
  backButtonTo = '/dashboard',
  forceLayout = null, // New prop to force specific layout
  embedded = false, // New prop to indicate embedded mode
  preserveOfficerLayout = false, // New prop to preserve LGU officer layout
}) {
  const { currentUser } = useAuthSession()
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [selectedKey, setSelectedKey] = useState('basicInfo')
  const location = useLocation()

  // Check URL parameters for layout override and business context
  const searchParams = new URLSearchParams(location.search)
  const layoutParam = searchParams.get('layout')
  const businessIdParam = searchParams.get('business')
  const shouldShowBusinessSidebar = layoutParam === 'business-owner' || businessIdParam
  
  useEffect(() => {
    if (shouldShowBusinessSidebar) {
      // Force business owner layout
      window.forceBusinessOwnerLayout = true
    }
    return () => {
      window.forceBusinessOwnerLayout = false
    }
  }, [shouldShowBusinessSidebar])

  // Determine user role and filter navigation items
  const userRole = typeof currentUser?.role === 'string' ? currentUser?.role : currentUser?.role?.slug || 'user'
  const isBusinessOwner = userRole === 'business_owner'
  const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin'
  const isLguOfficer = userRole === 'lgu_officer'

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    let items = [...CONSOLIDATED_NAV_ITEMS]
    
    if (isStaffOrAdmin) {
      // Staff and admin: only security and theme sections
      items = items.filter(item => item.section === 'security' || item.section === 'theme')
    } else if (isBusinessOwner) {
      // Business owner: all sections except notifications
      items = items.filter(item => item.section !== 'notifications')
    } else {
      // Regular users: all sections except address and personal info
      items = items.filter(item => item.key !== 'address' && item.key !== 'personalInfo')
    }
    
    return items
  }

  const filteredNavItems = getFilteredNavItems()

  // Set default selected key based on available items
  useEffect(() => {
    if (!filteredNavItems.find(item => item.key === selectedKey)) {
      setSelectedKey(filteredNavItems[0]?.key || 'basicInfo')
    }
  }, [selectedKey, filteredNavItems])

  const renderLayout = () => {
    const content = (
      <Layout style={{ background: token.colorBgContainer }}>
        {!embedded && !preserveOfficerLayout && showBackButton && (
          <LayoutPageHeader
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingOutlined />
                Settings
              </span>
            }
            extra={
              <Link to={backButtonTo}>
                <Button icon={<ArrowLeftOutlined />}>Back</Button>
              </Link>
            }
          />
        )}
        
        <Layout.Content style={{ padding: isMobile ? 16 : 24, height: '100%' }}>
          <div style={{ 
            display: 'flex', 
            height: preserveOfficerLayout ? 'calc(100vh - 64px)' : 'calc(100vh - 160px)', 
            minHeight: 600,
            overflow: 'hidden'
          }}>
            {/* Left navigation panel - show for LGU officers too */}
            {!preserveOfficerLayout && (
              <div
                style={{
                  flexShrink: 0,
                  width: SECTION_PANEL_WIDTH,
                  minWidth: SECTION_PANEL_WIDTH,
                  borderRight: `1px solid ${token.colorBorderSecondary}`,
                  paddingRight: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                <ConsolidatedProfileNav 
                  selectedKey={selectedKey}
                  onSelectKey={setSelectedKey}
                  navItems={filteredNavItems}
                />
              </div>
            )}
            
            {/* Right content panel */}
            <div style={{ 
              flex: 1, 
              minWidth: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              background: token.colorBgContainer 
            }}>
              <ConsolidatedContentRenderer 
                selectedKey={selectedKey}
                themeSettings={themeSettings}
                isBusinessOwner={isBusinessOwner}
                isStaffOrAdmin={isStaffOrAdmin}
              />
            </div>
          </div>
        </Layout.Content>
      </Layout>
    )

    // Check for forced layout or URL parameter override
    if (forceLayout === 'business-owner' || window.forceBusinessOwnerLayout || shouldShowBusinessSidebar) {
      return (
        <BusinessOwnerLayout
          showBusinessSidebar={embedded ? false : true}
          sidebarContent={embedded ? null : <BusinessSidebarContent />}
        >
          {content}
        </BusinessOwnerLayout>
      )
    }

    // Preserve LGU officer layout when requested
    if (preserveOfficerLayout || isLguOfficer) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Use the same header as OfficerDashboard */}
          <LayoutPageHeader
            pageTitle="Settings"
            pageIcon={<SettingOutlined />}
            showPageHeader
          />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: token.colorBgContainer }}>
            {/* Right Panel - Settings Content */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {content}
            </div>
          </div>
        </div>
      )
    }

    if (isStaffOrAdmin) {
      return (
        <StaffLayout>
          {content}
        </StaffLayout>
      )
    }

    return (
      <Layout style={{ minHeight: '100vh' }}>
        {!embedded && <Sidebar />}
        {content}
      </Layout>
    )
  }

  return renderLayout()
}
