import { clearAllApplications } from '@/features/business-owner/services/applicationService'

/**
 * Hook for application list actions.
 * @param {Object} params
 * @param {Object} params.message - Ant Design message API
 * @param {Object} params.modal - Ant Design modal API
 * @returns {Object} List action handlers
 */
export function useApplicationListActions({ message, modal }) {
  const handleClearApplications = () => {
    modal.confirm({
      title: 'Clear All Applications?',
      content: 'This will delete all your applications and reset the welcome state. This action cannot be undone.',
      okText: 'Clear',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await clearAllApplications()
          message.success('Applications cleared successfully')
          window.location.reload()
        } catch (err) {
          console.error('Failed to clear applications:', err)
          message.error('Failed to clear applications')
        }
      },
    })
  }

  return { handleClearApplications }
}
