import { Layout, theme, Grid } from 'antd'
import React, { useState } from 'react'
import LayoutPageHeader from '@/shared/components/LayoutPageHeader'
import { useSidebar } from '@/features/authentication'
import { usePageRefresh } from '@/shared/hooks/usePageRefresh'

const { Content } = Layout
const { useBreakpoint } = Grid

export default function BaseSidebarLayout({
  children,
  sidebar,
  hideNotifications = false,
  hideProfileSettings = false,
  showPageHeader = true,
  showBrandLogo = false,
  onRefresh,
  lastUpdated,
  socketConnected,
  loading,
  infoSlotId,
  infoModalTitle,
  statusText,
  contentPadding = 24,
  background = 'colorBgContainer',
  pageTitle: pageTitleProp,
  pageIcon: pageIconProp,
}) {
  const { token } = theme.useToken()
  const { getPageInfo } = useSidebar()
  const { pageTitle: sidebarTitle, pageIcon: sidebarIcon } = getPageInfo
  const pageTitle = pageTitleProp || sidebarTitle
  const pageIcon = pageIconProp || sidebarIcon
  const [mobileOpen, setMobileOpen] = useState(false)
  const screens = useBreakpoint()
  const isMobile = !screens.md

  // Use centralized refresh hook by default, but allow override via props
  const pageRefresh = usePageRefresh({ onRefresh })
  const finalOnRefresh = onRefresh || pageRefresh.onRefresh
  const finalLastUpdated = lastUpdated || pageRefresh.lastUpdated
  const finalSocketConnected = socketConnected !== undefined ? socketConnected : pageRefresh.socketConnected

  // Clone sidebar to pass mobileOpen state
  const sidebarWithMobileState = sidebar ? React.cloneElement(sidebar, {
    mobileOpen,
    setMobileOpen,
  }) : null

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {sidebarWithMobileState}
      <Layout>
        <Content
          style={{
            background: token[background],
            overflow: 'hidden',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <LayoutPageHeader
              pageTitle={pageTitle}
              pageIcon={pageIcon}
              hideNotifications={hideNotifications}
              hideProfileSettings={hideProfileSettings}
              showPageHeader={showPageHeader}
              showBrandLogo={showBrandLogo}
              onRefresh={finalOnRefresh}
              lastUpdated={finalLastUpdated}
              socketConnected={finalSocketConnected}
              loading={loading}
              infoSlotId={infoSlotId}
              infoModalTitle={infoModalTitle}
              statusText={statusText}
              _mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
            />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                padding: contentPadding,
                paddingTop: isMobile ? contentPadding + 65 : contentPadding,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {children}
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
