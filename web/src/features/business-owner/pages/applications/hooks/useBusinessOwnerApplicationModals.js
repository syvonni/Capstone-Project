import { useState } from 'react'
import { App } from 'antd'
import { buildReceiptInfo } from '../utils/paymentUtils'

/**
 * Manages all modal states for business owner applications
 * Centralizes modal open/close logic to reduce component complexity
 * Follows LGU officer pattern
 */
export function useBusinessOwnerApplicationModals({ application, onPaymentSuccess, feeData } = {}) {
  const { message } = App.useApp()

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
  const [showResubmitModal, setShowResubmitModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showAppealPaymentModal, setShowAppealPaymentModal] = useState(false)
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

  // Payment/resubmit handlers
  const handleSubmitAndPay = (isReturned) => {
    if (isReturned) {
      setShowResubmitModal(true)
    } else {
      setShowPaymentModal(true)
    }
  }

  const handleResubmitConfirm = () => {
    setShowResubmitModal(false)
    if (!application || !onPaymentSuccess) return
    const receiptInfo = buildReceiptInfo({
      receiptId: 'RESUBMIT-' + Date.now(),
      application,
      feeData,
      transactionName: 'Application Resubmission',
    })
    onPaymentSuccess(receiptInfo)
  }

  const handlePaymentSuccess = (receiptId) => {
    setShowPaymentModal(false)
    if (!application || !onPaymentSuccess) return
    const receiptInfo = buildReceiptInfo({
      receiptId,
      application,
      feeData,
      transactionName: 'Business Permit Application',
    })
    onPaymentSuccess(receiptInfo)
  }

  const handlePaymentFail = () => {
    setShowPaymentModal(false)
    message.error('Payment cancelled. Application was not submitted.')
  }

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
    showResubmitModal,
    setShowResubmitModal,
    showReceiptModal,
    setShowReceiptModal,
    showAppealPaymentModal,
    setShowAppealPaymentModal,
    feeData,
    isSubmittingPayment,
    setIsSubmittingPayment,

    // Payment handlers
    handleSubmitAndPay,
    handleResubmitConfirm,
    handlePaymentSuccess,
    handlePaymentFail,

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
