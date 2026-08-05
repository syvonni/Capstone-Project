import { useState, useCallback, useMemo, useEffect } from 'react'
import { App } from 'antd'
import BookmarkService from '@/features/staffs/lgu-officer/services/bookmarkService'

/**
 * Manages bookmark state and operations for applications
 * Centralizes bookmark checking, adding, and removing logic
 */
export function useApplicationBookmarks(application, onBookmarkToggle) {
  const { message } = App.useApp()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkId, setBookmarkId] = useState(null)

  const bookmarkService = useMemo(() => new BookmarkService(), [])

  /**
   * Check if the current application is bookmarked
   */
  const checkBookmarkStatus = useCallback(async () => {
    const appId = application?.businessId || application?.applicationId || application?._id
    if (!appId) return

    try {
      const bookmarkCheck = await bookmarkService.checkBookmark('application', appId)
      setIsBookmarked(bookmarkCheck.isBookmarked)
      setBookmarkId(bookmarkCheck.bookmark?._id || null)
    } catch (bookmarkError) {
      console.error('Failed to check bookmark status:', bookmarkError)
      setIsBookmarked(false)
      setBookmarkId(null)
    }
  }, [application, bookmarkService])

  // Check bookmark status when application changes
  useEffect(() => {
    checkBookmarkStatus()
  }, [checkBookmarkStatus])

  /**
   * Toggle bookmark status (add or remove)
   */
  const handleBookmarkToggle = useCallback(async () => {
    const appId = application?.businessId || application?.applicationId || application?._id
    if (!appId) return

    try {
      if (isBookmarked && bookmarkId) {
        await bookmarkService.removeBookmark(bookmarkId)
        setIsBookmarked(false)
        setBookmarkId(null)
        message.success('Bookmark removed')
      } else {
        const bookmark = await bookmarkService.addBookmark('application', appId)
        setIsBookmarked(true)
        setBookmarkId(bookmark._id)
        message.success('Application bookmarked')
      }
      onBookmarkToggle?.()
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
      // If it's a 409 (already bookmarked), re-check the bookmark status
      if (error?.message?.includes('already bookmarked') || error?.status === 409) {
        const bookmarkCheck = await bookmarkService.checkBookmark('application', appId)
        setIsBookmarked(bookmarkCheck.isBookmarked)
        setBookmarkId(bookmarkCheck.bookmark?._id || null)
        message.info('Already bookmarked')
        onBookmarkToggle?.()
      } else {
        message.error('Failed to update bookmark')
      }
    }
  }, [application, isBookmarked, bookmarkId, bookmarkService, message, onBookmarkToggle])

  return {
    isBookmarked,
    bookmarkId,
    checkBookmarkStatus,
    handleBookmarkToggle,
  }
}
