import { Typography, Card, theme } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import StaffLayout from '@/shared/components/StaffLayout'
import SettingsInfoModal from '@/features/user/components/SettingsInfoModal.jsx'
import SecurityTabContent from './SecurityTabContent'
import EditUserProfileForm from '@/features/user/components/EditUserProfileForm.jsx'
import PendingApprovalAlert from '@/features/user/components/PendingApprovalAlert.jsx'
import ThemeTabContentCompact from './ThemeTabContentCompact'
import ProfileNav from './ProfileNav'
import { PROFILE_NAV_ITEMS } from './constants'

const ADMIN_NAV_ITEMS = PROFILE_NAV_ITEMS.filter((item) => item.key !== 'notifications')

const { Text } = Typography

const adminSectionStyle = { display: 'flex', flexDirection: 'column', gap: 32, width: '100%' }

export default function AdminSettingsView({
  contextHolder,
  selectedTab,
  setSelectedTab,
  settingsInfoOpen,
  setSettingsInfoOpen,
  themeSettings,
}) {
  const { token } = theme.useToken()
  const adminTitleStyle = { display: 'block', marginBottom: 12, fontSize: 15, color: token.colorText }
  const adminCardProps = { size: 'small', styles: { body: { padding: 16 } } }
  const activeTabLabel = ADMIN_NAV_ITEMS.find((n) => n.key === selectedTab)?.label ?? selectedTab
  const AdminTabIcon = ADMIN_NAV_ITEMS.find((n) => n.key === selectedTab)?.icon ?? SettingOutlined

  const renderContent = () => {
    switch (selectedTab) {
      case 'general':
        return (
          <div style={adminSectionStyle}>
            <div style={{ padding: 16 }}>
              <Text strong style={adminTitleStyle}>Personal Information</Text>
              <Card {...adminCardProps}>
                <PendingApprovalAlert />
                <EditUserProfileForm embedded={true} />
              </Card>
            </div>
          </div>
        )
      case 'security':
        return <SecurityTabContent />
      case 'theme':
        return (
          <div style={adminSectionStyle}>
            <div style={{ margin: 16}}>
              <Text strong style={adminTitleStyle}>Theme</Text>
              <ThemeTabContentCompact
                themeOptions={themeSettings.themeOptions}
                presetColors={themeSettings.presetColors}
                pendingTheme={themeSettings.pendingTheme}
                currentPrimaryColor={themeSettings.currentPrimaryColor}
                onSelectTheme={themeSettings.handleSelectTheme}
                onMouseEnterTheme={themeSettings.handleMouseEnter}
                onMouseLeaveTheme={themeSettings.handleMouseLeave}
                onApplyTheme={themeSettings.handleApplyTheme}
                onColorChange={themeSettings.handleColorChange}
              />
            </div>
          </div>
        )
      default:
        return (
          <div style={adminSectionStyle}>
            <div>
              <Text strong style={adminTitleStyle}>Personal Information</Text>
              <Card {...adminCardProps}>
                <PendingApprovalAlert />
                <EditUserProfileForm embedded={true} />
              </Card>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {contextHolder}
      <StaffLayout>
        <div
          style={{
            height: '100%',
            display: 'flex',
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: `1px solid ${token.colorBorder}`,
              padding: 12,
              overflowY: 'auto',
              background: token.colorBgLayout,
            }}
          >
            <ProfileNav selectedTab={selectedTab} onSelectTab={setSelectedTab} navItems={ADMIN_NAV_ITEMS} />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              background: token.colorBgContainer,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: '16px 16px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: token.borderRadius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: token.colorFillTertiary,
                  color: token.colorPrimary,
                }}
              >
                <AdminTabIcon style={{ fontSize: 18 }} />
              </span>
              <Text strong style={{ fontSize: 16 }}>{activeTabLabel}</Text>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                background: token.colorBgContainer,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: token.colorBgContainer,
                  boxSizing: 'border-box',
                }}
              >
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </StaffLayout>
      <SettingsInfoModal open={settingsInfoOpen} onClose={() => setSettingsInfoOpen(false)} />
    </>
  )
}
