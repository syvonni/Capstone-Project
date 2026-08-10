import { get, post, del } from '@/lib/http.js'

export default class BookmarkService {
  async getBookmarks() {
    const response = await get('/api/bookmarks')
    return response
  }

  async addBookmark(itemType, itemId) {
    const response = await post('/api/bookmarks', { itemType, itemId })
    return response
  }

  async removeBookmark(bookmarkId) {
    const response = await del(`/api/bookmarks/${bookmarkId}`)
    return response
  }

  async checkBookmark(itemType, itemId) {
    const response = await get(`/api/bookmarks/check?itemType=${itemType}&itemId=${itemId}`)
    return response
  }
}
