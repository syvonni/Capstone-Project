import { useEffect, useState } from 'react'
import { Layout } from 'antd'
import { theme } from 'antd'
import ConsolidatedProfileNav from '@/features/user/components/layout/ConsolidatedProfileNav'
import ConsolidatedContentRenderer from '@/features/user/components/security/ConsolidatedContentRenderer'
import { CONSOLIDATED_NAV_ITEMS } from '@/features/user/constants'
import { useAuthSession } from '@/features/authentication'
import StaffLayout from '@/shared/components/StaffLayout'
import DetailHeader from '@/shared/components/DetailHeader'
import { useSearchParams } from 'react-router-dom'
import { getRoleSlug } from '@/features/user/utils/roleHelpers'

const SECTION_PANEL_WIDTH = 260

export default function ProfileSettingsLayout() {
  const { currentUser } = useAuthSession()
  const { token } = theme.useToken()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedKey, setSelectedKey] = useState(() => {
    return searchParams.get('section') || 'personalInfo'
  })

  // Determine user role and filter navigation items
  const userRole = getRoleSlug(currentUser?.role)
  const isBusinessOwner = userRole === 'business_owner'
  const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin'

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    let items = [...CONSOLIDATED_NAV_ITEMS]
    
    if (isStaffOrAdmin) {
      // Staff and admin: all sections except delete account
      items = items.filter(item => item.key !== 'deleteAccount')
    } else if (isBusinessOwner) {
      // Business owner: all items
      // (no filtering needed)
    } else {
      // Regular users: all sections except delete account
      items = items.filter(item => item.key !== 'deleteAccount')
    }
    
    return items
  }

  const filteredNavItems = getFilteredNavItems()

  // Get the selected tab label for the detail header
  const selectedTabLabel = filteredNavItems.find(item => item.key === selectedKey)?.label || 'Settings'

  // Sync selected key with URL
  useEffect(() => {
    const sectionFromUrl = searchParams.get('section')
    if (sectionFromUrl && filteredNavItems.find(item => item.key === sectionFromUrl)) {
      setSelectedKey(sectionFromUrl)
    }
  }, [searchParams, filteredNavItems])

  // Update URL when section changes
  const handleSectionChange = (key) => {
    setSelectedKey(key)
    setSearchParams({ section: key })
  }

  // Set default selected key based on available items
  useEffect(() => {
    if (!filteredNavItems.find(item => item.key === selectedKey)) {
      const defaultKey = filteredNavItems[0]?.key || 'personalInfo'
      setSelectedKey(defaultKey)
      setSearchParams({ section: defaultKey })
    }
  }, [selectedKey, filteredNavItems, setSearchParams])

  const renderLayout = () => {
    const content = (
      <Layout style={{ background: token.colorBgContainer, height: '100%', minHeight: '0 !important' }}>
        <Layout.Content style={{ height: '100%', minHeight: '0 !important' }}>
          <div style={{ 
            display: 'flex', 
            height: '100%',
            overflow: 'hidden'
          }}>
            {/* Left navigation panel */}
            <div
              style={{
                flexShrink: 0,
                width: SECTION_PANEL_WIDTH,
                minWidth: SECTION_PANEL_WIDTH,
                alignSelf: 'stretch',
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                padding: '8px 6px',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              <ConsolidatedProfileNav 
                selectedKey={selectedKey}
                onSelectKey={handleSectionChange}
                navItems={filteredNavItems}
              />
            </div>
            
            {/* Right content panel */}
            <div style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: token.colorBgContainer
            }}>
              <DetailHeader title={selectedTabLabel} />
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                padding: 24
              }}>
                <ConsolidatedContentRenderer
                  selectedKey={selectedKey}
                  isBusinessOwner={isBusinessOwner}
                  isStaffOrAdmin={isStaffOrAdmin}
                />
              </div>
            </div>
          </div>
        </Layout.Content>
      </Layout>
    )

    if (isStaffOrAdmin) {
      return (
        <StaffLayout>
          {content}
        </StaffLayout>
      )
    }

    return (
      <Layout style={{ height: '100%', minHeight: '0 !important' }}>
        {content}
      </Layout>
    )
  }

  return renderLayout()
}