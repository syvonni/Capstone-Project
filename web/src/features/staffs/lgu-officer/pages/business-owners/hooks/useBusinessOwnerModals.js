import { useState, useCallback } from 'react'

/**
 * Manages modal state for business owner detail panel
 * Handles opening/closing of edit, email, history, manual, and info modals
 */
export function useBusinessOwnerModals() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [editInfoModalOpen, setEditInfoModalOpen] = useState(false)
  const [updateEmailModalOpen, setUpdateEmailModalOpen] = useState(false)

  const openHistoryModal = useCallback(() => {
    setHistoryModalOpen(true)
  }, [])

  const closeHistoryModal = useCallback(() => {
    setHistoryModalOpen(false)
  }, [])

  const openEditInfoModal = useCallback(() => {
    setEditInfoModalOpen(true)
  }, [])

  const closeEditInfoModal = useCallback(() => {
    setEditInfoModalOpen(false)
  }, [])

  const openUpdateEmailModal = useCallback(() => {
    setUpdateEmailModalOpen(true)
  }, [])

  const closeUpdateEmailModal = useCallback(() => {
    setUpdateEmailModalOpen(false)
  }, [])

  const closeAllModals = useCallback(() => {
    setHistoryModalOpen(false)
    setEditInfoModalOpen(false)
    setUpdateEmailModalOpen(false)
  }, [])

  return {
    historyModalOpen,
    editInfoModalOpen,
    updateEmailModalOpen,
    openHistoryModal,
    closeHistoryModal,
    openEditInfoModal,
    closeEditInfoModal,
    openUpdateEmailModal,
    closeUpdateEmailModal,
    closeAllModals,
  }
}
