import { useState, useCallback } from 'react'
import { Grid, Drawer, Splitter } from 'antd'

const { useBreakpoint } = Grid

export default function SplitLayout({ listContent, detailContent, drawerTitle = 'Details', onDrawerClose, listMinWidth = 300, listMaxWidth = 400 }) {
  const screens = useBreakpoint()
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)

  const handleCloseDrawer = useCallback(() => {
    setDetailDrawerOpen(false)
    onDrawerClose?.()
  }, [onDrawerClose])

  // Mobile view: list as main panel, detail in bottom drawer
  if (!screens.lg) {
    return (
      <>
        <div style={{ height: '100%', overflow: 'hidden' }}>
          {listContent}
        </div>
        <Drawer
          title={drawerTitle}
          open={detailDrawerOpen}
          onClose={handleCloseDrawer}
          placement="bottom"
          height="100%"
          styles={{ body: { padding: 0 } }}
        >
          {detailContent}
        </Drawer>
      </>
    )
  }

  // Desktop view: split panel
  return (
    <Splitter style={{ height: '100%' }}>
      <Splitter.Panel min={listMinWidth} max={listMaxWidth} defaultSize="25%" style={{ overflow: 'hidden', minWidth: `${listMinWidth}px`, maxWidth: `${listMaxWidth}px` }}>
        {listContent}
      </Splitter.Panel>
      <Splitter.Panel min="50%" defaultSize="75%" style={{ overflow: 'hidden' }}>
        {detailContent || (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Select an item to view details
          </div>
        )}
      </Splitter.Panel>
    </Splitter>
  )
}
