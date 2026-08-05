import { AppSidebar as Sidebar } from '@/features/authentication'
import BaseSidebarLayout from '@/shared/components/BaseSidebarLayout.jsx'

export default function StaffLayout({
  children,
  sidebarOverrides = {},
  hiddenSidebarKeys = [],
  hideSidebar = false,
  showPageHeader = true,
  _noContentWrap = true,
  onRefresh,
  lastUpdated,
  socketConnected,
  loading,
  infoSlotId,
  infoModalTitle,
  pageTitle,
  pageIcon,
}) {
  const sidebar = !hideSidebar ? (
    <Sidebar itemOverrides={sidebarOverrides} hiddenKeys={hiddenSidebarKeys} />
  ) : null

  return (
    <BaseSidebarLayout
      sidebar={sidebar}
      showPageHeader={showPageHeader}
      onRefresh={onRefresh}
      lastUpdated={lastUpdated}
      socketConnected={socketConnected}
      loading={loading}
      infoSlotId={infoSlotId}
      infoModalTitle={infoModalTitle}
      contentPadding={_noContentWrap ? 0 : undefined}
      background="colorBgContainer"
      pageTitle={pageTitle}
      pageIcon={pageIcon}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </BaseSidebarLayout>
  )
}
