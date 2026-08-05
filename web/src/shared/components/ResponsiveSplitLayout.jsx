import { useState, useCallback, useEffect, useRef } from 'react'
import { Grid, Drawer, Splitter } from 'antd'

const { useBreakpoint } = Grid

/**
 * ResponsiveSplitLayout - A reusable split layout component that adapts to screen size
 * 
 * Desktop: Uses Splitter with left/right panels
 * Mobile: Uses Drawer for detail panel (configurable placement)
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.listContent - Left panel content (list of items)
 * @param {React.ReactNode} props.detailContent - Right panel content (detail view)
 * @param {string} props.drawerTitle - Title for mobile drawer
 * @param {Function} props.onDrawerClose - Callback when drawer closes
 * @param {boolean} props.drawerOpen - Explicit control over drawer open state (mobile only)
 * @param {string} props.mobileDrawerPlacement - Drawer placement for mobile: 'right' | 'bottom' (default: 'right')
 * @param {number} props.listMinWidth - Minimum width for list panel on desktop (default: 300)
 * @param {number} props.listMaxWidth - Maximum width for list panel on desktop (default: 400)
 * @param {string} props.listDefaultSize - Default size for list panel on desktop (default: '25%')
 * @param {number} props.mobileBreakpoint - Breakpoint for mobile view (default: 'lg')
 */
export default function ResponsiveSplitLayout({
  listContent,
  detailContent,
  drawerTitle = 'Details',
  onDrawerClose,
  drawerOpen,
  mobileDrawerPlacement = 'right',
  listMinWidth = 300,
  listMaxWidth = 400,
  listDefaultSize = '25%',
  mobileBreakpoint = 'lg',
}) {
  const screens = useBreakpoint()
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false)
  const detailDrawerOpen = drawerOpen !== undefined ? drawerOpen : internalDrawerOpen
  const [sizes, setSizes] = useState([listDefaultSize, '75%'])
  const containerRef = useRef(null)
  const isMobile = !screens[mobileBreakpoint]

  const handleCloseDrawer = useCallback(() => {
    if (drawerOpen === undefined) {
      setInternalDrawerOpen(false)
    }
    onDrawerClose?.()
  }, [onDrawerClose, drawerOpen])

  const handleResize = useCallback((newSizes) => {
    setSizes(newSizes)
  }, [])

  // Calculate sizes that respect minimum width constraint
  const calculateSizes = useCallback((width) => {
    if (!width || isMobile) return [listDefaultSize, '75%']

    const minPx = typeof listMinWidth === 'number' ? listMinWidth : parseInt(listMinWidth)
    const minPercent = (minPx / width) * 100

    // If default size is less than minimum, use minimum
    const defaultPercent = typeof listDefaultSize === 'string'
      ? parseFloat(listDefaultSize)
      : (listDefaultSize / width) * 100

    if (defaultPercent < minPercent) {
      return [minPercent, 100 - minPercent]
    }

    return [listDefaultSize, '75%']
  }, [listDefaultSize, listMinWidth, isMobile])

  // Use ResizeObserver to track actual container width
  useEffect(() => {
    if (!containerRef.current || isMobile) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        setSizes(calculateSizes(width))
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [isMobile, calculateSizes])

  // Also listen to window resize as backup
  useEffect(() => {
    if (isMobile) return

    const handleWindowResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setSizes(calculateSizes(width))
      }
    }

    window.addEventListener('resize', handleWindowResize)
    handleWindowResize() // Initial calculation

    return () => window.removeEventListener('resize', handleWindowResize)
  }, [isMobile, calculateSizes])

  // Mobile view: list as main panel, detail in drawer
  if (!screens[mobileBreakpoint]) {
    const drawerProps = {
      title: drawerTitle,
      open: detailDrawerOpen,
      onClose: handleCloseDrawer,
      styles: { body: { padding: 0 } },
    }

    if (mobileDrawerPlacement === 'right') {
      drawerProps.placement = 'right'
      drawerProps.width = '100%'
    } else {
      drawerProps.placement = 'bottom'
      drawerProps.height = '100%'
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

  // Desktop view: split panel
  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <Splitter style={{ height: '100%', width: '100%' }} onResize={handleResize}>
        <Splitter.Panel
          size={sizes[0]}
          min={listMinWidth}
          max={listMaxWidth}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {listContent}
        </Splitter.Panel>
        <Splitter.Panel
          size={sizes[1]}
          min="50%"
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {detailContent}
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}
