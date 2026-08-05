/**
 * Get email status tag for application cards
 * @param {Object} emailSendStatus - The emailSendStatus object from application
 * @returns {Object|null} - Email status tag object with label and color, or null if no emails
 */
export function getEmailStatusTag(emailSendStatus) {
  const emailTypes = Object.keys(emailSendStatus || {})
  
  if (emailTypes.length === 0) {
    return null
  }

  const hasFailed = emailTypes.some(type => emailSendStatus[type]?.status === 'failed')
  const hasSent = emailTypes.some(type => emailSendStatus[type]?.status === 'sent')

  if (hasFailed) {
    return { label: 'Email error', color: 'error' }
  } else if (hasSent) {
    return { label: 'Emails sent', color: 'default' }
  }

  return null
}
