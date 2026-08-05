import { useState } from 'react'

/**
 * Manages all modal states for business owner applications
 * Centralizes modal open/close logic to reduce component complexity
 * Follows LGU officer pattern
 */
export function useApplicationModals(registrationType = null, generalPermitCategory = null) {
  // Document modals
  const [documentModal, setDocumentModal] = useState({ open: false, url: null, label: '', type: 'other' })
  const [documentPreview, setDocumentPreview] = useState({ open: false, url: null, label: '', type: 'other' })
  const [previewModal, setPreviewModal] = useState({ open: false, url: null, label: '', type: 'other' })

  // Info/help modals
  const [manualVisible, setManualVisible] = useState(false)
  const [permitModalOpen, setPermitModalOpen] = useState(false)
  const [changesModalOpen, setChangesModalOpen] = useState(false)

  // Progress/timeline modal
  const [progressModalOpen, setProgressModalOpen] = useState(false)

  // Payment modals
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showAppealPaymentModal, setShowAppealPaymentModal] = useState(false)
  const [feeData, setFeeData] = useState(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Appeal modals
  const [appealModalOpen, setAppealModalOpen] = useState(false)
  const [showAppealDetailsModal, setShowAppealDetailsModal] = useState(false)
  const [showAppRejectionModal, setShowAppRejectionModal] = useState(false)
  const [showAppealRejectionModal, setShowAppealRejectionModal] = useState(false)
  const [showApprovalCommentModal, setShowApprovalCommentModal] = useState(false)

  // Modal data states
  const [receiptData, setReceiptData] = useState(null)
  const [appealLetter, setAppealLetter] = useState('')
  const [appealFiles, setAppealFiles] = useState([])
  const [appealDetails, setAppealDetails] = useState(null)
  const [appealReceiptData, setAppealReceiptData] = useState(null)

  // Loading states
  const [submittingAppeal, setSubmittingAppeal] = useState(false)
  const [loadingAppealDetails, setLoadingAppealDetails] = useState(false)

  // UI state
  const [hoveredCard, setHoveredCard] = useState(null)

  return {
    // Document modals
    documentModal,
    setDocumentModal,
    documentPreview,
    setDocumentPreview,
    previewModal,
    setPreviewModal,

    // Info/help modals
    manualVisible,
    setManualVisible,
    permitModalOpen,
    setPermitModalOpen,
    changesModalOpen,
    setChangesModalOpen,

    // Progress/timeline modal
    progressModalOpen,
    setProgressModalOpen,

    // Payment modals
    showPaymentModal,
    setShowPaymentModal,
    showReceiptModal,
    setShowReceiptModal,
    showAppealPaymentModal,
    setShowAppealPaymentModal,
    feeData,
    setFeeData,
    isSubmittingPayment,
    setIsSubmittingPayment,

    // Appeal modals
    appealModalOpen,
    setAppealModalOpen,
    showAppealDetailsModal,
    setShowAppealDetailsModal,
    showAppRejectionModal,
    setShowAppRejectionModal,
    showAppealRejectionModal,
    setShowAppealRejectionModal,
    showApprovalCommentModal,
    setShowApprovalCommentModal,

    // Modal data states
    receiptData,
    setReceiptData,
    appealLetter,
    setAppealLetter,
    appealFiles,
    setAppealFiles,
    appealDetails,
    setAppealDetails,
    appealReceiptData,
    setAppealReceiptData,

    // Loading states
    submittingAppeal,
    setSubmittingAppeal,
    loadingAppealDetails,
    setLoadingAppealDetails,

    // UI state
    hoveredCard,
    setHoveredCard,
  }
}
