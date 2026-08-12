import { useState, useCallback } from 'react'
import { Grid, Drawer, Splitter, theme } from 'antd'

const { useBreakpoint } = Grid

/**
 * Normalize a size value into something antd's Splitter understands.
 * Splitter only accepts percentage strings ('25%') or plain numbers (px).
 * A '350px' string parses to NaN internally, which collapses the panel.
 */
function normalizeSize(value) {
  if (typeof value === 'string' && value.trim().endsWith('%')) return value
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * ResponsiveSplitLayout - A reusable split layout component that adapts to screen size
 * 
 * Desktop: Uses Splitter with left/right panels
 * Mobile: Uses Drawer for detail panel (configurable placement)
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.listContent - Left panel content (list of items)
 * @param {React.ReactNode} props.detailContent - Right panel content (detail view)
 * @param {React.ReactNode} props.drawerTitle - Title for mobile drawer
 * @param {Function} props.onDrawerClose - Callback when drawer closes
 * @param {boolean} props.drawerOpen - Explicit control over drawer open state (mobile only)
 * @param {string} props.mobileDrawerPlacement - Drawer placement for mobile: 'right' | 'bottom' (default: 'right')
 * @param {number} props.listMinWidth - Minimum width for list panel on desktop (default: 300)
 * @param {number} props.listMaxWidth - Maximum width for list panel on desktop (default: 400)
 * @param {number|string} props.listDefaultSize - Default size for list panel on desktop.
 *   Accepts a percentage string ('25%') or a pixel value (350 or '350px'). Default: '25%'
 * @param {number} props.mobileBreakpoint - Breakpoint for mobile view (default: 'lg')
 */
export default function ResponsiveSplitLayout({
  listContent,
  detailContent,
  drawerTitle = 'Details',
  onDrawerClose,
  drawerOpen,
  mobileDrawerPlacement = 'bottom',
  listMinWidth = 300,
  listMaxWidth = 400,
  listDefaultSize = '25%',
  mobileBreakpoint = 'lg',
}) {
  const screens = useBreakpoint()
  const { token } = theme.useToken()
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false)
  const detailDrawerOpen = drawerOpen !== undefined ? drawerOpen : internalDrawerOpen

  const handleCloseDrawer = useCallback(() => {
    if (drawerOpen === undefined) {
      setInternalDrawerOpen(false)
    }
    onDrawerClose?.()
  }, [onDrawerClose, drawerOpen])

  // Mobile view: list as main panel, detail in drawer
  if (!screens[mobileBreakpoint]) {
    const drawerProps = {
      title: drawerTitle,
      open: detailDrawerOpen,
      onClose: handleCloseDrawer,
      styles: {
        body: { padding: 0, background: token.colorBgContainer },
        header: { background: token.colorBgContainer },
      },
    }

    if (mobileDrawerPlacement === 'right') {
      drawerProps.placement = 'right'
      drawerProps.width = '100%'
    } else {
      drawerProps.placement = 'bottom'
      drawerProps.size = '100%'
    }

    return (
      <>
        <div style={{ height: '100%', overflow: 'hidden', width: '100%', maxWidth: 'none' }}>
          {listContent}
        </div>
        <Drawer {...drawerProps}>
          {detailContent}
        </Drawer>
      </>
    )
  }

  // Desktop view: split panel.
  // Panels are left uncontrolled so antd owns the sizing: it observes the
  // container, clamps to min/max, and preserves the user's drag.
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Splitter style={{ height: '100%', width: '100%' }}>
        <Splitter.Panel
          defaultSize={normalizeSize(listDefaultSize)}
          min={normalizeSize(listMinWidth)}
          max={normalizeSize(listMaxWidth)}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {listContent}
        </Splitter.Panel>
        <Splitter.Panel
          min="50%"
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {detailContent}
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}
