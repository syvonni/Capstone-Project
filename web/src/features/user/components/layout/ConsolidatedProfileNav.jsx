import { Menu, ConfigProvider, theme } from 'antd'
import { CONSOLIDATED_NAV_ITEMS } from '@/features/user/constants'

export default function ConsolidatedProfileNav({ selectedKey, onSelectKey, navItems = CONSOLIDATED_NAV_ITEMS }) {
  const { token } = theme.useToken()

  // Convert items to flat Menu items structure
  const menuItems = navItems.map(item => ({
    key: item.key,
    label: item.label,
    icon: item.icon ? <item.icon /> : null,
  }))

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemHoverBg: token.colorFillSecondary,
            itemActiveBg: 'transparent',
            itemSelectedBg: 'transparent',
            itemHeight: 40,
          }
        }
      }}
    >
      <style>{`
        .ant-menu-item-selected:hover {
          background-color: ${token.colorFillSecondary} !important;
        }
      `}</style>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => onSelectKey(key)}
        style={{ borderRight: 'none' }}
      />
    </ConfigProvider>
  )
}
