import { useCallback, useMemo } from 'react'
import { StarOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import BookmarkService from '../services/bookmarkService'
import { PermitApplicationService } from '@/features/staffs/lgu-officer/services/permitApplicationService'
import { getHelpRequestById } from '../services/helpRequestService'
import ListCard from '@/shared/components/ListCard.jsx'

export default function RecentBookmarksCard() {
  const navigate = useNavigate()
  const bookmarkService = useMemo(() => new BookmarkService(), [])
  const permitService = useMemo(() => new PermitApplicationService(), [])

  const fetchBookmarks = useCallback(async () => {
    try {
      const response = await bookmarkService.getBookmarks()
      const bookmarksData = Array.isArray(response) ? response : []
      
      const enrichedBookmarks = await Promise.all(
        bookmarksData.map(async (bookmark) => {
          try {
            if (bookmark.itemType === 'application') {
              const app = await permitService.getApplicationById(bookmark.itemId, bookmark.itemId)
              return { ...bookmark, itemData: app }
            } else if (bookmark.itemType === 'help_request') {
              const res = await getHelpRequestById(bookmark.itemId)
              return { ...bookmark, itemData: res }
            }
            return bookmark
          } catch (error) {
            console.error('Failed to fetch item data for bookmark:', bookmark._id, error)
            return bookmark
          }
        })
      )
      
      const sortedBookmarks = enrichedBookmarks
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 3)
      
      return sortedBookmarks
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
      return []
    }
  }, [bookmarkService, permitService])

  const handleBookmarkClick = useCallback((bookmark) => {
    navigate(`/staff/bookmarks?bookmarkId=${bookmark._id}`)
  }, [navigate])

  const handleViewAllClick = useCallback(() => {
    navigate('/staff/bookmarks')
  }, [navigate])

  const getBookmarkTitle = useCallback((bookmark) => {
    const item = bookmark.itemData
    if (!item) return 'Unknown'
    
    if (bookmark.itemType === 'application') {
      return item.businessName || item.formData?.businessName || 'Unnamed Business'
    } else if (bookmark.itemType === 'help_request') {
      return item.subject || 'No Subject'
    }
    
    return 'Unknown'
  }, [])

  return (
    <ListCard
      icon={<StarOutlined />}
      title="Recent Bookmarks"
      fetchItems={fetchBookmarks}
      renderItem={(bookmark) => (
        <span style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          display: 'block',
        }}>
          {getBookmarkTitle(bookmark)}
        </span>
      )}
      onItemClick={handleBookmarkClick}
      onViewAll={handleViewAllClick}
      viewAllText="View all"
      emptyText="No bookmarks yet"
    />
  )
}
