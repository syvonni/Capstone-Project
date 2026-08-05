import { useState, useEffect } from 'react'
import { App } from 'antd'
import { useAuthSession } from '@/features/authentication'
import { getAdminList } from '@/features/admin/services/staffService'
import dayjs from 'dayjs'
import { REQUEST_EXPIRY_HOURS } from '../constants/maintenance.constants.js'
import { entityId } from '../utils/maintenance.utils.js'

export function useMaintenanceApprovalActions(approval, allApprovals, onApprove, onUndoVote, onCancelApproved, onRefresh) {
  const { message } = App.useApp()
  const { currentUser } = useAuthSession()
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [actionApproved, setActionApproved] = useState(true)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [admins, setAdmins] = useState([])
  const [localApproval, setLocalApproval] = useState(approval)

  const currentUserId = entityId(currentUser)
  const isPending = localApproval?.status === 'pending'
  const hasVoted = localApproval?.approvals?.some((a) => entityId(a.adminId) === currentUserId)
  const myVote = localApproval?.approvals?.find((a) => entityId(a.adminId) === currentUserId)
  const requesterId = entityId(localApproval?.requestedBy)
  const isRequester = localApproval ? requesterId === currentUserId : false
  const canVote = isPending && !hasVoted && !isRequester
  const scheduledStart = localApproval?.requestDetails?.scheduledStartAt ? dayjs(localApproval.requestDetails.scheduledStartAt) : null
  const isApprovedUpcoming = localApproval?.status === 'approved' && scheduledStart?.isValid() && scheduledStart.isAfter(dayjs())

  const getUndoDeadline = () => {
    if (!myVote?.timestamp) return null

    const now = dayjs()
    const voteTime = dayjs(myVote.timestamp)
    const deadlines = []

    // 24-hour undo window from vote time
    deadlines.push(voteTime.add(24, 'hour'))

    // Request expiry (48 hours from creation)
    if (localApproval?.createdAt) {
      deadlines.push(dayjs(localApproval.createdAt).add(REQUEST_EXPIRY_HOURS, 'hour'))
    }

    // Scheduled start time
    if (localApproval?.requestDetails?.scheduledStartAt) {
      deadlines.push(dayjs(localApproval.requestDetails.scheduledStartAt))
    }

    // Expected resume time
    if (localApproval?.requestDetails?.expectedResumeAt) {
      deadlines.push(dayjs(localApproval.requestDetails.expectedResumeAt))
    }

    // Return the earliest deadline that's in the future
    const futureDeadlines = deadlines.filter(d => d.isAfter(now))
    if (futureDeadlines.length === 0) return null

    return futureDeadlines.sort((a, b) => a.diff(b))[0]
  }

  const hasOverlappingMaintenance = () => {
    if (!localApproval?.requestDetails || !allApprovals) return false

    const details = localApproval.requestDetails
    const startAt = details.scheduledStartAt ? dayjs(details.scheduledStartAt) : null
    const endAt = details.expectedResumeAt ? dayjs(details.expectedResumeAt) : null

    if (!startAt || !endAt) return false

    // Check for overlapping maintenance with approved/pending status (excluding current approval)
    return allApprovals.some(a => {
      if (a.approvalId === localApproval.approvalId) return false
      if (a.status !== 'approved' && a.status !== 'pending') return false
      if (a.requestType !== 'maintenance_mode') return false

      const aStart = a.requestDetails?.scheduledStartAt ? dayjs(a.requestDetails.scheduledStartAt) : null
      const aEnd = a.requestDetails?.expectedResumeAt ? dayjs(a.requestDetails.expectedResumeAt) : null

      if (!aStart || !aEnd) return false

      // Check for overlap
      return startAt.isBefore(aEnd) && endAt.isAfter(aStart)
    })
  }

  // Update local approval when prop changes
  useEffect(() => {
    setLocalApproval(approval)
  }, [approval])

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const list = await getAdminList()
        setAdmins(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Failed to fetch admins', err)
      }
    }
    fetchAdmins()
  }, [])

  const handleApproveClick = () => {
    setActionApproved(true)
    setComment('')
    setActionModalOpen(true)
  }

  const handleDenyClick = () => {
    setActionApproved(false)
    setComment('')
    setActionModalOpen(true)
  }

  const handleActionSubmit = async () => {
    if (!approval?.approvalId || !onApprove) return
    
    // Require comment when rejecting
    if (!actionApproved && !comment.trim()) {
      return
    }
    
    setSubmitting(true)
    try {
      await onApprove(approval.approvalId, actionApproved, comment)
      setActionModalOpen(false)
      // Update local approval to immediately reflect the vote
      setLocalApproval(prev => ({
        ...prev,
        approvals: [
          ...(prev.approvals || []),
          {
            adminId: currentUser,
            approved: actionApproved,
            comment,
            timestamp: new Date().toISOString()
          }
        ]
      }))
      onRefresh?.()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelApproved = async () => {
    if (!approval?.approvalId || !isApprovedUpcoming || !onCancelApproved) return
    setSubmitting(true)
    try {
      await onCancelApproved(approval.approvalId)
      onRefresh?.()
    } finally {
      setSubmitting(false)
    }
  }

  const handleUndoVote = async () => {
    if (!localApproval?.approvalId || !onUndoVote) {
      return
    }
    
    if (hasOverlappingMaintenance()) {
      message.error('Cannot undo: overlapping maintenance exists')
      return
    }
    
    const deadline = getUndoDeadline()
    if (!deadline) {
      message.error('Undo no longer available')
      return
    }
    
    setSubmitting(true)
    try {
      await onUndoVote(localApproval.approvalId)
      message.success('Vote undone successfully')
      onRefresh?.()
    } catch (err) {
      console.error('Failed to undo vote:', err)
      message.error(err?.message || 'Failed to undo vote')
    } finally {
      setSubmitting(false)
    }
  }

  const isExecuted = !!localApproval?.executedAt

  const isFinalVote = (() => {
    if (!isPending || !localApproval) return false
    const currentApprovedCount = (localApproval.approvals || []).filter((a) => a.approved === true).length
    const required = localApproval.requiredApprovals || 2
    return currentApprovedCount === required - 1
  })()

  const canUndoVote = () => {
    if (isExecuted) return false
    const deadline = getUndoDeadline()
    if (deadline === null) return false
    if (hasOverlappingMaintenance()) return false
    return true
  }

  return {
    localApproval,
    admins,
    actionModalOpen,
    setActionModalOpen,
    actionApproved,
    comment,
    setComment,
    submitting,
    isPending,
    hasVoted,
    myVote,
    canVote,
    isApprovedUpcoming,
    isExecuted,
    isFinalVote,
    canUndoVote,
    handleApproveClick,
    handleDenyClick,
    handleActionSubmit,
    handleCancelApproved,
    handleUndoVote,
    getUndoDeadline,
  }
}
