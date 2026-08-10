import { get, post, put, del } from '@/lib/http.js'

export default class BusinessOwnerService {
  async getBusinessOwners(_filters = {}, pagination = {}) {
    const { page = 1, limit = 20, status = 'all' } = pagination
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status
    })
    const response = await get(`/api/auth/lgu-officer/business-owners?${params}`)
    return response
  }

  async searchBusinessOwners(params, pagination = {}) {
    const { page = 1, limit = 20 } = pagination
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...params
    })
    const response = await get(`/api/auth/lgu-officer/business-owners/search?${queryParams}`)
    return response
  }

  async checkDuplicate(params) {
    const queryParams = new URLSearchParams(params)
    const response = await get(`/api/auth/lgu-officer/business-owners/check-duplicate?${queryParams}`)
    return response
  }

  async getBusinessOwnerById(id) {
    const response = await get(`/api/auth/lgu-officer/business-owners/${id}`)
    return response
  }

  async getBusinessOwnerApplications(id) {
    // Fetch applications from business-service by userId
    // The id is the User._id from auth-service
    const response = await get(`/api/business/applications?userId=${id}`)
    return response || []
  }

  async getBusinessOwnerBusinesses(_id) {
    // TODO: Implement proxy to business-service
    // For now, return empty array
    return { data: [] }
  }

  async registerBusinessOwner(data, options = {}) {
    const { stepUpToken } = options
    const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
    const response = await post('/api/auth/lgu-officer/business-owners', data, { headers })
    return response
  }

  async updateBusinessOwnerInfo(id, data, options = {}) {
    const response = await put(`/api/auth/lgu-officer/business-owners/${id}`, data, options)
    return response
  }

  async updateBusinessOwnerEmail(id, data, options = {}) {
    const { stepUpToken } = options
    const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
    const response = await put(`/api/auth/lgu-officer/business-owners/${id}/email`, data, { headers })
    return response
  }

  async updateBusinessOwnerStatus(id, status) {
    const response = await put(`/api/auth/lgu-officer/business-owners/${id}/status`, { status })
    return response
  }

  async unlockBusinessOwner(id) {
    const response = await put(`/api/auth/lgu-officer/business-owners/${id}/unlock`)
    return response
  }

  async resetBusinessOwnerPassword(id) {
    const response = await put(`/api/auth/lgu-officer/business-owners/${id}/password`)
    return response
  }

  async deleteBusinessOwner(id) {
    const response = await del(`/api/auth/lgu-officer/business-owners/${id}`)
    return response
  }

  async resendCredentialsEmail(id, options = {}) {
    const { stepUpToken } = options
    const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
    const response = await post(`/api/auth/lgu-officer/business-owners/${id}/resend-credentials`, {}, { headers })
    return response
  }

  async resendEditInfoEmail(id, options = {}) {
    const { stepUpToken } = options
    const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
    const response = await post(`/api/auth/lgu-officer/business-owners/${id}/resend-edit-info`, {}, { headers })
    return response
  }

  async resendEmailChangeNotification(id, options = {}) {
    const { stepUpToken } = options
    const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
    const response = await post(`/api/auth/lgu-officer/business-owners/${id}/resend-email-change`, {}, { headers })
    return response
  }

  async resetEmailStatus(id, emailType, options = {}) {
    const { stepUpToken } = options
    const headers = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {}
    const response = await put(`/api/auth/lgu-officer/business-owners/${id}/reset-email-status`, { emailType }, { headers })
    return response
  }
}
