import { useState, useCallback } from 'react'
import { App } from 'antd'

/**
 * usePermitBookmarks
 * 
 * Handles bookmark toggle for permit processing requests.
 * Uses the shared BookmarkService for consistency.
 * 
 * TODO: Connect to real bookmark service
 * TODO: Add WebSocket event emission for real-time updates
 */
export function usePermitBookmarks(permit, onToggle) {
  const { message } = App.useApp()
  const [isBookmarked, setIsBookmarked] = useState(permit?.isBookmarked || false)
  const [loading, setLoading] = useState(false)

  const handleBookmarkToggle = useCallback(async () => {
    if (!permit?._id) return

    setLoading(true)
    try {
      // TODO: Replace with real bookmark service call
      // const bookmarkService = new BookmarkService()
      // if (isBookmarked) {
      //   await bookmarkService.removeBookmark('permit-processing', permit._id)
      // } else {
      //   await bookmarkService.addBookmark('permit-processing', permit._id)
      // }
      
      console.log('[MOCK] Toggle bookmark for permit:', permit._id, isBookmarked ? 'remove' : 'add')
      setIsBookmarked(!isBookmarked)
      onToggle?.()
      message.success(isBookmarked ? 'Bookmark removed' : 'Bookmark added')
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
      message.error('Failed to toggle bookmark')
    } finally {
      setLoading(false)
    }
  }, [permit, isBookmarked, onToggle, message])

  return {
    isBookmarked,
    handleBookmarkToggle,
    loading,
  }
}
