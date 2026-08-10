import { get } from '@/lib/http'

// Request deduplication cache to prevent duplicate simultaneous requests
const pendingRequests = new Map()

/**
 * Public LOB service - for use by business-owner, staffs, and public features
 */

export const getLobs = async (params = {}) => {
  const { category, isActive, status, _id } = params
  const queryParams = new URLSearchParams()
  if (category) queryParams.append('category', category)
  if (isActive !== undefined) queryParams.append('isActive', isActive)
  if (status) queryParams.append('status', status)
  if (_id) queryParams.append('_id', _id)
  const queryString = queryParams.toString()
  const cacheKey = `lobs:${queryString}`

  // If a request is already in flight, return the existing promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  // Create and cache the request promise
  const requestPromise = get(`/api/public/business/lobs?${queryString}`)
    .then(res => res || [])
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}
