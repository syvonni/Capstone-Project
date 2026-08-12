import { useState, useCallback, useEffect, useMemo } from 'react'
import { Empty } from 'antd'
import HelpRequestsPanel from './components/HelpRequestsPanel'
import HelpRequestDetailPanel from './components/HelpRequestDetailPanel'
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout'
import useOfficerData from '../../hooks/useOfficerData'
import { useOfficerDataContext } from '../../contexts/OfficerDataContext'
import BookmarkService from '../../services/bookmarkService'

export default function OfficerHelpRequests() {
  const [selectedItem, setSelectedItem] = useState(null)
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const { refreshTrigger } = useOfficerDataContext()
  const officerData = useOfficerData('helpRequests', refreshTrigger)
  const bookmarkService = useMemo(() => new BookmarkService(), [])

  // Check bookmark status for all help requests
  const refreshBookmarkStatus = useCallback(async () => {
    const requests = officerData?.helpRequests || []
    const bookmarkStatus = new Set()
    
    await Promise.all(
      requests.map(async (req) => {
        try {
          const check = await bookmarkService.checkBookmark('help_request', req.requestId)
          if (check.isBookmarked) {
            bookmarkStatus.add(req.requestId)
          }
        } catch {
          // Ignore errors, treat as not bookmarked
        }
      })
    )
    
    setBookmarkedIds(bookmarkStatus)
  }, [officerData?.helpRequests, bookmarkService])

  useEffect(() => {
    refreshBookmarkStatus()
  }, [refreshBookmarkStatus])

  const handleSelectRequest = useCallback((req) => {
    setSelectedItem({ ...req, _itemType: 'helpRequests', _itemId: req.requestId })
  }, [])

  const handleDrawerClose = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const handleReviewComplete = useCallback(() => {
    officerData.refreshHelpRequests?.()
    officerData.refresh?.()
  }, [officerData])

  const handleBookmarkToggle = useCallback(() => {
    refreshBookmarkStatus()
  }, [refreshBookmarkStatus])

  // Sync selectedItem with refreshed data
  useEffect(() => {
    if (selectedItem && officerData?.helpRequests) {
      const updatedItem = officerData.helpRequests.find(req => req.requestId === selectedItem._itemId)
      if (updatedItem) {
        // Only update if the data has actually changed (prevent infinite loop)
        const currentData = { ...selectedItem }
        delete currentData._itemType
        delete currentData._itemId
        const newData = { ...updatedItem }
        if (JSON.stringify(currentData) !== JSON.stringify(newData)) {
          setSelectedItem({ ...updatedItem, _itemType: 'helpRequests', _itemId: updatedItem.requestId })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officerData?.helpRequests, selectedItem?._itemId])

  const listContent = (
    <HelpRequestsPanel
      helpRequests={officerData?.helpRequests || []}
      isLoading={officerData?.loadingMap?.helpRequests}
      selectedId={selectedItem?._itemId}
      onSelectRequest={handleSelectRequest}
      bookmarkedIds={bookmarkedIds}
      onRefresh={officerData.refresh}
      showRefresh={true}
    />
  )

  const detailContent = selectedItem ? (
    <HelpRequestDetailPanel request={selectedItem} onReviewComplete={handleReviewComplete} onBookmarkToggle={handleBookmarkToggle} />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Empty description="Select a help request to view details" />
    </div>
  )

  return (
    <ResponsiveSplitLayout
      listContent={listContent}
      detailContent={detailContent}
      drawerTitle="Request details"
      onDrawerClose={handleDrawerClose}
      drawerOpen={!!selectedItem}
      mobileDrawerPlacement="bottom"
    />
  )
}
