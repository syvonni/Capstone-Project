  import React, { useState } from 'react'
  import { Layout, Menu, Typography, Grid, Drawer, theme, ConfigProvider } from 'antd'
  import { LeftOutlined, RightOutlined } from '@ant-design/icons'
  import AnimatedBrandLogo from '@/shared/components/AnimatedBrandLogo.jsx'

  const { Sider } = Layout
  const { Text } = Typography
  const { useBreakpoint } = Grid

  const SidebarContent = ({
    collapsed,
    items,
    activeKey,
    handleItemClick,
    backgroundColor,
    _headerContent,
  }) => {
    // Helper to check if a key is a child of any parent
    const isChildKey = React.useCallback((key) => {
      for (const item of items) {
        if (item.children) {
          if (item.children.some(child => child.key === key)) {
            return item.key
          }
        }
      }
      return null
    }, [items])
    
    // Helper to check if a key is a parent item (has children)
    const isParentKey = React.useCallback((key) => {
      const item = items.find(i => i.key === key)
      return item && item.children && item.children.length > 0
    }, [items])
    const { token } = theme.useToken();
    
    // Initialize openKeys with parent items that have children (submenus should be open by default)
    const initialOpenKeys = React.useMemo(() => {
      return items
        .filter(item => item.children && item.children.length > 0)
        .map(item => item.key)
    }, [items])
    
    const [openKeys, setOpenKeys] = React.useState(initialOpenKeys);
    const navigatingParentRef = React.useRef(null);
    const previousOpenKeysRef = React.useRef(initialOpenKeys);
    const ignoreNextOpenChangeRef = React.useRef(false);
    
    // Update openKeys when items change (e.g., when switching roles)
    React.useEffect(() => {
      const newOpenKeys = items
        .filter(item => item.children && item.children.length > 0)
        .map(item => item.key)
      setOpenKeys(newOpenKeys)
      previousOpenKeysRef.current = newOpenKeys
    }, [items])
    
    // Manage submenus when activeKey changes
    React.useEffect(() => {
      if (activeKey) {
        const parentOfActive = isChildKey(activeKey)
        const isParent = isParentKey(activeKey)
        
        if (parentOfActive) {
          // Active item is a child - ensure its parent submenu is open
          setOpenKeys(prev => {
            if (!prev.includes(parentOfActive)) {
              return [...prev, parentOfActive]
            }
            return prev
          })
        } else if (isParent) {
          // Active item is a parent item (like "Permit Applications") - keep its submenu open
          setOpenKeys(prev => {
            if (!prev.includes(activeKey)) {
              return [...prev, activeKey]
            }
            return prev
          })
        } else {
          // Active item is a top-level item without children - close all submenus
          ignoreNextOpenChangeRef.current = true
          setOpenKeys([])
          previousOpenKeysRef.current = []
          setTimeout(() => {
            ignoreNextOpenChangeRef.current = false
          }, 50)
        }
      }
    }, [activeKey, isChildKey, isParentKey])
    
    const menuBg = backgroundColor;

    return (
      <>
        {/* Brand / Logo */}
        <div style={{
          height: 65,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: collapsed ? '0' : '0 24px',
          borderBottom: `1px solid ${token.colorBorder}`,
          transition: 'padding 0.2s ease-in-out',
          background: menuBg
        }}>
          <div style={{
            transform: collapsed ? 'translateX(24px)' : 'translateX(0)',
            transition: 'transform 0.2s ease-in-out',
          }}>
            <AnimatedBrandLogo
              size={32}
              showBrandName={true}
              collapsed={collapsed}
            />
          </div>
        </div>

        <ConfigProvider
          theme={{
            components: {
              Menu: {
                itemHoverBg: token.colorFillSecondary,
                itemActiveBg: 'transparent',
                itemSelectedBg: 'transparent',
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
            selectedKeys={[activeKey]}
            openKeys={openKeys}
            onClick={({ key }) => {
              // Recursively find item in items and children
              const findItem = (itemsList, targetKey) => {
                for (const item of itemsList) {
                  if (item.key === targetKey) {
                    return item
                  }
                  if (item.children) {
                    const found = findItem(item.children, targetKey)
                    if (found) return found
                  }
                }
                return null
              }
              
              // Find which parent (if any) contains this item as a child
              const findParent = (itemsList, targetKey, currentParent = null) => {
                for (const item of itemsList) {
                  if (item.key === targetKey) {
                    return currentParent
                  }
                  if (item.children) {
                    const found = findParent(item.children, targetKey, item)
                    if (found !== null) return found
                  }
                }
                return null
              }
              
              const item = findItem(items, key)
              const parentItem = findParent(items, key)
              
              if (item) {
                  // onClick only fires for leaf items (items without children)
                  // SubMenu items (with children) use onTitleClick instead
                  
                  // If clicking on an item that's NOT a child of any open submenu,
                  // close all submenus. If it IS a child, keep its parent submenu open.
                  if (parentItem) {
                    // This is a child item - keep its parent submenu open and close others
                    const newKeys = [parentItem.key]
                    ignoreNextOpenChangeRef.current = true
                    previousOpenKeysRef.current = newKeys
                    setOpenKeys(newKeys)
                    // Reset flag after a short delay to allow onOpenChange to be ignored
                    setTimeout(() => {
                      ignoreNextOpenChangeRef.current = false
                    }, 50)
                  } else {
                    // This is a top-level item (not a child) - close all submenus
                    ignoreNextOpenChangeRef.current = true
                    previousOpenKeysRef.current = []
                    setOpenKeys([])
                    // Reset flag after a short delay to allow onOpenChange to be ignored
                    setTimeout(() => {
                      ignoreNextOpenChangeRef.current = false
                    }, 50)
                  }
                  
                  handleItemClick(item)
              }
          }}
          onOpenChange={(keys) => {
            // If we're programmatically changing submenus (from onClick), ignore onOpenChange
            if (ignoreNextOpenChangeRef.current) {
              return
            }
            
            // If we're navigating to a parent item, ensure its submenu stays open
            if (navigatingParentRef.current) {
              const parentKey = navigatingParentRef.current
              if (!keys.includes(parentKey)) {
                // Keep the parent submenu open if we just navigated to it
                const finalKeys = [...keys, parentKey]
                setOpenKeys(finalKeys)
                previousOpenKeysRef.current = finalKeys
                navigatingParentRef.current = null
                return
              }
              navigatingParentRef.current = null
            }
            
            // Check if the active key is a child - if so, keep its parent open
            // If active key is NOT a child, close all submenus
            const activeParent = activeKey ? isChildKey(activeKey) : null
            let finalKeys = keys
            
            if (activeParent) {
              // Active item is a child - ensure its parent is open
              if (!keys.includes(activeParent)) {
                finalKeys = [...keys, activeParent]
              }
            } else if (activeKey) {
              // Active item is a top-level item (not a child) - close all submenus
              finalKeys = []
            }
            
            // Allow normal submenu toggle behavior (user clicking the arrow)
            setOpenKeys(finalKeys)
            previousOpenKeysRef.current = finalKeys
          }}
          style={{ 
            borderRight: 0, 
            background: menuBg,
            padding: '8px 6px',
          }}
          items={items.map(item => {
            const menuItem = {
              key: item.key,
              icon: item.icon,
              label: item.label, 
              ...(item.key === 'logout' && { danger: true }),
              style: { 
              }
            }
            
            // Add children if they exist - this creates a SubMenu
            if (item.children && Array.isArray(item.children) && item.children.length > 0) {
              menuItem.children = item.children.map(child => ({
                key: child.key,
                icon: child.icon,
                label: child.label,
                style: { 
                  margin: '4px 8px', 
                  borderRadius: 6, 
                  width: 'auto',
                  fontSize: 14
                }
              }))
              
              // Make parent clickable if it has a 'to' property
              // When clicking the title, navigate AND expand the submenu
              if (item.to) {
                menuItem.onTitleClick = () => {
                  // Mark that we're navigating to this parent item
                  navigatingParentRef.current = item.key
                  // Expand the submenu using functional update to avoid stale closure
                  setOpenKeys(prev => {
                    if (!prev.includes(item.key)) {
                      return [...prev, item.key]
                    }
                    return prev
                  })
                  // Navigate to the parent route
                  const foundItem = items.find(i => i.key === item.key)
                  if (foundItem) {
                    handleItemClick(foundItem)
                  }
                }
              }
            }
            return menuItem
          })}
          />
        </ConfigProvider>
        
        {!collapsed && (
          <div style={{ 
            position: 'absolute', 
            bottom: 48, 
            width: '100%', 
            padding: 16, 
            textAlign: 'center' 
          }}>
            <Text type="secondary" style={{ fontSize: 11 }}>© {new Date().getFullYear()} {import.meta.env.VITE_APP_BRAND_NAME || 'BizClear'}</Text>
          </div>
        )}
      </>
    )
  }

  /**
   * Pure Sidebar Component (UI Only)
   * @param {object[]} items - Menu items
   * @param {string} activeKey - Currently selected key
   * @param {function} onItemClick - Callback when item is clicked
   * @param {object} siderProps - Props passed to Antd Sider
   */
  export default function Sidebar({ items = [], activeKey, onItemClick, headerContent, mobileOpen, setMobileOpen, ...siderProps }) {
    const [collapsed, setCollapsed] = useState(true)
    const screens = useBreakpoint()
    const { token } = theme.useToken();

    // Determine if we are on a mobile screen (md breakpoint = 768px)
    const isMobile = (screens.md === false)

    const handleMobileClick = (item) => {
      if (setMobileOpen) setMobileOpen(false)
      if (onItemClick) onItemClick(item)
    }

    const siderBg = token.colorBgContainer;

    return (
      <>
        {isMobile ? (
          <Drawer
            placement="left"
            open={mobileOpen}
            onClose={() => setMobileOpen && setMobileOpen(false)}
            width={260}
            styles={{ body: { padding: 0, background: siderBg } }}
            closable={false}
          >
            <SidebarContent
              collapsed={false}
              items={items}
              activeKey={activeKey}
              handleItemClick={handleMobileClick}
              backgroundColor={siderBg}
              headerContent={headerContent}
            />
          </Drawer>
        ) : (
          <Sider
            width={260}
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            style={{
              overflow: 'auto',
              height: '100vh',
              position: 'sticky',
              top: 0,
              left: 0,
              background: siderBg,
              zIndex: 10,
              borderRight: `1px solid ${token.colorBorder}`,
              ...siderProps.style
            }}
            {...siderProps}
            trigger={
              <div style={{
                background: siderBg,
                color: token.colorTextSecondary,
                height: 48,
                lineHeight: '48px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'none',
                borderTop: `1px solid ${token.colorBorder}`,
                borderRight: `1px solid ${token.colorBorder}`,
              }}>
                {collapsed ? <RightOutlined /> : <LeftOutlined />}
              </div>
            }
          >
            <SidebarContent 
              collapsed={collapsed}
              items={items}
              activeKey={activeKey}
              handleItemClick={onItemClick}
              backgroundColor={siderBg}
              headerContent={headerContent}
            />
          </Sider>
        )}
      </>
    )
  }
