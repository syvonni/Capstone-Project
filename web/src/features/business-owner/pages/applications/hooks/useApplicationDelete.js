import { App } from 'antd'
import { deleteApplication } from '@/features/business-owner/services/applicationService'

/**
 * Hook for application delete confirmation and deletion.
 * Supports deleting by application object, explicit id, or draft id,
 * plus an optional custom onDelete callback.
 * @param {Object} params
 * @param {Object} [params.application] - Application object to delete
 * @param {string} [params.applicationId] - Explicit application id
 * @param {string} [params.draftApplicationId] - Draft application id (legacy alias)
 * @param {Function} [params.onDelete] - Custom delete callback (replaces internal delete)
 * @param {Function} [params.onAfterDelete] - Called after successful delete
 * @param {Function} [params.onBack] - Alias for onAfterDelete
 * @param {Object} [params.message] - Ant Design message API
 * @returns {Object} handleDeleteClick
 */
export function useApplicationDelete({
  application,
  applicationId,
  draftApplicationId,
  onDelete,
  onAfterDelete,
  onBack,
  message: messageProp,
}) {
  const { modal, message: messageFromApp } = App.useApp()
  const message = messageProp || messageFromApp

  const handleDeleteClick = () => {
    modal.confirm({
      title: 'Delete Draft Application',
      content: 'Are you sure you want to delete this draft application? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          if (onDelete) {
            await onDelete()
          } else {
            const targetId =
              draftApplicationId ||
              applicationId ||
              application?.applicationId ||
              application?._id

            if (!targetId) {
              console.error('[useApplicationDelete] No application ID found')
              message.error('Cannot delete: No application ID found')
              return
            }

            await deleteApplication(targetId)
          }

          message.success('Application deleted.')

          const afterDelete = onAfterDelete || onBack
          if (afterDelete) {
            afterDelete()
          }
        } catch (err) {
          console.error('Failed to delete application:', err)
          message.error(err?.message || 'Failed to delete application')
        }
      },
    })
  }

  return {
    handleDeleteClick,
  }
}
