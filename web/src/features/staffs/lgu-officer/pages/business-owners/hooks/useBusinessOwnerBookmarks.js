import { useState, useEffect, useCallback, useMemo } from 'react'
import { message } from 'antd'
import BookmarkService from '@/features/staffs/lgu-officer/services/bookmarkService'

/**
 * Manages bookmark state and operations for business owners
 * Handles checking, adding, and removing bookmarks
 */
export function useBusinessOwnerBookmarks(businessOwner) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkId, setBookmarkId] = useState(null)
  const [loading, setLoading] = useState(false)

  const ownerId = businessOwner?._id || businessOwner?.id

  const bookmarkService = useMemo(() => new BookmarkService(), [])

  /**
   * Check if business owner is bookmarked
   */
  useEffect(() => {
    const checkBookmark = async () => {
      if (!ownerId) return

      try {
        setLoading(true)
        const bookmarkCheck = await bookmarkService.checkBookmark('business-owner', ownerId)
        setIsBookmarked(bookmarkCheck.isBookmarked)
        setBookmarkId(bookmarkCheck.bookmark?._id || null)
      } catch (err) {
        console.error('Failed to check bookmark:', err)
      } finally {
        setLoading(false)
      }
    }

    checkBookmark()
  }, [ownerId, bookmarkService])

  /**
   * Toggle bookmark status
   */
  const toggleBookmark = useCallback(async () => {
    if (!ownerId) return

    try {
      setLoading(true)

      if (isBookmarked && bookmarkId) {
        // Remove bookmark
        await bookmarkService.removeBookmark(bookmarkId)
        setIsBookmarked(false)
        setBookmarkId(null)
        message.success('Bookmark removed')
      } else {
        // Add bookmark
        const bookmark = await bookmarkService.addBookmark('business-owner', ownerId)
        setIsBookmarked(true)
        setBookmarkId(bookmark._id)
        message.success('Bookmark added')
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
      message.error('Failed to update bookmark')
    } finally {
      setLoading(false)
    }
  }, [ownerId, isBookmarked, bookmarkId, bookmarkService])

  return {
    isBookmarked,
    bookmarkId,
    loading,
    toggleBookmark
  }
}
