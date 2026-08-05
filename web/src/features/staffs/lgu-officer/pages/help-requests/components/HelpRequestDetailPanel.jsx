import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Typography, Modal, Empty, message, theme, Grid, App } from 'antd'
import { useAuthSession } from '@/features/authentication'
import BookmarkService from '@/features/staffs/lgu-officer/services/bookmarkService'
import {
  getHelpRequestById,
  claimHelpRequest,
  releaseHelpRequest,
  updateHelpRequestStatus,
  updateHelpRequestPriority,
  addHelpRequestMessage,
  addHelpRequestInternalNote
} from '@/features/staffs/lgu-officer/services/helpRequestService'
import { useStepUp } from '@/shared/hooks/useStepUp'
import AuditHistoryModal from '@/shared/components/AuditHistoryModal'
import HelpRequestAuditDetailPanel from './HelpRequestAuditDetailPanel'
import HelpRequestDetailHeader from './HelpRequestDetailHeader'
import HelpRequestInfoCard from './HelpRequestInfoCard'
import HelpRequestConversation from './HelpRequestConversation'
import HelpRequestInternalNotes from './HelpRequestInternalNotes'
import { useAudit } from '@/shared/hooks/useAudit'
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes'

const { Text, Paragraph } = Typography
const { useBreakpoint } = Grid

const STATUS_CONFIG = {
  open: { color: 'blue', label: 'Open' },
  in_progress: { color: 'gold', label: 'In Progress' },
  needs_response: { color: 'volcano', label: 'Needs Response' },
  waiting_for_business_owner: { color: 'cyan', label: 'Waiting for Owner' },
  closed: { color: 'green', label: 'Closed' },
  invalid: { color: 'default', label: 'Invalid' },
}

export default function HelpRequestDetailPanel({ request, onRefresh, onReviewComplete, onBookmarkToggle }) {
  const { token } = theme.useToken()
  const { modal } = App.useApp()
  const { currentUser } = useAuthSession()
  const { runWithStepUp, stepUpModal } = useStepUp()
  const screens = useBreakpoint()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingPriority, setUpdatingPriority] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [replyConfirmOpen, setReplyConfirmOpen] = useState(false)
  const [noteConfirmOpen, setNoteConfirmOpen] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkId, setBookmarkId] = useState(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  const { auditLogs, auditLoading } = useAudit('help-request', request?.requestId)

  const bookmarkService = useMemo(() => new BookmarkService(), [])

  const fetchDetail = useCallback(async () => {
    if (!request?.requestId) return
    setLoading(true)
    try {
      const res = await getHelpRequestById(request.requestId)
      setDetail(res?.data || null)

      // Check if bookmarked
      try {
        const bookmarkCheck = await bookmarkService.checkBookmark('help_request', request.requestId)
        setIsBookmarked(bookmarkCheck.isBookmarked)
        setBookmarkId(bookmarkCheck.bookmark?._id || null)
      } catch (bookmarkError) {
        console.error('Failed to check bookmark status:', bookmarkError)
        setIsBookmarked(false)
        setBookmarkId(null)
      }
    } catch {
      message.error('Failed to load request details')
    } finally {
      setLoading(false)
    }
  }, [request?.requestId, bookmarkService])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const formatDateTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleBookmarkToggle = async () => {
    if (!request?.requestId) return

    try {
      if (isBookmarked && bookmarkId) {
        await bookmarkService.removeBookmark(bookmarkId)
        setIsBookmarked(false)
        setBookmarkId(null)
        message.success('Bookmark removed')
      } else {
        const bookmark = await bookmarkService.addBookmark('help_request', request.requestId)
        setIsBookmarked(true)
        setBookmarkId(bookmark._id)
        message.success('Help request bookmarked')
      }
      onBookmarkToggle?.()
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
      // If it's a 409 (already bookmarked), re-check the bookmark status
      if (error?.message?.includes('already bookmarked') || error?.status === 409) {
        const bookmarkCheck = await bookmarkService.checkBookmark('help_request', request.requestId)
        setIsBookmarked(bookmarkCheck.isBookmarked)
        setBookmarkId(bookmarkCheck.bookmark?._id || null)
        message.info('Already bookmarked')
        onBookmarkToggle?.()
      } else {
        message.error('Failed to update bookmark')
      }
    }
  }

  // Calculate status lock status
  const getStatusLockInfo = () => {
    if (!detail) return null
    // Only show status lock for terminal statuses (closed, invalid)
    const isTerminalStatus = ['closed', 'invalid'].includes(detail.status)
    if (!isTerminalStatus) return null

    // Use statusChangedAt if available, otherwise fallback to createdAt for legacy data
    const statusChangedAt = detail.statusChangedAt || detail.createdAt
    if (!statusChangedAt) return null

    const now = new Date()
    const changedAt = new Date(statusChangedAt)
    const hoursSinceChange = (now - changedAt) / (1000 * 60 * 60)

    if (hoursSinceChange >= 24) {
      return {
        locked: true,
        message: `Status permanent since ${formatDateTime(statusChangedAt)}`,
      }
    }

    const lockDate = new Date(changedAt.getTime() + 24 * 60 * 60 * 1000)
    return {
      locked: false,
      message: `Status can be changed until ${formatDateTime(lockDate)}`,
    }
  }

  const statusLockInfo = getStatusLockInfo()

  const isClaimed = detail?.claimedBy
  const claimedById = detail?.claimedBy && typeof detail.claimedBy === 'object'
    ? detail.claimedBy._id || detail.claimedBy.id
    : detail?.claimedBy
  const isClaimedByMe = claimedById && String(claimedById) === String(currentUser?.id || currentUser?._id)

  const handleClaim = async () => {
    if (isClaimed && !isClaimedByMe) {
      modal.confirm({
        title: 'Override Claim',
        content: `This help request is already claimed by ${detail.claimedByName}. Are you sure you want to override their claim?`,
        okText: 'Override',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: async () => {
          setClaiming(true)
          try {
            await runWithStepUp(async (stepUpToken) => {
              await claimHelpRequest(request.requestId, { headers: { 'X-Step-Up-Token': stepUpToken } })
            })
            message.success('Request claimed')
            fetchDetail()
            onRefresh?.()
            onReviewComplete?.()
          } catch (err) {
            if (err?.message !== 'Step-up cancelled') {
              message.error(err?.error?.message || 'Failed to claim')
            }
          } finally {
            setClaiming(false)
          }
        },
      })
    } else {
      modal.confirm({
        title: 'Claim Request',
        content: `Are you sure you want to claim this help request? (${detail.requestId})`,
        okText: 'Claim',
        cancelText: 'Cancel',
        onOk: async () => {
          setClaiming(true)
          try {
            await runWithStepUp(async (stepUpToken) => {
              await claimHelpRequest(request.requestId, { headers: { 'X-Step-Up-Token': stepUpToken } })
            })
            message.success('Request claimed')
            fetchDetail()
            onRefresh?.()
            onReviewComplete?.()
          } catch (err) {
            if (err?.message !== 'Step-up cancelled') {
              message.error(err?.error?.message || 'Failed to claim')
            }
          } finally {
            setClaiming(false)
          }
        },
      })
    }
  }

  const handleRelease = async () => {
        modal.confirm({
      title: 'Release Request',
      content: `Are you sure you want to release this help request? (${detail.requestId})`,
      okText: 'Release',
      cancelText: 'Cancel',
      onOk: async () => {
        setClaiming(true)
        try {
          await runWithStepUp(async (stepUpToken) => {
            await releaseHelpRequest(request.requestId, { headers: { 'X-Step-Up-Token': stepUpToken } })
          })
          message.success('Request released')
          fetchDetail()
          onRefresh?.()
          onReviewComplete?.()
        } catch (err) {
          if (err?.message !== 'Step-up cancelled') {
            message.error(err?.error?.message || 'Failed to release')
          }
        } finally {
          setClaiming(false)
        }
      },
    })
  }

  const handleStatusChange = async (status) => {
    const newStatusLabel = STATUS_CONFIG[status]?.label || status

    const getStatusMessage = (newStatus) => {
      switch (newStatus) {
        case 'closed':
          return `This will close the request and send a notification to the business owner. The status can be reopened within 24 hours.`
        case 'invalid':
          return `This will mark the request as invalid and send a notification to the business owner. The status can be changed within 24 hours.`
        case 'in_progress':
          return `This will indicate that the request is being actively worked on.`
        case 'needs_response':
          return `This will indicate that a response is needed from the business owner.`
        case 'waiting_for_business_owner':
          return `This will indicate that the request is waiting for action from the business owner.`
        case 'open':
          return `This will reopen the request and make it available for processing.`
        default:
          return `Are you sure you want to change the status to ${newStatusLabel}?`
      }
    }

        modal.confirm({
      title: 'Change Status',
      content: getStatusMessage(status),
      okText: 'Change',
      cancelText: 'Cancel',
      onOk: async () => {
        setUpdatingStatus(true)
        try {
          await updateHelpRequestStatus(request.requestId, status)
          message.success(`Status updated to ${newStatusLabel}`)
          fetchDetail()
          onRefresh?.()
        } catch (err) {
          message.error(err?.error?.message || 'Failed to update status')
        } finally {
          setUpdatingStatus(false)
        }
      },
    })
  }

  const handlePriorityChange = async (priority) => {
    const priorityLabels = { low: 'Low', normal: 'Normal', high: 'High' }
    const newPriorityLabel = priorityLabels[priority] || priority

    const getPriorityMessage = (newPriority) => {
      switch (newPriority) {
        case 'high':
          return `This will mark the request as high priority, giving it faster response time and visibility.`
        case 'normal':
          return `This will set the request to normal priority with standard response time.`
        case 'low':
          return `This will mark the request as low priority, which may delay response time.`
        default:
          return `Are you sure you want to change the priority to ${newPriorityLabel}?`
      }
    }

        modal.confirm({
      title: 'Change Priority',
      content: getPriorityMessage(priority),
      okText: 'Change',
      cancelText: 'Cancel',
      onOk: async () => {
        setUpdatingPriority(true)
        try {
          await updateHelpRequestPriority(request.requestId, priority)
          message.success(`Priority updated to ${newPriorityLabel}`)
          fetchDetail()
          onRefresh?.()
        } catch (err) {
          message.error(err?.error?.message || 'Failed to update priority')
        } finally {
          setUpdatingPriority(false)
        }
      },
    })
  }

  const handleSendReply = async () => {
    if (!replyContent.trim()) return message.warning('Please enter a message')
    setReplyConfirmOpen(true)
  }

  const confirmSendReply = async () => {
    setReplyConfirmOpen(false)
    setSending(true)
    try {
      await runWithStepUp(async (stepUpToken) => {
        await addHelpRequestMessage(request.requestId, {
          content: replyContent.trim(),
          attachments: [],
        }, { headers: { 'X-Step-Up-Token': stepUpToken } })
      })
      message.success('Reply sent & email notification delivered')
      setReplyContent('')
      fetchDetail()
      onRefresh?.()
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error(err?.error?.message || 'Failed to send reply')
      }
    } finally {
      setSending(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return message.warning('Please enter a note')
    setNoteConfirmOpen(true)
  }

  const confirmAddNote = async () => {
    setNoteConfirmOpen(false)
    setAddingNote(true)
    try {
      await runWithStepUp(async (stepUpToken) => {
        await addHelpRequestInternalNote(request.requestId, {
          content: noteContent.trim(),
        }, { headers: { 'X-Step-Up-Token': stepUpToken } })
      })
      message.success('Internal note added')
      setNoteContent('')
      fetchDetail()
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        message.error(err?.error?.message || 'Failed to add note')
      }
    } finally {
      setAddingNote(false)
    }
  }

  if (loading && !detail) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text type="secondary">Loading...</Text>
      </div>
    )
  }

  if (!detail) {
    return <Empty description="Request not found" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <HelpRequestDetailHeader
        detail={detail}
        isClaimed={isClaimed}
        isClaimedByMe={isClaimedByMe}
        claiming={claiming}
        statusLockInfo={statusLockInfo}
        updatingStatus={updatingStatus}
        updatingPriority={updatingPriority}
        onClaim={handleClaim}
        onRelease={handleRelease}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onHistoryClick={() => setHistoryModalOpen(true)}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <HelpRequestInfoCard
          detail={detail}
          statusLockInfo={statusLockInfo}
          formatDateTime={formatDateTime}
        />

        <div style={{ display: 'flex', flexDirection: screens.xxl ? 'row' : 'column', gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ flex: screens.xxl ? 2 : 1, display: 'flex', flexDirection: 'column', minHeight: screens.xxl ? 0 : 600 }}>
            <HelpRequestConversation
              detail={detail}
              replyContent={replyContent}
              isClaimedByMe={isClaimedByMe}
              onReplyChange={(value) => setReplyContent(value)}
              onSendReply={handleSendReply}
              formatDateTime={formatDateTime}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
            />
          </div>
          <div style={{ flex: screens.xxl ? 1 : 1, display: 'flex', flexDirection: 'column', minHeight: screens.xxl ? 0 : 600 }}>
            <HelpRequestInternalNotes
              detail={detail}
              noteContent={noteContent}
              addingNote={addingNote}
              isClaimedByMe={isClaimedByMe}
              onNoteChange={(value) => setNoteContent(value)}
              onAddNote={handleAddNote}
              formatDateTime={formatDateTime}
            />
          </div>
        </div>
      </div>

      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        DetailPanelComponent={HelpRequestAuditDetailPanel}
        eventDescriptions={AUDIT_EVENT_INFO.filter(e => ['claim', 'release', 'status_update', 'priority_update'].includes(e.event))}
      />

      {stepUpModal}

      <Modal
        title="Send Reply"
        open={replyConfirmOpen}
        onOk={confirmSendReply}
        onCancel={() => setReplyConfirmOpen(false)}
        okText="Send"
        cancelText="Cancel"
        okButtonProps={{ loading: sending }}
      >
        <p>Please ensure your reply is correct before sending. This message will be sent to the requester.</p>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Message Preview:</Text>
          <div style={{
            marginTop: 8,
            padding: 12,
            background: token.colorBgLayout,
            borderRadius: token.borderRadius,
            whiteSpace: 'pre-wrap',
            maxHeight: 200,
            overflowY: 'auto'
          }}>
            {replyContent}
          </div>
        </div>
      </Modal>

      <Modal
        title="Add Internal Note"
        open={noteConfirmOpen}
        onOk={confirmAddNote}
        onCancel={() => setNoteConfirmOpen(false)}
        okText="Add Note"
        cancelText="Cancel"
        okButtonProps={{ loading: addingNote }}
      >
        <p>Please ensure your note is correct before adding. This note is visible only to officers.</p>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Note Preview:</Text>
          <div style={{
            marginTop: 8,
            padding: 12,
            background: token.colorBgLayout,
            borderRadius: token.borderRadius,
            whiteSpace: 'pre-wrap',
            maxHeight: 200,
            overflowY: 'auto'
          }}>
            {noteContent}
          </div>
        </div>
      </Modal>
    </div>
  )
}
