import { useState, useCallback, useMemo, useEffect } from 'react'
import { Empty, Spin } from 'antd'
import { useSearchParams } from 'react-router-dom'
import ListPanel from '@/shared/components/ListPanel'
import PanelCard from '@/shared/components/PanelCard'
import SplitLayout from '@/shared/components/SplitLayout'
import BookmarkService from '../../services/bookmarkService'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import { getHelpRequestById } from '../../services/helpRequestService'
import BusinessOwnerService from '../../services/businessOwnerService'
import ApplicationDetailPanel from '../applications/components/ApplicationDetailPanel'
import HelpRequestDetailPanel from '../help-requests/components/HelpRequestDetailPanel'
import BusinessOwnerDetailPanel from '../business-owners/components/BusinessOwnerDetailPanel'
import dayjs from 'dayjs'
import { STATUS_CONFIG } from '../applications/constants'
import { HELP_REQUEST_STATUS_CONFIG } from '../help-requests/constants'

export default function OfficerBookmarks() {
  const [searchParams] = useSearchParams()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemData, setItemData] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const bookmarkService = useMemo(() => new BookmarkService(), [])
  const permitService = useMemo(() => new PermitApplicationService(), [])
  const businessOwnerService = useMemo(() => new BusinessOwnerService(), [])

  const loadBookmarks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await bookmarkService.getBookmarks()
      const bookmarksData = Array.isArray(response) ? response : []
      
      // Fetch full data for each bookmark
      const enrichedBookmarks = await Promise.all(
        bookmarksData.map(async (bookmark) => {
          try {
            if (bookmark.itemType === 'application') {
              const app = await permitService.getApplicationById(bookmark.itemId, bookmark.itemId)
              return { ...bookmark, itemData: app }
            } else if (bookmark.itemType === 'help_request') {
              const res = await getHelpRequestById(bookmark.itemId)
              return { ...bookmark, itemData: res }
            } else if (bookmark.itemType === 'business-owner') {
              const owner = await businessOwnerService.getBusinessOwnerById(bookmark.itemId)
              return { ...bookmark, itemData: owner }
            }
            return bookmark
          } catch (error) {
            console.error('Failed to fetch item data for bookmark:', bookmark._id, error)
            return bookmark
          }
        })
      )
      
      setBookmarks(enrichedBookmarks)
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }, [bookmarkService, permitService, businessOwnerService])

  useEffect(() => {
    loadBookmarks()
  }, [loadBookmarks])

  // Refresh bookmarks when page becomes visible (e.g., navigating back from other pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBookmarks()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadBookmarks])

  const handleSelectBookmark = useCallback(async (bookmark) => {
    setSelectedItem(bookmark)
    setDetailsLoading(true)
    try {
      if (bookmark.itemType === 'application') {
        const app = await permitService.getApplicationById(bookmark.itemId, bookmark.itemId)
        setItemData(app)
      } else if (bookmark.itemType === 'help_request') {
        // TODO: Fetch help request data
        setItemData({ requestId: bookmark.itemId })
      } else if (bookmark.itemType === 'business-owner') {
        const owner = await businessOwnerService.getBusinessOwnerById(bookmark.itemId)
        setItemData(owner)
      }
    } catch (error) {
      console.error('Failed to load item details:', error)
    } finally {
      setDetailsLoading(false)
    }
  }, [permitService, businessOwnerService])

  // Auto-select bookmark from URL query param
  useEffect(() => {
    const bookmarkId = searchParams.get('bookmarkId')
    if (bookmarkId && bookmarks.length > 0) {
      const bookmark = bookmarks.find(b => b._id === bookmarkId)
      if (bookmark) {
        handleSelectBookmark(bookmark)
      }
    }
  }, [searchParams, bookmarks, handleSelectBookmark])

  const handleDrawerClose = useCallback(() => {
    setSelectedItem(null)
    setItemData(null)
  }, [])

  const handleRemoveBookmark = useCallback(async (bookmarkId) => {
    try {
      await bookmarkService.removeBookmark(bookmarkId)
      setBookmarks(bookmarks.filter(b => b._id !== bookmarkId))
      if (selectedItem?._id === bookmarkId) {
        setSelectedItem(null)
        setItemData(null)
      }
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    }
  }, [bookmarks, selectedItem, bookmarkService])

  const handleBookmarkToggle = useCallback(() => {
    loadBookmarks()
    // Clear detail panel since the item might have been unbookmarked
    setSelectedItem(null)
    setItemData(null)
  }, [loadBookmarks])

  const renderCard = (bookmark, currentSelectedId, onSelect) => {
    const item = bookmark.itemData
    if (!item) return null

    if (bookmark.itemType === 'application') {
      const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG[item.applicationStatus] || { color: 'default', label: item.status || item.applicationStatus }
      const permitType = item.formType === 'general_permit' ? (item.formData?.generalPermitCategory || 'General') : 'Regular'
      const date = item.createdAt || item.updatedAt ? dayjs(item.createdAt || item.updatedAt).format('MMMM D, YYYY') : null

      const tags = [
        { label: 'Application', color: 'blue' },
        { label: statusConf.label, color: statusConf.color },
      ]
      if (permitType) {
        tags.push({ label: permitType, color: 'default' })
      }
      if (item.applicationReferenceNumber) {
        tags.push({ label: item.applicationReferenceNumber, color: 'default' })
      }

      return (
        <PanelCard
          key={bookmark._id}
          item={bookmark}
          selected={currentSelectedId === bookmark._id}
          onClick={() => onSelect(bookmark)}
          title={item.businessName || item.formData?.businessName || 'Unnamed Business'}
          description=''
          metaInfo={[
            ...(date ? [{ label: 'Last updated', value: date }] : []),
            ...(item.reviewedByName ? [{ label: 'Claimed by', value: item.reviewedByName }] : []),
          ]}
          tags={tags}
          isBookmarked={true}
          actions={[
            {
              icon: 'star',
              onClick: (e) => {
                e.stopPropagation()
                handleRemoveBookmark(bookmark._id)
              },
              title: 'Remove Bookmark',
            },
          ]}
        />
      )
    } else if (bookmark.itemType === 'help_request') {
      const statusConf = HELP_REQUEST_STATUS_CONFIG[item.status] || { color: 'default', label: item.status }
      const date = item.createdAt ? dayjs(item.createdAt).format('MMMM D, YYYY') : null

      const tags = [
        { label: 'Help Request', color: 'gold' },
        { label: statusConf.label, color: statusConf.color },
      ]

      return (
        <PanelCard
          key={bookmark._id}
          item={bookmark}
          selected={currentSelectedId === bookmark._id}
          onClick={() => onSelect(bookmark)}
          title={item.subject || 'No Subject'}
          description={item.message || ''}
          metaInfo={[
            ...(date ? [{ label: 'Created', value: date }] : []),
          ]}
          tags={tags}
          isBookmarked={true}
          actions={[
            {
              icon: 'star',
              onClick: (e) => {
                e.stopPropagation()
                handleRemoveBookmark(bookmark._id)
              },
              title: 'Remove Bookmark',
            },
          ]}
        />
      )
    } else if (bookmark.itemType === 'business-owner') {
      const fullName = [item.firstName, item.middleName, item.lastName, item.suffix].filter(Boolean).join(' ') || 'Unknown Owner'
      const date = item.createdAt ? dayjs(item.createdAt).format('MMMM D, YYYY') : null
      const statusLabel = item.deletionPending ? 'Pending Deletion' : (item.isActive ? 'Active' : 'Inactive')

      const tags = [
        { label: 'Business Owner', color: 'green' },
        { label: statusLabel, color: item.isActive ? 'success' : 'default' },
      ]
      if (item.businessCount !== undefined) {
        tags.push({ label: `${item.businessCount} business${item.businessCount !== 1 ? 'es' : ''}`, color: 'default' })
      }

      return (
        <PanelCard
          key={bookmark._id}
          item={bookmark}
          selected={currentSelectedId === bookmark._id}
          onClick={() => onSelect(bookmark)}
          title={fullName}
          description={item.email || ''}
          metaInfo={[
            ...(date ? [{ label: 'Registered', value: date }] : []),
            ...(item.phoneNumber ? [{ label: 'Phone', value: item.phoneNumber }] : []),
          ]}
          tags={tags}
          isBookmarked={true}
          actions={[
            {
              icon: 'star',
              onClick: (e) => {
                e.stopPropagation()
                handleRemoveBookmark(bookmark._id)
              },
              title: 'Remove Bookmark',
            },
          ]}
        />
      )
    }

    return null
  }

  if (loading) {
    return (
      <SplitLayout
        listContent={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        }
        detailContent={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        }
        onDrawerClose={handleDrawerClose}
      />
    )
  }

  return (
    <SplitLayout
      listContent={
        bookmarks.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Empty description="No bookmarks yet" />
          </div>
        ) : (
          <ListPanel
            items={bookmarks}
            isLoading={loading}
            selectedId={selectedItem?._id}
            onSelectItem={handleSelectBookmark}
            renderCard={renderCard}
          />
        )
      }
      detailContent={
        selectedItem ? (
          detailsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              {selectedItem.itemType === 'application' && itemData ? (
                <ApplicationDetailPanel
                  application={itemData}
                  onReviewComplete={() => {}}
                  onBookmarkToggle={handleBookmarkToggle}
                  onClose={handleDrawerClose}
                />
              ) : selectedItem.itemType === 'help_request' && itemData ? (
                <HelpRequestDetailPanel
                  request={itemData}
                  onReviewComplete={() => {}}
                  onBookmarkToggle={handleBookmarkToggle}
                />
              ) : selectedItem.itemType === 'business-owner' && itemData ? (
                <BusinessOwnerDetailPanel
                  businessOwner={itemData}
                  onReviewComplete={() => {}}
                  onBookmarkToggle={handleBookmarkToggle}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Empty description="Details not available" />
                </div>
              )}
            </>
          )
        ) : null
      }
      onDrawerClose={handleDrawerClose}
    />
  )
}
