import { Layout, Typography, theme, Grid } from 'antd'
import LayoutPageHeader from '@/shared/components/LayoutPageHeader'
import { usePageRefresh } from '@/shared/hooks/usePageRefresh'

const { Content } = Layout
const { Title } = Typography
const { useBreakpoint } = Grid

export default function BusinessOwnerLayout({
  children,
  pageTitle,
  pageIcon,
  showPageHeader = true,
  showBusinessSidebar = false, // New prop to control business sidebar
  sidebarContent = null, // Custom sidebar content
  onSettingsClick, // Pass through to LayoutPageHeader
  onRefresh,
  lastUpdated,
  socketConnected,
  loading,
  showBrandLogo = false, // Show animated brand logo instead of icon+title
  brandLogoClickable = false, // Make brand logo unclickable by default
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  // Use centralized refresh hook by default, but allow override via props
  const pageRefresh = usePageRefresh({ onRefresh })
  const finalOnRefresh = onRefresh || pageRefresh.onRefresh
  const finalLastUpdated = lastUpdated || pageRefresh.lastUpdated
  const finalSocketConnected = socketConnected !== undefined ? socketConnected : pageRefresh.socketConnected

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden' }}>
      <LayoutPageHeader
        pageTitle={pageTitle}
        pageIcon={pageIcon}
        viewNotificationsPath="/notifications"
        showPageHeader={showPageHeader}
        onSettingsClick={onSettingsClick}
        onRefresh={finalOnRefresh}
        lastUpdated={finalLastUpdated}
        socketConnected={finalSocketConnected}
        loading={loading}
        showBrandLogo={showBrandLogo}
        brandLogoClickable={brandLogoClickable}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: token.colorBgContainer, width: '100%', paddingTop: isMobile ? 64 : 0 }}>
        {showBusinessSidebar ? (
          <>
            {/* Business Sidebar */}
            <div
              style={{
                width: '30%',
                minWidth: 280,
                maxWidth: 400,
                flexShrink: 0,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                background: token.colorBgContainer,
                padding: '24px',
              }}
            >
              {sidebarContent}
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', padding: '24px' }}>
              {children}
            </div>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
