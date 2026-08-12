import { get, post } from '@/lib/http.js'

const BASE_PATH = '/api/staffs/walk-in'

/**
 * Get walk-in appointments
 */
export async function getWalkInAppointments() {
  return get(BASE_PATH)
}

/**
 * Get walk-in appointment by ID
 * @param {string} appointmentId - Appointment ID
 */
export async function getWalkInAppointment(appointmentId) {
  return get(`${BASE_PATH}/${appointmentId}`)
}

/**
 * Create new walk-in appointment
 * @param {object} appointmentData - Appointment data
 */
export async function createWalkInAppointment(appointmentData) {
  return post(BASE_PATH, appointmentData)
}

/**
 * Update walk-in appointment
 * @param {string} appointmentId - Appointment ID
 * @param {object} appointmentData - Appointment data
 */
export async function updateWalkInAppointment(appointmentId, appointmentData) {
  return post(`${BASE_PATH}/${appointmentId}`, appointmentData)
}

/**
 * Cancel walk-in appointment
 * @param {string} appointmentId - Appointment ID
 */
export async function cancelWalkInAppointment(appointmentId) {
  return post(`${BASE_PATH}/${appointmentId}/cancel`)
}

/**
 * Check in walk-in appointment
 * @param {string} appointmentId - Appointment ID
 */
export async function checkInWalkInAppointment(appointmentId) {
  return post(`${BASE_PATH}/${appointmentId}/check-in`)
}

/**
 * Complete walk-in appointment
 * @param {string} appointmentId - Appointment ID
 * @param {object} completionData - Completion data
 */
export async function completeWalkInAppointment(appointmentId, completionData) {
  return post(`${BASE_PATH}/${appointmentId}/complete`, completionData)
}

/**
 * Serve a walk-in visitor from the queue
 * @param {string} appointmentId - Appointment ID
 */
export async function serveWalkIn(appointmentId) {
  return post(`${BASE_PATH}/${appointmentId}/serve`)
}

/**
 * Mark a walk-in as no-show
 * @param {string} appointmentId - Appointment ID
 */
export async function markAsNoShow(appointmentId) {
  return post(`${BASE_PATH}/${appointmentId}/no-show`)
}


/**
 * Get walk-in queue
 * @param {string} serviceType - Service type filter
 */
export async function getWalkInQueue(serviceType) {
  const query = serviceType ? `?serviceType=${serviceType}` : ''
  return get(`${BASE_PATH}/queue${query}`)
}

/**
 * Get walk-in services
 */
export async function getWalkInServices() {
  return get(`${BASE_PATH}/services`)
}

/**
 * Get walk-in statistics
 */
export async function getWalkInStats() {
  return get(`${BASE_PATH}/stats`)
}

/**
 * Get walk-in staff availability
 */
export async function getStaffAvailability() {
  return get(`${BASE_PATH}/staff-availability`)
}

/**
 * Update staff availability
 * @param {string} staffId - Staff ID
 * @param {object} availabilityData - Availability data
 */
export async function updateStaffAvailability(staffId, availabilityData) {
  return post(`${BASE_PATH}/staff-availability/${staffId}`, availabilityData)
}

/**
 * Get citizen information
 * @param {string} citizenId - Citizen ID
 */
export async function getCitizenInfo(citizenId) {
  return get(`${BASE_PATH}/citizens/${citizenId}`)
}

/**
 * Search citizens
 * @param {object} searchParams - Search parameters
 */
export async function searchCitizens(searchParams) {
  const query = new URLSearchParams(searchParams).toString()
  return get(`${BASE_PATH}/citizens/search?${query}`)
}

/**
 * Create citizen record
 * @param {object} citizenData - Citizen data
 */
export async function createCitizen(citizenData) {
  return post(`${BASE_PATH}/citizens`, citizenData)
}

/**
 * Update citizen record
 * @param {string} citizenId - Citizen ID
 * @param {object} citizenData - Citizen data
 */
export async function updateCitizen(citizenId, citizenData) {
  return post(`${BASE_PATH}/citizens/${citizenId}`, citizenData)
}

/**
 * Get service requirements
 * @param {string} serviceType - Service type
 */
export async function getServiceRequirements(serviceType) {
  return get(`${BASE_PATH}/services/${serviceType}/requirements`)
}

/**
 * Upload service documents
 * @param {string} appointmentId - Appointment ID
 * @param {object} documents - Document data
 */
export async function uploadServiceDocuments(appointmentId, documents) {
  return post(`${BASE_PATH}/${appointmentId}/documents`, documents)
}

/**
 * Get appointment history
 * @param {string} citizenId - Citizen ID
 */
export async function getAppointmentHistory(citizenId) {
  return get(`${BASE_PATH}/citizens/${citizenId}/history`)
}

/**
 * Generate appointment receipt
 * @param {string} appointmentId - Appointment ID
 */
export async function generateReceipt(appointmentId) {
  return get(`${BASE_PATH}/${appointmentId}/receipt`)
}

/**
 * Send appointment notification
 * @param {string} appointmentId - Appointment ID
 * @param {object} notificationData - Notification data
 */
export async function sendNotification(appointmentId, notificationData) {
  return post(`${BASE_PATH}/${appointmentId}/notify`, notificationData)
}

// Constants for service types and statuses
export const WALK_IN_SERVICE_TYPES = {
  BUSINESS_REGISTRATION: 'business_registration',
  PERMIT_APPLICATION: 'permit_application',
  DOCUMENT_REQUEST: 'document_request',
  COMPLAINT_FILING: 'complaint_filing',
  INFORMATION_INQUIRY: 'information_inquiry',
  PAYMENT_PROCESSING: 'payment_processing',
  CERTIFICATE_REQUEST: 'certificate_request',
  VIOLATION_REPORT: 'violation_report',
  APPEAL_SUBMISSION: 'appeal_submission'
}

export const WALK_IN_STATUSES = {
  SCHEDULED: 'scheduled',
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
}

export const WALK_IN_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
}

export const getWalkInServiceTypeLabel = (type) => {
  const labels = {
    [WALK_IN_SERVICE_TYPES.BUSINESS_REGISTRATION]: 'Business Registration',
    [WALK_IN_SERVICE_TYPES.PERMIT_APPLICATION]: 'Permit Application',
    [WALK_IN_SERVICE_TYPES.DOCUMENT_REQUEST]: 'Document Request',
    [WALK_IN_SERVICE_TYPES.COMPLAINT_FILING]: 'Complaint Filing',
    [WALK_IN_SERVICE_TYPES.INFORMATION_INQUIRY]: 'Information Inquiry',
    [WALK_IN_SERVICE_TYPES.PAYMENT_PROCESSING]: 'Payment Processing',
    [WALK_IN_SERVICE_TYPES.CERTIFICATE_REQUEST]: 'Certificate Request',
    [WALK_IN_SERVICE_TYPES.VIOLATION_REPORT]: 'Violation Report',
    [WALK_IN_SERVICE_TYPES.APPEAL_SUBMISSION]: 'Appeal Submission'
  }
  return labels[type] || type
}

export const getWalkInStatusLabel = (status) => {
  const labels = {
    [WALK_IN_STATUSES.SCHEDULED]: 'Scheduled',
    [WALK_IN_STATUSES.WAITING]: 'Waiting',
    [WALK_IN_STATUSES.IN_PROGRESS]: 'In Progress',
    [WALK_IN_STATUSES.COMPLETED]: 'Completed',
    [WALK_IN_STATUSES.CANCELLED]: 'Cancelled',
    [WALK_IN_STATUSES.NO_SHOW]: 'No Show'
  }
  return labels[status] || status
}

export const getWalkInPriorityLabel = (priority) => {
  const labels = {
    [WALK_IN_PRIORITIES.LOW]: 'Low',
    [WALK_IN_PRIORITIES.NORMAL]: 'Normal',
    [WALK_IN_PRIORITIES.HIGH]: 'High',
    [WALK_IN_PRIORITIES.URGENT]: 'Urgent'
  }
  return labels[priority] || priority
}
